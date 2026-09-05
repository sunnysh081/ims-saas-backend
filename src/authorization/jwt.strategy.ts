import { Injectable } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { PassportStrategy } from '@nestjs/passport';

import type { Request } from 'express';

import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthorizationService } from './authotizations.service';

import { AuthenticatedUser, JwtPayload } from './types/authorization.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authorizationService: AuthorizationService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(request: Request, payload: JwtPayload): Promise<AuthenticatedUser> {
    const header = request.headers['x-institute-id'];
    const instituteId = Array.isArray(header) ? header[0] : header;

    return this.authorizationService.validateAccessToken(payload, instituteId);
  }
}
