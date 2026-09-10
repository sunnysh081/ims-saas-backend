import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';

export class PromoteSemesterDto {
  @IsUUID('4')
  batchId!: string;

  @IsUUID('4')
  fromSemId!: string;

  @IsUUID('4')
  toSemId!: string;

  @Matches(/^\d{4}-\d{4}$/, {
    message: 'academicYear must be YYYY-YYYY',
  })
  academicYear!: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
