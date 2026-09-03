import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { EmptyToUndefined } from '../../common/validation/empty-to-undefined';
import {
  MOBILE_MESSAGE,
  MOBILE_PATTERN,
  NAME_MESSAGE,
  NAME_PATTERN,
  PASSWORD_MESSAGE,
  PASSWORD_PATTERN,
} from '../../common/validation/patterns';

export class CreateUserDto {
  @EmptyToUndefined()
  @IsEmail()
  email!: string;

  @IsString()
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password!: string;

  @EmptyToUndefined()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(NAME_PATTERN, { message: NAME_MESSAGE })
  firstName!: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(NAME_PATTERN, { message: NAME_MESSAGE })
  lastName?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(MOBILE_PATTERN, { message: MOBILE_MESSAGE })
  mobile?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  roleIds!: string[];
}

export class UpdateUserDto {
  @EmptyToUndefined()
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(NAME_PATTERN, { message: NAME_MESSAGE })
  firstName?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(NAME_PATTERN, { message: NAME_MESSAGE })
  lastName?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(MOBILE_PATTERN, { message: MOBILE_MESSAGE })
  mobile?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  roleIds?: string[];
}
