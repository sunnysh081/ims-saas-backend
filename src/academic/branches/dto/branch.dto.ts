import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { EmptyToUndefined } from '../../../common/validation/empty-to-undefined';
import {
  PROGRAM_CODE_MESSAGE,
  PROGRAM_CODE_PATTERN,
  PROGRAM_NAME_MESSAGE,
  PROGRAM_NAME_PATTERN,
} from '../../../common/validation/patterns';

export class BranchOutcomeDto {
  @IsIn(['PO', 'PEO'])
  type!: 'PO' | 'PEO';

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  statement!: string;
}

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

  @EmptyToUndefined()
  @IsOptional()
  @IsUUID('4')
  hodUserId?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BranchOutcomeDto)
  outcomes?: BranchOutcomeDto[];
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

  @EmptyToUndefined()
  @IsOptional()
  @IsUUID('4')
  hodUserId?: string;

  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BranchOutcomeDto)
  outcomes?: BranchOutcomeDto[];
}

export class ListBranchesQueryDto {
  @IsOptional()
  @IsUUID('4')
  programId?: string;
}
