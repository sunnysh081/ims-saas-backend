import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';

export const QUIZ_TYPES = ['CLASS_QUIZ', 'PRACTICE_QUIZ', 'UNIT_TEST'] as const;
export const QUIZ_STATUSES = ['DRAFT', 'PUBLISHED'] as const;
export const QUIZ_RESULTS_DISPLAY = ['ON_PUBLISH', 'ON_SUBMIT', 'ON_CLOSE'] as const;
export const QUESTION_TYPES = [
  'MCQ_SINGLE',
  'MCQ_MULTIPLE',
  'SUBJECTIVE',
  'BLANKS',
  'MATCH',
  'TRUE_FALSE',
  'ESSAY',
] as const;
export const BT_LEVELS = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export class QuizOptionDto {
  @IsString()
  @MaxLength(1000)
  text!: string;

  @IsBoolean()
  isCorrect!: boolean;
}

export class QuizPairDto {
  @IsString()
  @MaxLength(500)
  left!: string;

  @IsString()
  @MaxLength(500)
  right!: string;
}

export class QuizQuestionDto {
  @IsIn(QUESTION_TYPES)
  type!: QuestionType;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text!: string;

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

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000)
  maxMarks!: number;

  @IsOptional()
  @IsBoolean()
  allowNegativeMarking?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000)
  negativeMarks?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  options?: QuizOptionDto[];

  @IsOptional()
  @IsBoolean()
  correct?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  blanks?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => QuizPairDto)
  pairs?: QuizPairDto[];
}

export class QuizBodyDto {
  @IsIn(QUIZ_TYPES)
  quizType!: (typeof QUIZ_TYPES)[number];

  @EmptyToUndefined()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title!: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

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
  @IsBoolean()
  isTimed?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  durationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  considerForGrading?: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @EmptyToUndefined()
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsIn(QUIZ_RESULTS_DISPLAY)
  resultsDisplay!: (typeof QUIZ_RESULTS_DISPLAY)[number];

  @IsIn(QUIZ_STATUSES)
  status!: (typeof QUIZ_STATUSES)[number];

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions!: QuizQuestionDto[];
}

export class CreateQuizDto extends QuizBodyDto {
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

export class UpdateQuizDto extends QuizBodyDto {}

export class ListQuizzesQueryDto {
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
  @IsIn(QUIZ_STATUSES)
  status?: (typeof QUIZ_STATUSES)[number];
}
