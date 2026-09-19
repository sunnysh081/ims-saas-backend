import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';
import {
  DESCRIPTION_MESSAGE,
  DESCRIPTION_PATTERN,
  PROGRAM_CODE_MESSAGE,
  PROGRAM_CODE_PATTERN,
  PROGRAM_NAME_MESSAGE,
  PROGRAM_NAME_PATTERN,
} from '../../../common/validation/patterns';

const SUBJECT_TYPES = ['THEORY', 'PRACTICAL', 'THEORY_PRACTICAL'] as const;

export class SubjectOutcomeDto {
  @IsIn(['OBJECTIVE', 'OUTCOME'])
  type!: 'OBJECTIVE' | 'OUTCOME';

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  statement!: string;
}

export class CreateSubjectDto {
  @IsUUID('4')
  programId!: string;

  @EmptyToUndefined()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  @Matches(PROGRAM_NAME_PATTERN, { message: PROGRAM_NAME_MESSAGE })
  name!: string;

  @EmptyToUndefined()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MaxLength(50)
  @Matches(PROGRAM_CODE_PATTERN, { message: PROGRAM_CODE_MESSAGE })
  code?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(PROGRAM_CODE_PATTERN, { message: PROGRAM_CODE_MESSAGE })
  shortName?: string;

  @IsIn(SUBJECT_TYPES)
  type!: (typeof SUBJECT_TYPES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  lectureHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  tutorialHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  practicalHours?: number;

  @IsInt()
  @Min(1)
  @Max(1000)
  maxMarks!: number;

  @IsInt()
  @Min(0)
  @Max(1000)
  passingMarks!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(30)
  credits!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  theoryMarks?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  practicalMarks?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  internalMarks?: number;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Matches(DESCRIPTION_PATTERN, { message: DESCRIPTION_MESSAGE })
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SubjectOutcomeDto)
  outcomes?: SubjectOutcomeDto[];
}

export class UpdateSubjectDto {
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  @Matches(PROGRAM_NAME_PATTERN, { message: PROGRAM_NAME_MESSAGE })
  name?: string;

  @EmptyToUndefined()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MaxLength(50)
  @Matches(PROGRAM_CODE_PATTERN, { message: PROGRAM_CODE_MESSAGE })
  code?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(PROGRAM_CODE_PATTERN, { message: PROGRAM_CODE_MESSAGE })
  shortName?: string;

  @IsOptional()
  @IsIn(SUBJECT_TYPES)
  type?: (typeof SUBJECT_TYPES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  lectureHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  tutorialHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  practicalHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxMarks?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  passingMarks?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(30)
  credits?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  theoryMarks?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  practicalMarks?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  internalMarks?: number;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Matches(DESCRIPTION_PATTERN, { message: DESCRIPTION_MESSAGE })
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SubjectOutcomeDto)
  outcomes?: SubjectOutcomeDto[];
}

export class ListSubjectsQueryDto {
  @IsOptional()
  @IsUUID('4')
  programId?: string;
}
