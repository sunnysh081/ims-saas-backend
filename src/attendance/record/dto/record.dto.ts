import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';
import { ATTENDANCE_STATUSES } from '../../session/dto/session.dto';

export class CorrectRecordDto {
  @IsIn(ATTENDANCE_STATUSES)
  status!: (typeof ATTENDANCE_STATUSES)[number];

  @EmptyToUndefined()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

export class ListRecordsQueryDto {
  @IsOptional()
  @IsUUID('4')
  sessionId?: string;

  @IsOptional()
  @IsUUID('4')
  studentId?: string;
}
