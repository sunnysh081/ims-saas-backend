import { Global, Module } from '@nestjs/common';

import { APP_GUARD } from '@nestjs/core';

import { ConfigModule, ConfigService } from '@nestjs/config';

import { JwtModule } from '@nestjs/jwt';

import { PassportModule } from '@nestjs/passport';

import { AuthorizationController } from './authorization.controller';

import { AuthorizationService } from './authotizations.service';

import { JwtAuthGuard } from './jwt-auth.guard';

import { JwtStrategy } from './jwt.strategy';

import { parseDurationSeconds } from './ttl';

@Global()
@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: parseDurationSeconds(
            configService.get<string>('JWT_EXPIRES_IN', '15m'),
          ),
        },
      }),
    }),
  ],

  controllers: [AuthorizationController],

  providers: [
    AuthorizationService,
    JwtStrategy,
    JwtAuthGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],

  exports: [AuthorizationService, JwtAuthGuard, JwtModule],
})
export class AuthorizationModule {}
