import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

import {
    Reflector,
} from '@nestjs/core';

import {
    REQUIRED_PERMISSIONS,
} from '../auth/permissions.decorator';

import {
    AuthorizationService,
} from '../../authorization/authotizations.service';

@Injectable()
export class PermissionGuard
    implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly authorizationService:
            AuthorizationService,
    ) { }

    async canActivate(
        context: ExecutionContext,
    ): Promise<boolean> {
        const requiredPermissions =
            this.reflector.getAllAndOverride<
                string[]
            >(
                REQUIRED_PERMISSIONS,
                [
                    context.getHandler(),
                    context.getClass(),
                ],
            );

        if (
            !requiredPermissions?.length
        ) {
            return true;
        }

        const request =
            context
                .switchToHttp()
                .getRequest();

        const user = request.user;

        if (!user?.id) {
            throw new UnauthorizedException();
        }

        const instituteId =
            user.instituteId;

        if (!instituteId) {
            throw new ForbiddenException(
                'Institute context is required',
            );
        }

        const hasPermission =
            await this.authorizationService.hasPermissions(
                user.id,
                instituteId,
                requiredPermissions,
            );

        if (!hasPermission) {
            throw new ForbiddenException(
                'Insufficient permissions',
            );
        }

        return true;
    }
}