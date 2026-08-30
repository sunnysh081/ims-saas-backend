import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';

import {
    RequirePermissions,
} from '../common/auth/permissions.decorator';

import {
    RolesService,
} from './roles.service';

import {
    CreateRoleDto,
} from './dto/create-role.dto';
import { CurrentInstituteId } from 'src/common/decorators/current-institute.decorator';
import { PermissionGuard } from 'src/common/guards/permissions.guards';

@Controller('roles')
@UseGuards(
    PermissionGuard,
)
export class RolesController {
    constructor(
        private readonly rolesService:
            RolesService,
    ) { }

    @Get()
    @RequirePermissions(
        'roles.read',
    )
    findAll(
        @CurrentInstituteId()
        instituteId: string,
    ) {
        return this.rolesService.findAll(
            instituteId,
        );
    }

    @Post()
    @RequirePermissions(
        'roles.create',
    )
    create(
        @CurrentInstituteId()
        instituteId: string,

        @Body()
        dto: CreateRoleDto,
    ) {
        return this.rolesService.create(
            instituteId,
            dto,
        );
    }

    @Get(':id')
    @RequirePermissions(
        'roles.read',
    )
    findOne(
        @CurrentInstituteId()
        instituteId: string,

        @Param('id')
        roleId: string,
    ) {
        return this.rolesService.findOne(
            instituteId,
            roleId,
        );
    }
}