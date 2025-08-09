import { ApiProperty } from '@nestjs/swagger';

export class TransactionTypeDto {
  @ApiProperty({
    description: 'Transaction type name',
    example: 'Transfer'
  })
  name: string;
}

export class TransactionStatusDto {
  @ApiProperty({
    description: 'Transaction status name',
    example: 'pending'
  })
  name: string;
}

export class TransactionResponseDto {
  @ApiProperty({
    description: 'Transaction external ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid'
  })
  transactionExternalId: string;

  @ApiProperty({
    description: 'Transaction type information',
    type: TransactionTypeDto
  })
  transactionType: TransactionTypeDto;

  @ApiProperty({
    description: 'Transaction status information', 
    type: TransactionStatusDto
  })
  transactionStatus: TransactionStatusDto;

  @ApiProperty({
    description: 'Transaction value',
    example: 120.50
  })
  value: number;

  @ApiProperty({
    description: 'Transaction creation date',
    example: '2024-01-15T10:30:00Z'
  })
  createdAt: Date;
} 