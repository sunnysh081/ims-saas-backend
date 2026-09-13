import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';

export const LEAVE_TYPES = ['MEDICAL', 'PERSONAL', 'OD', 'EMERGENCY'] as const;
export const LEAVE_REVIEW_STATUSES = ['APPROVED', 'REJECTED'] as const;

export class CreateLeaveDto {
  @IsUUID('4')
  studentId!: string;

  @IsUUID('4')
  semesterId!: string;

  @IsIn(LEAVE_TYPES)
  type!: (typeof LEAVE_TYPES)[number];

  @IsDateString()
  fromDate!: string;

  @IsDateString()
  toDate!: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  documentUrl?: string;
}

export class ReviewLeaveDto {
  @IsIn(LEAVE_REVIEW_STATUSES)
  status!: (typeof LEAVE_REVIEW_STATUSES)[number];

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ListLeaveQueryDto {
  @IsOptional()
  @IsUUID('4')
  studentId?: string;

  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsUUID('4')
  semesterId?: string;
}
