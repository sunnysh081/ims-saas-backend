import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
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
import { PROGRAM_NAME_MESSAGE, PROGRAM_NAME_PATTERN } from '../../../common/validation/patterns';

export class SyllabusUnitDto {
  @IsInt()
  @Min(1)
  @Max(50)
  unitNumber!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Matches(PROGRAM_NAME_PATTERN, { message: PROGRAM_NAME_MESSAGE })
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  topics?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  hours?: number;
}

export class CreateSyllabusDto {
  @IsUUID('4')
  batchId!: string;

  @IsUUID('4')
  subjectId!: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SyllabusUnitDto)
  units?: SyllabusUnitDto[];
}

export class UpdateSyllabusDto {
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SyllabusUnitDto)
  units?: SyllabusUnitDto[];
}

export class ListSyllabiQueryDto {
  @IsOptional()
  @IsUUID('4')
  batchId?: string;

  @IsOptional()
  @IsUUID('4')
  subjectId?: string;

  @IsOptional()
  @IsUUID('4')
  programId?: string;
}
