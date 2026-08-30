import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

import {
    and,
    eq,
    inArray,
} from 'drizzle-orm';

import {
    DatabaseService,
} from '../database/database.service';

import {
    authSessions,
    instituteUsers,
    permissions,
    rolePermissions,
    roles,
    userRoles,
    users,
} from '../database/schema';

import { JwtService } from '@nestjs/jwt';

import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/authorization.type';
@Injectable()
export class AuthorizationService {
    constructor(
        private readonly database: DatabaseService,
        private readonly jwtService: JwtService,
    ) { }

    async hasPermissions(
        userId: string,
        instituteId: string,
        requiredPermissions: string[],
    ): Promise<boolean> {
        if (
            !requiredPermissions.length
        ) {
            return true;
        }

        const rows =
            await this.database.db
                .selectDistinct({
                    permissionSlug:
                        permissions.slug,
                })
                .from(instituteUsers)
                .innerJoin(
                    userRoles,
                    eq(
                        userRoles.userId,
                        instituteUsers.userId,
                    ),
                )
                .innerJoin(
                    roles,
                    eq(
                        roles.id,
                        userRoles.roleId,
                    ),
                )
                .innerJoin(
                    rolePermissions,
                    eq(
                        rolePermissions.roleId,
                        roles.id,
                    ),
                )
                .innerJoin(
                    permissions,
                    eq(
                        permissions.id,
                        rolePermissions.permissionId,
                    ),
                )
                .where(
                    and(
                        eq(
                            instituteUsers.userId,
                            userId,
                        ),

                        eq(
                            instituteUsers.instituteId,
                            instituteId,
                        ),

                        eq(
                            roles.instituteId,
                            instituteId,
                        ),

                        eq(
                            roles.isActive,
                            true,
                        ),

                        inArray(
                            permissions.slug,
                            requiredPermissions,
                        ),
                    ),
                );

        const granted = new Set(
            rows.map(
                (row) => row.permissionSlug,
            ),
        );

        return requiredPermissions.every(
            (permission) =>
                granted.has(permission),
        );
    }
    async login(
        dto: LoginDto,
        metadata?: {
            ipAddress?: string;
            userAgent?: string;
        },
    ) {
        const email =
            dto.email
                .trim()
                .toLowerCase();

        const [user] =
            await this.database.db
                .select()
                .from(users)
                .where(
                    eq(users.email, email),
                )
                .limit(1);

        /**
         * Don't reveal whether the
         * email exists.
         */
        if (!user) {
            throw new UnauthorizedException(
                'Invalid email or password',
            );
        }

        if (
            !user.isActive ||
            user.deletedAt
        ) {
            throw new UnauthorizedException(
                'Invalid email or password',
            );
        }

        const validPassword =
            await argon2.verify(
                user.passwordHash,
                dto.password,
            );

        if (!validPassword) {
            throw new UnauthorizedException(
                'Invalid email or password',
            );
        }

        return this.createSession(
            user.id,
            user.email,
            metadata,
        );
    }

    private async createSession(
        userId: string,
        email: string,
        metadata?: {
            ipAddress?: string;
            userAgent?: string;
        },
    ) {
        /**
         * Session ID is independent
         * from the JWT.
         */
        const sessionId =
            randomBytes(32)
                .toString('hex');

        const refreshToken =
            randomBytes(64)
                .toString('base64url');

        const refreshTokenHash =
            await argon2.hash(
                refreshToken,
            );

        const expiresAt =
            new Date(
                Date.now() +
                30 *
                24 *
                60 *
                60 *
                1000,
            );

        await this.database.db
            .insert(authSessions)
            .values({
                userId,

                refreshTokenHash,

                expiresAt,

                ipAddress:
                    metadata?.ipAddress,

                userAgent:
                    metadata?.userAgent,
            });

        const accessToken =
            await this.jwtService.signAsync(
                {
                    sub: userId,
                    type: 'access',
                    sessionId,
                } satisfies JwtPayload,
            );

        /**
         * Store sessionId in JWT.
         *
         * NOTE:
         * authSessions.id should ideally
         * be the session ID instead of
         * generating another identifier.
         */

        return {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: 900,
            user: {
                id: userId,
                email,
            },
        };
    }
}