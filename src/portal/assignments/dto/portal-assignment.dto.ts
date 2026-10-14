import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';

export class SubmitAssignmentDto {
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  text?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;
}
