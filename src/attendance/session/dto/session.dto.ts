import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'ON_DUTY', 'MEDICAL'] as const;

export const SESSION_STATUSES = ['SCHEDULED', 'TAKEN', 'CANCELLED'] as const;

export class CreateSessionDto {
  @IsUUID('4')
  offeringId!: string;

  @IsDateString()
  date!: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  topicCovered?: string;
}

export class MarkRecordDto {
  @IsUUID('4')
  studentId!: string;

  @IsIn(ATTENDANCE_STATUSES)
  status!: (typeof ATTENDANCE_STATUSES)[number];

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class MarkAttendanceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MarkRecordDto)
  records!: MarkRecordDto[];

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  topicCovered?: string;
}

export class CancelSessionDto {
  @EmptyToUndefined()
  @IsString()
  @MaxLength(500)
  cancelReason!: string;
}

export class ListSessionsQueryDto {
  @IsOptional()
  @IsUUID('4')
  offeringId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsIn(SESSION_STATUSES)
  status?: (typeof SESSION_STATUSES)[number];
}
