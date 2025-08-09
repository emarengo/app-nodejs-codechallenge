import { IsUUID, IsNumber, IsPositive, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { 
  IsNotSameAccount, 
  IsValidTransactionAmount,
  IsValidUUIDFormat 
} from '../validators/transaction.validators';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'External ID of the debit account',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid'
  })
  @IsUUID(4, { message: 'accountExternalIdDebit must be a valid UUID v4' })
  @IsValidUUIDFormat({ message: 'accountExternalIdDebit must be a properly formatted UUID v4' })
  accountExternalIdDebit: string;

  @ApiProperty({
    description: 'External ID of the credit account',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid'
  })
  @IsUUID(4, { message: 'accountExternalIdCredit must be a valid UUID v4' })
  @IsValidUUIDFormat({ message: 'accountExternalIdCredit must be a properly formatted UUID v4' })
  @IsNotSameAccount('accountExternalIdDebit', {
    message: 'Credit account cannot be the same as debit account'
  })
  accountExternalIdCredit: string;

  @ApiProperty({
    description: 'Transfer type ID',
    example: 1,
    minimum: 1
  })
  @IsNumber({}, { message: 'tranferTypeId must be a number' })
  @Min(1, { message: 'tranferTypeId must be at least 1' })
  tranferTypeId: number;

  @ApiProperty({
    description: 'Transaction value in currency units (max 2 decimal places)',
    example: 120.50,
    minimum: 0.01,
    maximum: 100000000
  })
  @IsValidTransactionAmount({
    message: 'value must be a positive number with maximum 2 decimal places, between 0.01 and 100,000,000'
  })
  value: number;
} 