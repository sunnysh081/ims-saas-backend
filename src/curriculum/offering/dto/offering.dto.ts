import { IsOptional, IsUUID } from 'class-validator';

export class CreateOfferingDto {
  @IsUUID('4')
  subjectId!: string;

  @IsUUID('4')
  syllabusId!: string;

  @IsUUID('4')
  semesterId!: string;

  @IsUUID('4')
  batchId!: string;

  @IsUUID('4')
  sectionId!: string;

  @IsOptional()
  @IsUUID('4')
  facultyId?: string;
}

export class UpdateOfferingDto {
  @IsOptional()
  @IsUUID('4')
  facultyId?: string;

  @IsOptional()
  @IsUUID('4')
  syllabusId?: string;
}

export class GenerateOfferingsDto {
  @IsUUID('4')
  semesterId!: string;

  @IsUUID('4')
  batchId!: string;
}

export class ListOfferingsQueryDto {
  @IsOptional()
  @IsUUID('4')
  semesterId?: string;

  @IsOptional()
  @IsUUID('4')
  sectionId?: string;

  @IsOptional()
  @IsUUID('4')
  batchId?: string;

  @IsOptional()
  @IsUUID('4')
  facultyId?: string;
}
