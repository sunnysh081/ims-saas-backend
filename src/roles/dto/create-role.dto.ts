import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

import {
  ROLE_SLUG_MESSAGE,
  ROLE_SLUG_PATTERN,
} from '../../common/validation/patterns';

export class CreateRoleDto {
  @IsString()
  @Length(2, 100)
  name!: string;

  @IsString()
  @Length(2, 100)
  @Matches(ROLE_SLUG_PATTERN, { message: ROLE_SLUG_MESSAGE })
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
