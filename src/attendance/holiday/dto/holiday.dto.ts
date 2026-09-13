import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';

export class HolidayItemDto {
  @IsDateString()
  date!: string;

  @EmptyToUndefined()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsUUID('4')
  programId?: string;
}

export class CreateHolidaysDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => HolidayItemDto)
  items!: HolidayItemDto[];
}

export class ListHolidaysQueryDto {
  @IsOptional()
  @IsUUID('4')
  programId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
