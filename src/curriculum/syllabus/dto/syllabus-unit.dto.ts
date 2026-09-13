import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';

export class CreateSyllabusUnitDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitNumber!: number;

  @EmptyToUndefined()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @EmptyToUndefined()
  @IsString()
  topics!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  hours!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  weightage?: number;
}

export class UpdateSyllabusUnitDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitNumber?: number;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  topics?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  hours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  weightage?: number;
}
