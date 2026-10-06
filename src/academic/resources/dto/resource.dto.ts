import { IsBoolean, IsOptional, IsString, IsUUID, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';
import { DESCRIPTION_MESSAGE, DESCRIPTION_PATTERN, PROGRAM_NAME_MESSAGE, PROGRAM_NAME_PATTERN } from '../../../common/validation/patterns';

export class CreateResourceDto {
  @IsUUID('4')
  subjectId!: string;

  @EmptyToUndefined()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  @Matches(PROGRAM_NAME_PATTERN, { message: PROGRAM_NAME_MESSAGE })
  title!: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Matches(DESCRIPTION_PATTERN, { message: DESCRIPTION_MESSAGE })
  description?: string;

  @IsUrl({ require_protocol: true })
  url!: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateResourceDto {
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  @Matches(PROGRAM_NAME_PATTERN, { message: PROGRAM_NAME_MESSAGE })
  title?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Matches(DESCRIPTION_PATTERN, { message: DESCRIPTION_MESSAGE })
  description?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class ListResourcesQueryDto {
  @IsOptional()
  @IsUUID('4')
  subjectId?: string;

  @IsOptional()
  @IsUUID('4')
  programId?: string;
}
