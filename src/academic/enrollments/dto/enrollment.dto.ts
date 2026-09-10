import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID, Matches } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID('4')
  studentId!: string;

  @IsUUID('4')
  semesterId!: string;

  @IsUUID('4')
  sectionId!: string;

  @Matches(/^\d{4}-\d{4}$/, {
    message: 'academicYear must be YYYY-YYYY',
  })
  academicYear!: string;
}

export class ListEnrollmentsQueryDto {
  @IsOptional()
  @IsUUID('4')
  studentId?: string;

  @IsOptional()
  @IsUUID('4')
  semesterId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === '') {
      return undefined;
    }

    return value === true || value === 'true';
  })
  @IsBoolean()
  active?: boolean;
}
