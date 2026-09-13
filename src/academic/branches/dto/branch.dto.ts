import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';
import {
  PROGRAM_CODE_MESSAGE,
  PROGRAM_CODE_PATTERN,
  PROGRAM_NAME_MESSAGE,
  PROGRAM_NAME_PATTERN,
} from '../../../common/validation/patterns';

export class CreateBranchDto {
  @IsUUID('4')
  programId!: string;

  @EmptyToUndefined()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  @Matches(PROGRAM_NAME_PATTERN, { message: PROGRAM_NAME_MESSAGE })
  name!: string;

  @EmptyToUndefined()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(PROGRAM_CODE_PATTERN, { message: PROGRAM_CODE_MESSAGE })
  code!: string;
}

export class UpdateBranchDto {
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  @Matches(PROGRAM_NAME_PATTERN, { message: PROGRAM_NAME_MESSAGE })
  name?: string;

  @EmptyToUndefined()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(PROGRAM_CODE_PATTERN, { message: PROGRAM_CODE_MESSAGE })
  code?: string;
}

export class ListBranchesQueryDto {
  @IsOptional()
  @IsUUID('4')
  programId?: string;
}
