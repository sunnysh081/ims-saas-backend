import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { Request } from 'express';

import { AuthorizationService } from '../../authorization/authotizations.service';
import type { AuthenticatedUser } from '../../authorization/types/authorization.type';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();

    const user = request.user;

    if (!user?.id) {
      throw new UnauthorizedException();
    }

    const isSuperAdmin = await this.authorizationService.isPlatformSuperAdmin(
      user.id,
    );

    if (!isSuperAdmin) {
      throw new ForbiddenException('Super admin access is required');
    }

    return true;
  }
}
