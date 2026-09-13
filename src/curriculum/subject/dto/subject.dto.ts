import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';
import { PaginationDto } from '../../../academic/dto/pagination.dto';

export const SUBJECT_TYPES = ['THEORY', 'LAB', 'PROJECT', 'SEMINAR'] as const;

export const SUBJECT_CATEGORIES = ['CORE', 'ELECTIVE', 'OPEN_ELECTIVE', 'AUDIT'] as const;

export class CreateSubjectDto {
  @IsUUID('4')
  programId!: string;

  @EmptyToUndefined()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  code!: string;

  @EmptyToUndefined()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  shortName?: string;

  @IsIn(SUBJECT_TYPES)
  type!: (typeof SUBJECT_TYPES)[number];

  @IsIn(SUBJECT_CATEGORIES)
  category!: (typeof SUBJECT_CATEGORIES)[number];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  credits!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  theoryHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  labHours?: number;
}

export class UpdateSubjectDto {
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  shortName?: string;

  @IsOptional()
  @IsIn(SUBJECT_TYPES)
  type?: (typeof SUBJECT_TYPES)[number];

  @IsOptional()
  @IsIn(SUBJECT_CATEGORIES)
  category?: (typeof SUBJECT_CATEGORIES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  credits?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  theoryHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  labHours?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 'on')
  @IsBoolean()
  isActive?: boolean;
}

export class ListSubjectsQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID('4')
  programId?: string;

  @IsOptional()
  @IsIn(SUBJECT_TYPES)
  type?: (typeof SUBJECT_TYPES)[number];

  @IsOptional()
  @IsIn(SUBJECT_CATEGORIES)
  category?: (typeof SUBJECT_CATEGORIES)[number];
}
