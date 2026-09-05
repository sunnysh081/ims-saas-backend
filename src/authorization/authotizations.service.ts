import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { JwtService } from '@nestjs/jwt';

import { and, eq, inArray, isNull, or } from 'drizzle-orm';

import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

import { DatabaseService } from '../database/database.service';

import {
  authSessions,
  institutes,
  instituteUsers,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '../database/schema';

import { LoginDto } from './dto/login.dto';

import { parseDurationSeconds } from './ttl';

import {
  AuthenticatedUser,
  JwtPayload,
  SessionMetadata,
  TokenResponse,
} from './types/authorization.type';

const DEFAULT_REFRESH_TTL_MS = 14 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async hasPermissions(
    userId: string,
    instituteId: string,
    requiredPermissions: string[],
  ): Promise<boolean> {
    if (!requiredPermissions.length) {
      return true;
    }

    if (await this.isInstituteAdmin(userId, instituteId)) {
      return true;
    }

    const rows = await this.database.db
      .selectDistinct({
        permissionSlug: permissions.slug,
      })
      .from(instituteUsers)
      .innerJoin(userRoles, eq(userRoles.userId, instituteUsers.userId))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(
        and(
          eq(instituteUsers.userId, userId),

          eq(instituteUsers.instituteId, instituteId),

          or(
            eq(roles.instituteId, instituteId),
            and(isNull(roles.instituteId), eq(roles.scope, 'institute')),
          ),

          eq(roles.isActive, true),

          inArray(permissions.slug, requiredPermissions),
        ),
      );

    const granted = new Set(rows.map((row) => row.permissionSlug));

    return requiredPermissions.every((permission) => granted.has(permission));
  }

  async login(
    dto: LoginDto,
    metadata?: SessionMetadata,
  ): Promise<TokenResponse> {
    const email = dto.email.trim().toLowerCase();

    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    /**
     * Don't reveal whether the
     * email exists.
     */
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const validPassword = await argon2.verify(user.passwordHash, dto.password);

    if (!validPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createSession(user.id, user.email, metadata);
  }

  async refresh(
    refreshToken: string,
    metadata?: SessionMetadata,
  ): Promise<TokenResponse> {
    const parsed = this.parseRefreshToken(refreshToken);

    const session = await this.findUsableSession(parsed.sessionId);

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const matches = await argon2.verify(
      session.refreshTokenHash,
      parsed.secret,
    );

    if (!matches) {
      await this.revokeSession(session.id);

      throw new UnauthorizedException('Invalid refresh token');
    }

    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user || !user.isActive || user.deletedAt) {
      await this.revokeSession(session.id);

      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.rotateSession(session.id, user.id, user.email, metadata);
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.database.db
      .update(authSessions)
      .set({
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(authSessions.id, sessionId), isNull(authSessions.revokedAt)),
      );
  }

  async getProfile(userId: string, instituteId?: string | null) {
    const [user] = await this.database.db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        mobile: users.mobile,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    const assignedRoles = await this.database.db
      .select({
        id: roles.id,
        name: roles.name,
        slug: roles.slug,
        scope: roles.scope,
        instituteId: roles.instituteId,
      })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(userRoles.userId, userId), eq(roles.isActive, true)));

    const memberships = await this.listMemberships(userId);
    const activeInstituteId =
      instituteId && memberships.some((item) => item.id === instituteId)
        ? instituteId
        : (memberships[0]?.id ?? null);

    const isSuperAdmin = assignedRoles.some(
      (role) =>
        role.slug === 'super_admin' &&
        role.scope === 'platform' &&
        role.instituteId === null,
    );

    const isInstituteAdmin = activeInstituteId
      ? await this.isInstituteAdmin(userId, activeInstituteId)
      : false;

    return {
      ...user,
      roles: assignedRoles,
      institutes: memberships,
      instituteId: activeInstituteId,
      institute:
        memberships.find((item) => item.id === activeInstituteId) ?? null,
      permissions: activeInstituteId
        ? await this.listPermissionSlugs(userId, activeInstituteId)
        : [],
      isSuperAdmin,
      isInstituteAdmin,
    };
  }

  async isPlatformSuperAdmin(userId: string): Promise<boolean> {
    const [role] = await this.database.db
      .select({
        id: roles.id,
      })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(roles.slug, 'super_admin'),
          eq(roles.scope, 'platform'),
          isNull(roles.instituteId),
          eq(roles.isActive, true),
        ),
      )
      .limit(1);

    return Boolean(role);
  }

  async validateAccessToken(
    payload: JwtPayload,
    requestedInstituteId?: string,
  ): Promise<AuthenticatedUser> {
    if (payload.type !== 'access' || !payload.sub || !payload.sessionId) {
      throw new UnauthorizedException();
    }

    const session = await this.findUsableSession(payload.sessionId);

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException();
    }

    const [user] = await this.database.db
      .select({
        id: users.id,
        email: users.email,
        isActive: users.isActive,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException();
    }

    const isSuperAdmin = await this.isPlatformSuperAdmin(user.id);
    const memberships = await this.listMemberships(user.id);
    let instituteId: string | null = null;

    if (requestedInstituteId) {
      const allowed =
        isSuperAdmin ||
        memberships.some((item) => item.id === requestedInstituteId);

      if (!allowed) {
        throw new ForbiddenException('Institute context is not allowed');
      }

      instituteId = requestedInstituteId;
    } else if (!isSuperAdmin && memberships.length === 1) {
      instituteId = memberships[0]?.id ?? null;
    }

    return {
      id: user.id,
      email: user.email,
      sessionId: session.id,
      instituteId,
      isSuperAdmin,
      isInstituteAdmin: instituteId
        ? await this.isInstituteAdmin(user.id, instituteId)
        : false,
    };
  }

  async isInstituteAdmin(userId: string, instituteId: string): Promise<boolean> {
    const [role] = await this.database.db
      .select({
        id: roles.id,
      })
      .from(instituteUsers)
      .innerJoin(userRoles, eq(userRoles.userId, instituteUsers.userId))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(
        and(
          eq(instituteUsers.userId, userId),
          eq(instituteUsers.instituteId, instituteId),
          eq(roles.slug, 'institute_admin'),
          eq(roles.scope, 'institute'),
          eq(roles.isActive, true),
          or(isNull(roles.instituteId), eq(roles.instituteId, instituteId)),
        ),
      )
      .limit(1);

    return Boolean(role);
  }

  private async listMemberships(userId: string) {
    return this.database.db
      .select({
        id: institutes.id,
        name: institutes.name,
        slug: institutes.slug,
      })
      .from(instituteUsers)
      .innerJoin(institutes, eq(institutes.id, instituteUsers.instituteId))
      .where(
        and(
          eq(instituteUsers.userId, userId),
          isNull(institutes.deletedAt),
          eq(institutes.isActive, true),
        ),
      );
  }

  private async listPermissionSlugs(userId: string, instituteId: string) {
    const rows = await this.database.db
      .selectDistinct({
        slug: permissions.slug,
      })
      .from(instituteUsers)
      .innerJoin(userRoles, eq(userRoles.userId, instituteUsers.userId))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(
        and(
          eq(instituteUsers.userId, userId),
          eq(instituteUsers.instituteId, instituteId),
          or(
            eq(roles.instituteId, instituteId),
            and(isNull(roles.instituteId), eq(roles.scope, 'institute')),
          ),
          eq(roles.isActive, true),
        ),
      );

    return rows.map((row) => row.slug);
  }

  private async createSession(
    userId: string,
    email: string,
    metadata?: SessionMetadata,
  ): Promise<TokenResponse> {
    const secret = randomBytes(64).toString('base64url');

    const refreshTokenHash = await argon2.hash(secret);

    const now = new Date();

    const [session] = await this.database.db
      .insert(authSessions)
      .values({
        userId,

        refreshTokenHash,

        expiresAt: this.refreshExpiresAt(now),

        ipAddress: metadata?.ipAddress,

        userAgent: metadata?.userAgent,
      })
      .returning({
        id: authSessions.id,
      });

    if (!session) {
      throw new UnauthorizedException('Unable to create session');
    }

    await this.database.db
      .update(users)
      .set({
        lastLoginAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    return this.issueTokens(session.id, userId, email, secret);
  }

  private async rotateSession(
    sessionId: string,
    userId: string,
    email: string,
    metadata?: SessionMetadata,
  ): Promise<TokenResponse> {
    const secret = randomBytes(64).toString('base64url');

    const refreshTokenHash = await argon2.hash(secret);

    const now = new Date();

    await this.database.db
      .update(authSessions)
      .set({
        refreshTokenHash,
        expiresAt: this.refreshExpiresAt(now),
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        updatedAt: now,
      })
      .where(eq(authSessions.id, sessionId));

    return this.issueTokens(sessionId, userId, email, secret);
  }

  private async issueTokens(
    sessionId: string,
    userId: string,
    email: string,
    secret: string,
  ): Promise<TokenResponse> {
    const expiresIn = this.accessTokenTtlSeconds();

    const accessToken = await this.jwtService.signAsync(
      {
        sub: userId,
        type: 'access',
        sessionId,
      } satisfies JwtPayload,
      {
        expiresIn,
      },
    );

    return {
      accessToken,
      refreshToken: `${sessionId}.${secret}`,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        id: userId,
        email,
      },
    };
  }

  private async findUsableSession(sessionId: string) {
    const [session] = await this.database.db
      .select()
      .from(authSessions)
      .where(
        and(eq(authSessions.id, sessionId), isNull(authSessions.revokedAt)),
      )
      .limit(1);

    if (!session) {
      return null;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    return session;
  }

  private parseRefreshToken(refreshToken: string) {
    const separator = refreshToken.indexOf('.');

    if (separator <= 0) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const sessionId = refreshToken.slice(0, separator);

    const secret = refreshToken.slice(separator + 1);

    if (!sessionId || !secret) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      sessionId,
      secret,
    };
  }

  private accessTokenTtlSeconds() {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');

    return parseDurationSeconds(expiresIn);
  }

  private refreshExpiresAt(from: Date) {
    const configured = this.configService.get(
      'REFRESH_TOKEN_EXPIRES_MS',
      DEFAULT_REFRESH_TTL_MS,
    );

    const duration = Number(configured);

    return new Date(
      from.getTime() +
        (Number.isFinite(duration) ? duration : DEFAULT_REFRESH_TTL_MS),
    );
  }
}
