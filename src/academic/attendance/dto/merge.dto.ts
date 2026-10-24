import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';
import { AttendanceEntryDto } from './attendance.dto';

export class SubmitMergeDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
