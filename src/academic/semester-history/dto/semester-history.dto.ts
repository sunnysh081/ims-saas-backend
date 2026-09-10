import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export const RESULT_STATUSES = ['PASS', 'FAIL', 'WITHHELD', 'ABSENT'] as const;

export class SealResultDto {
  @IsUUID('4')
  studentId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  sgpa?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  attendancePct?: number;

  @IsIn(RESULT_STATUSES)
  result!: (typeof RESULT_STATUSES)[number];
}

export class SealSemesterHistoryDto {
  @IsUUID('4')
  semesterId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SealResultDto)
  results!: SealResultDto[];
}

export class ListSemesterHistoryQueryDto {
  @IsOptional()
  @IsUUID('4')
  studentId?: string;

  @IsOptional()
  @IsUUID('4')
  semesterId?: string;
}
