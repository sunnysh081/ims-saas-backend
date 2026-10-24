import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
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

export const ACTIVITY_TYPES = ['DISCUSSION', 'POLL', 'PRACTICAL'] as const;
export const ACTIVITY_STATUSES = ['DRAFT', 'PUBLISHED'] as const;

export class ActivityBodyDto {
  @IsIn(ACTIVITY_TYPES)
  activityType!: (typeof ACTIVITY_TYPES)[number];

  @EmptyToUndefined()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title!: string;

  @EmptyToUndefined()
  @IsString()
  @MaxLength(10_000)
  description!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  pollOptions?: string[];

  @EmptyToUndefined()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsIn(ACTIVITY_STATUSES)
  status!: (typeof ACTIVITY_STATUSES)[number];
}

export class CreateActivityDto extends ActivityBodyDto {
  @IsUUID('4')
  batchId!: string;

  @IsUUID('4')
  subjectId!: string;
}

export class UpdateActivityDto extends ActivityBodyDto {}

export class ListActivitiesQueryDto {
  @IsOptional()
  @IsUUID('4')
  programId?: string;

  @IsOptional()
  @IsUUID('4')
  batchId?: string;

  @IsOptional()
  @IsUUID('4')
  subjectId?: string;

  @IsOptional()
  @IsIn(ACTIVITY_TYPES)
  activityType?: (typeof ACTIVITY_TYPES)[number];

  @IsOptional()
  @IsIn(ACTIVITY_STATUSES)
  status?: (typeof ACTIVITY_STATUSES)[number];
}

export class CreatePostDto {
  @EmptyToUndefined()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsUUID('4')
  parentId?: string;
}

export class SetRecordDto {
  @IsBoolean()
  completed!: boolean;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;
}

export class VoteDto {
  @IsInt()
  @Min(0)
  @Max(9)
  optionIndex!: number;
}
