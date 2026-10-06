import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';
import { MOBILE_MESSAGE, MOBILE_PATTERN, PASSWORD_MESSAGE, PASSWORD_PATTERN } from '../../../common/validation/patterns';
import { PaginationDto } from '../../dto/pagination.dto';

export const STUDENT_STATUSES = ['ACTIVE', 'DETAINED', 'GRADUATED', 'DROPPED'] as const;

export class CreateStudentDto {
  @EmptyToUndefined()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9\-/]*$/, {
    message: 'Use letters, numbers, hyphens, and slashes only',
  })
  rollNumber!: string;

  @EmptyToUndefined()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @EmptyToUndefined()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @Matches(MOBILE_PATTERN, { message: MOBILE_MESSAGE })
  phone?: string;

  @IsOptional()
  @IsIn(STUDENT_STATUSES)
  status?: (typeof STUDENT_STATUSES)[number];
}

export class UpdateStudentDto {
  @EmptyToUndefined()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  rollNumber?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @EmptyToUndefined()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @Matches(MOBILE_PATTERN, { message: MOBILE_MESSAGE })
  phone?: string;

  @IsOptional()
  @IsIn(STUDENT_STATUSES)
  status?: (typeof STUDENT_STATUSES)[number];
}

export class ListStudentsQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID('4')
  batchId?: string;

  @IsOptional()
  @IsUUID('4')
  sectionId?: string;

  @IsOptional()
  @IsUUID('4')
  semesterId?: string;

  @IsOptional()
  @IsIn(STUDENT_STATUSES)
  status?: (typeof STUDENT_STATUSES)[number];
}

export class ChangeSectionDto {
  @IsUUID('4')
  toSectionId!: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class PortalAccessDto {
  @IsString()
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password!: string;
}

export class ChangeBranchDto {
  @IsUUID('4')
  toBranchId!: string;

  @IsUUID('4')
  toSectionId!: string;

  @IsUUID('4')
  atSemesterId!: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
