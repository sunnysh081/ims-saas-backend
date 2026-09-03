import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { EmptyToUndefined } from '../../common/validation/empty-to-undefined';
import {
  ADDRESS_MESSAGE,
  ADDRESS_PATTERN,
  MOBILE_MESSAGE,
  MOBILE_PATTERN,
  NAME_MESSAGE,
  NAME_PATTERN,
  PLACE_MESSAGE,
  PLACE_PATTERN,
  POSTAL_MESSAGE,
  POSTAL_PATTERN,
  SLUG_MESSAGE,
  SLUG_PATTERN,
} from '../../common/validation/patterns';

export class CreateInstituteDto {
  @EmptyToUndefined()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
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
  @IsEmail()
  email?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(MOBILE_PATTERN, { message: MOBILE_MESSAGE })
  mobile?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(ADDRESS_PATTERN, { message: ADDRESS_MESSAGE })
  addressLine1?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(ADDRESS_PATTERN, { message: ADDRESS_MESSAGE })
  addressLine2?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(PLACE_PATTERN, { message: PLACE_MESSAGE })
  city?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(PLACE_PATTERN, { message: PLACE_MESSAGE })
  state?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(PLACE_PATTERN, { message: PLACE_MESSAGE })
  country?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(POSTAL_PATTERN, { message: POSTAL_MESSAGE })
  postalCode?: string;
}
