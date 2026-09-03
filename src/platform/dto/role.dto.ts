import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

import { EmptyToUndefined } from '../../common/validation/empty-to-undefined';
import {
  DESCRIPTION_MESSAGE,
  DESCRIPTION_PATTERN,
  NAME_MESSAGE,
  NAME_PATTERN,
  SLUG_MESSAGE,
  SLUG_PATTERN,
} from '../../common/validation/patterns';

export class CreatePlatformRoleDto {
  @EmptyToUndefined()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(NAME_PATTERN, { message: NAME_MESSAGE })
  name!: string;

  @EmptyToUndefined()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug!: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(DESCRIPTION_PATTERN, { message: DESCRIPTION_MESSAGE })
  description?: string;

  @IsIn(['platform', 'institute'])
  scope!: 'platform' | 'institute';

  @ValidateIf((dto: CreatePlatformRoleDto) => dto.scope === 'institute')
  @IsUUID('4')
  instituteId?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds!: string[];
}

export class UpdatePlatformRoleDto {
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(NAME_PATTERN, { message: NAME_MESSAGE })
  name?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(DESCRIPTION_PATTERN, { message: DESCRIPTION_MESSAGE })
  description?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds?: string[];

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isActive?: boolean;
}
