import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../authorization/types/authorization.type';

@Injectable()
export class InstituteGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    const user = request.user;

    if (!user?.id) {
      throw new UnauthorizedException();
    }

    if (user.isSuperAdmin) {
      throw new ForbiddenException(
        'Institute workspace is not available to platform super admins',
      );
    }

    if (!user.instituteId) {
      throw new ForbiddenException('Institute context is required');
    }

    return true;
  }
}
