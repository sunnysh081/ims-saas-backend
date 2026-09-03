import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const CurrentInstituteId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    const instituteId = request.user?.instituteId;

    if (!instituteId) {
      throw new UnauthorizedException('Institute context is missing');
    }

    return instituteId;
  },
);
