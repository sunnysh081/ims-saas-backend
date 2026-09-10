import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';

export class CreateBatchDto {
  @IsUUID('4')
  programId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  startYear!: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  endYear!: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 'on')
  @IsBoolean()
  isCombined?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 'on')
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBatchDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  startYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  endYear?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 'on')
  @IsBoolean()
  isCombined?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 'on')
  @IsBoolean()
  isActive?: boolean;
}

export class ListBatchesQueryDto {
  @IsOptional()
  @IsUUID('4')
  programId?: string;

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

export class SplitBranchDto {
  @IsUUID('4')
  branchId!: string;

  @EmptyToUndefined()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  sectionName!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  capacity!: number;

  @IsArray()
  @IsUUID('4', { each: true })
  studentIds: string[] = [];
}

export class SplitBranchesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SplitBranchDto)
  splits!: SplitBranchDto[];
}
