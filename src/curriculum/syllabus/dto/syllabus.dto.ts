import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';

export class CreateSyllabusDto {
  @IsUUID('4')
  subjectId!: string;

  @EmptyToUndefined()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  version!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  regulationYear!: number;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  description?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  outcomes?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  references?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalHours?: number;
}

export class UpdateSyllabusDto {
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  description?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  outcomes?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  references?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalHours?: number;
}

export class ListSyllabiQueryDto {
  @IsOptional()
  @IsUUID('4')
  subjectId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === '') {
      return undefined;
    }

    return value === true || value === 'true';
  })
  @IsBoolean()
  isActive?: boolean;
}
