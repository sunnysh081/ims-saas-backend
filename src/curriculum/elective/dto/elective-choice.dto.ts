import { IsOptional, IsUUID } from 'class-validator';

export class CreateElectiveChoiceDto {
  @IsUUID('4')
  studentId!: string;

  @IsUUID('4')
  electiveGroupId!: string;

  @IsUUID('4')
  electiveOptionId!: string;
}

export class UpdateElectiveChoiceDto {
  @IsUUID('4')
  electiveOptionId!: string;
}

export class ListElectiveChoicesQueryDto {
  @IsOptional()
  @IsUUID('4')
  studentId?: string;

  @IsOptional()
  @IsUUID('4')
  semesterId?: string;

  @IsOptional()
  @IsUUID('4')
  electiveGroupId?: string;
}
