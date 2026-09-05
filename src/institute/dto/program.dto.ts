import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { EmptyToUndefined } from '../../common/validation/empty-to-undefined';
import {
  ACCREDITATION_MESSAGE,
  ACCREDITATION_PATTERN,
  DESCRIPTION_MESSAGE,
  DESCRIPTION_PATTERN,
  PROGRAM_CODE_MESSAGE,
  PROGRAM_CODE_PATTERN,
  PROGRAM_NAME_MESSAGE,
  PROGRAM_NAME_PATTERN,
} from '../../common/validation/patterns';

export const PROGRAM_TYPES = [
  'degree',
  'diploma',
  'certificate',
  'integrated',
] as const;

export const PROGRAM_UNIVERSITIES = [
  'autonomous',
  'affiliated',
  'deemed',
] as const;

export class CreateProgramDto {
  @EmptyToUndefined()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Matches(PROGRAM_NAME_PATTERN, { message: PROGRAM_NAME_MESSAGE })
  name!: string;

  @EmptyToUndefined()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(PROGRAM_CODE_PATTERN, { message: PROGRAM_CODE_MESSAGE })
  code!: string;

  @IsIn(PROGRAM_TYPES)
  type!: (typeof PROGRAM_TYPES)[number];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  totalSemesters!: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }

    return Number(value);
  })
  @IsInt()
  @Min(1)
  @Max(120)
  durationMonths?: number;

  @IsIn(PROGRAM_UNIVERSITIES)
  university!: (typeof PROGRAM_UNIVERSITIES)[number];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  sanctionedIntake!: number;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Matches(ACCREDITATION_PATTERN, { message: ACCREDITATION_MESSAGE })
  accreditation?: string;

  @IsUUID('4')
  departmentHeadUserId!: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Matches(DESCRIPTION_PATTERN, { message: DESCRIPTION_MESSAGE })
  description?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 'on')
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProgramDto {
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Matches(PROGRAM_NAME_PATTERN, { message: PROGRAM_NAME_MESSAGE })
  name?: string;

  @EmptyToUndefined()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(PROGRAM_CODE_PATTERN, { message: PROGRAM_CODE_MESSAGE })
  code?: string;

  @IsOptional()
  @IsIn(PROGRAM_TYPES)
  type?: (typeof PROGRAM_TYPES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  totalSemesters?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }

    return Number(value);
  })
  @IsInt()
  @Min(1)
  @Max(120)
  durationMonths?: number;

  @IsOptional()
  @IsIn(PROGRAM_UNIVERSITIES)
  university?: (typeof PROGRAM_UNIVERSITIES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  sanctionedIntake?: number;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Matches(ACCREDITATION_PATTERN, { message: ACCREDITATION_MESSAGE })
  accreditation?: string;

  @IsOptional()
  @IsUUID('4')
  departmentHeadUserId?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Matches(DESCRIPTION_PATTERN, { message: DESCRIPTION_MESSAGE })
  description?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 'on')
  @IsBoolean()
  isActive?: boolean;
}
