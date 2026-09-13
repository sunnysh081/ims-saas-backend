import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateTimetableSlotDto {
  @IsUUID('4')
  offeringId!: string;

  @IsIn(DAYS_OF_WEEK)
  dayOfWeek!: (typeof DAYS_OF_WEEK)[number];

  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm format' })
  startTime!: string;

  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:mm format' })
  endTime!: string;

  @IsOptional()
  @IsString()
  roomNumber?: string;
}

export class UpdateTimetableSlotDto {
  @IsOptional()
  @IsIn(DAYS_OF_WEEK)
  dayOfWeek?: (typeof DAYS_OF_WEEK)[number];

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm format' })
  startTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:mm format' })
  endTime?: string;

  @IsOptional()
  @IsString()
  roomNumber?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 'on')
  @IsBoolean()
  isActive?: boolean;
}

export class ListTimetableQueryDto {
  @IsOptional()
  @IsUUID('4')
  offeringId?: string;

  @IsOptional()
  @IsUUID('4')
  sectionId?: string;

  @IsOptional()
  @IsUUID('4')
  semesterId?: string;

  @IsOptional()
  @IsIn(DAYS_OF_WEEK)
  dayOfWeek?: (typeof DAYS_OF_WEEK)[number];
}

export class GenerateSessionsDto {
  @IsUUID('4')
  semesterId!: string;

  @IsDateString()
  fromDate!: string;

  @IsDateString()
  toDate!: string;
}
