import { IsOptional, IsUUID } from 'class-validator';

export class CreateSemestersDto {
  @IsUUID('4')
  programId!: string;
}

export class ListSemestersQueryDto {
  @IsOptional()
  @IsUUID('4')
  programId?: string;
}
