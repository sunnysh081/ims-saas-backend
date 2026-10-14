import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';
import { BT_LEVELS } from '../../quizzes/dto/quiz.dto';

export const ASSIGNMENT_TYPES = ['CLASS_ASSIGNMENT', 'HOME_ASSIGNMENT', 'LAB_ASSIGNMENT'] as const;
export const ASSIGNMENT_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export const SUBMISSION_TYPES = ['PHYSICAL', 'ONLINE'] as const;

export class RubricCriterionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  criterion!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000)
  maxMarks!: number;
}

export class AssignmentBodyDto {
  @IsIn(ASSIGNMENT_TYPES)
  assignmentType!: (typeof ASSIGNMENT_TYPES)[number];

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
  @IsBoolean()
  considerForGrading?: boolean;

  @IsOptional()
  @IsBoolean()
  rubricGrading?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RubricCriterionDto)
  rubric?: RubricCriterionDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  courseOutcomes?: string[];

  @IsOptional()
  @IsIn(BT_LEVELS)
  btLevel?: (typeof BT_LEVELS)[number];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  topicOutcomes?: string[];

  @EmptyToUndefined()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsDateString()
  dueAt!: string;

  @IsIn(SUBMISSION_TYPES)
  submissionType!: (typeof SUBMISSION_TYPES)[number];

  @EmptyToUndefined()
  @IsOptional()
  @IsUUID('4')
  syllabusUnitId?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  chapter?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100_000)
  maxMarks?: number;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  attachmentUrl?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  attachmentLabel?: string;

  @IsIn(ASSIGNMENT_STATUSES)
  status!: (typeof ASSIGNMENT_STATUSES)[number];
}

export class CreateAssignmentDto extends AssignmentBodyDto {
  @IsUUID('4')
  batchId!: string;

  @IsUUID('4')
  subjectId!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  copyToBatchIds?: string[];
}

export class UpdateAssignmentDto extends AssignmentBodyDto {}

export class ListAssignmentsQueryDto {
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
  @IsIn(ASSIGNMENT_STATUSES)
  status?: (typeof ASSIGNMENT_STATUSES)[number];
}

export class GradeSubmissionDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000)
  marks?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsNumber({ maxDecimalPlaces: 2 }, { each: true })
  @Min(0, { each: true })
  rubricMarks?: number[];

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  feedback?: string;
}
