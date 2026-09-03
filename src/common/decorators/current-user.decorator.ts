import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../authorization/types/authorization.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();

    const user = request.user as AuthenticatedUser | undefined;

    if (!user?.id) {
      throw new UnauthorizedException();
    }

    return user;
  },
);
