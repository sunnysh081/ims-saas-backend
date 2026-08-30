import {
    IsArray,
    IsOptional,
    IsString,
    IsUUID,
    Length,
    MaxLength,
} from 'class-validator';

export class CreateRoleDto {
    @IsString()
    @Length(2, 100)
    name!: string;

    @IsString()
    @Length(2, 100)
    slug!: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @IsArray()
    @IsUUID('4', {
        each: true,
    })
    permissionIds!: string[];
}