import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';

export class CreateSectionDto {
  @IsUUID('4')
  batchId!: string;

  @EmptyToUndefined()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsUUID('4')
  branchId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  capacity!: number;
}

export class UpdateSectionDto {
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsUUID('4')
  branchId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  capacity?: number;
}

export class ListSectionsQueryDto {
  @IsOptional()
  @IsUUID('4')
  batchId?: string;

  @IsOptional()
  @IsUUID('4')
  branchId?: string;
}
