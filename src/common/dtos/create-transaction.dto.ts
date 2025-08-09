import { IsUUID, IsNumber, IsPositive, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'External ID of the debit account',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid'
  })
  @IsUUID(4, { message: 'accountExternalIdDebit must be a valid UUID' })
  accountExternalIdDebit: string;

  @ApiProperty({
    description: 'External ID of the credit account',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid'
  })
  @IsUUID(4, { message: 'accountExternalIdCredit must be a valid UUID' })
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
    description: 'Transaction value in currency units',
    example: 120.50,
    minimum: 0.01
  })
  @IsNumber({}, { message: 'value must be a number' })
  @IsPositive({ message: 'value must be positive' })
  value: number;
} 