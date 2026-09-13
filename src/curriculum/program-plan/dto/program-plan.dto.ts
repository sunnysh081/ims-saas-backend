import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsOptional, IsUUID, ValidateNested } from 'class-validator';

export class ProgramPlanItemDto {
  @IsUUID('4')
  programId!: string;

  @IsOptional()
  @IsUUID('4')
  branchId?: string;

  @IsUUID('4')
  semesterId!: string;

  @IsUUID('4')
  subjectId!: string;

  @IsOptional()
  @IsBoolean()
  isElective?: boolean;
}

export class CreateProgramPlansDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProgramPlanItemDto)
  items!: ProgramPlanItemDto[];
}

export class ListProgramPlansQueryDto {
  @IsOptional()
  @IsUUID('4')
  programId?: string;

  @IsOptional()
  @IsUUID('4')
  branchId?: string;

  @IsOptional()
  @IsUUID('4')
  semesterId?: string;
}
