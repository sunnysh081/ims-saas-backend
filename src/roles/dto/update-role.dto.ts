import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

import {
  ROLE_SLUG_MESSAGE,
  ROLE_SLUG_PATTERN,
} from '../../common/validation/patterns';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  @Matches(ROLE_SLUG_PATTERN, { message: ROLE_SLUG_MESSAGE })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', {
    each: true,
  })
  permissionIds?: string[];

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isActive?: boolean;
}
