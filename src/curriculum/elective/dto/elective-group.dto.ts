import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';

export const ELECTIVE_GROUP_TYPES = ['PROFESSIONAL', 'OPEN', 'HONOURS'] as const;

export class CreateElectiveGroupDto {
  @IsUUID('4')
  programId!: string;

  @IsUUID('4')
  semesterId!: string;

  @IsOptional()
  @IsUUID('4')
  branchId?: string;

  @EmptyToUndefined()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsIn(ELECTIVE_GROUP_TYPES)
  type!: (typeof ELECTIVE_GROUP_TYPES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  maxChoices?: number;

  @IsOptional()
  @IsDateString()
  choiceWindowOpen?: string;

  @IsOptional()
  @IsDateString()
  choiceWindowClose?: string;
}

export class UpdateElectiveGroupDto {
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  maxChoices?: number;

  @IsOptional()
  @IsDateString()
  choiceWindowOpen?: string;

  @IsOptional()
  @IsDateString()
  choiceWindowClose?: string;
}

export class ListElectiveGroupsQueryDto {
  @IsOptional()
  @IsUUID('4')
  programId?: string;

  @IsOptional()
  @IsUUID('4')
  semesterId?: string;

  @IsOptional()
  @IsUUID('4')
  branchId?: string;
}

export class CreateElectiveOptionDto {
  @IsUUID('4')
  subjectId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatsLimit?: number;
}
