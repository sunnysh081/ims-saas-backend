import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';

export const CLASS_TYPES = ['REGULAR', 'PLACEMENT', 'SPORTS', 'ARITHMETIC', 'SPECIAL', 'OTHER'] as const;
export const MARKABLE_STATUSES = ['PRESENT', 'ABSENT', 'LEAVE'] as const;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateSessionDto {
  @IsIn(CLASS_TYPES)
  classType!: (typeof CLASS_TYPES)[number];

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsUUID('4')
  subjectId?: string;

  @IsOptional()
  @IsUUID('4')
  sectionId?: string;

  // Extra students for non-section classes (placement, sports, ...).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @IsUUID('4', { each: true })
  participantStudentIds?: string[];

  // Adds every student currently enrolled in these sections as participants.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  participantSectionIds?: string[];

  @IsUUID('4')
  teacherUserId!: string;

  @Matches(DATE, { message: 'Use the format YYYY-MM-DD' })
  sessionDate!: string;

  @Matches(TIME, { message: 'Use 24-hour HH:MM' })
  startTime!: string;

  @Matches(TIME, { message: 'Use 24-hour HH:MM' })
  endTime!: string;

  // Repeats the same session every week up to and including this date.
  @EmptyToUndefined()
  @IsOptional()
  @Matches(DATE, { message: 'Use the format YYYY-MM-DD' })
  repeatUntil?: string;
}

export class UpdateSessionDto {
  @IsOptional()
  @IsUUID('4')
  teacherUserId?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title?: string;
}

export class ListSessionsQueryDto {
  @IsOptional()
  @Matches(DATE, { message: 'Use the format YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @IsUUID('4')
  teacherUserId?: string;
}

export class AttendanceEntryDto {
  @IsUUID('4')
  studentId!: string;

  @IsIn(MARKABLE_STATUSES)
  status!: (typeof MARKABLE_STATUSES)[number];
}

export class MarkAttendanceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];

  // Required when correcting attendance in a locked session.
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class AssignPrimaryDto {
  @IsOptional()
  @IsBoolean()
  all?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @IsUUID('4', { each: true })
  studentIds?: string[];
}

export class LockSessionDto {
  @IsBoolean()
  locked!: boolean;
}

export class SearchStudentsQueryDto {
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class CreateMergeDto {
  @IsArray()
  @ArrayMinSize(2, { message: 'Select at least two classes to merge' })
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  sessionIds!: string[];
}

export class ListMergeableQueryDto {
  @Matches(DATE, { message: 'Use the format YYYY-MM-DD' })
  date!: string;

  @IsOptional()
  @IsUUID('4')
  teacherUserId?: string;
}
