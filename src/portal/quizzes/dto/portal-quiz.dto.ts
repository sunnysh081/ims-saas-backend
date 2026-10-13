import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';

export class QuizAnswerDto {
  @IsUUID('4')
  questionId!: string;

  @IsOptional()
  answer?: unknown;
}

export class SubmitQuizDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers!: QuizAnswerDto[];
}
