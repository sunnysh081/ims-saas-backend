import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';

import type { Request } from 'express';

import { Public } from '../common/auth/public.decorator';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { AuthorizationService } from './authotizations.service';

import { LoginDto } from './dto/login.dto';

import { RefreshTokenDto } from './dto/refresh.dto';

import type { AuthenticatedUser } from './types/authorization.type';

@Controller('auth')
export class AuthorizationController {
  constructor(private readonly authorizationService: AuthorizationService) {}

  @Get('me')
  me(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.authorizationService.getProfile(user.id, user.instituteId);
  }

  @Public()
  @Post('token')
  @HttpCode(HttpStatus.OK)
  token(
    @Body()
    dto: LoginDto,

    @Req()
    request: Request,
  ) {
    return this.authorizationService.login(dto, this.sessionMetadata(request));
  }

  @Public()
  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body()
    dto: RefreshTokenDto,

    @Req()
    request: Request,
  ) {
    return this.authorizationService.refresh(
      dto.refreshToken,
      this.sessionMetadata(request),
    );
  }

  @Post('token/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @CurrentUser()
    user: AuthenticatedUser,
  ): Promise<void> {
    await this.authorizationService.revokeSession(user.sessionId);
  }

  private sessionMetadata(request: Request) {
    const userAgentHeader = request.headers['user-agent'];

    return {
      ipAddress: request.ip,

      userAgent: Array.isArray(userAgentHeader)
        ? userAgentHeader[0]
        : userAgentHeader,
    };
  }
}
