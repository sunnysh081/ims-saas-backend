import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateCurriculumPlanDto {
  @IsUUID('4')
  batchId!: string;

  @IsUUID('4')
  semesterId!: string;

  @IsUUID('4')
  subjectId!: string;

  @IsOptional()
  @IsBoolean()
  isElective?: boolean;
}

export class ListCurriculumPlansQueryDto {
  @IsOptional()
  @IsUUID('4')
  batchId?: string;
}
