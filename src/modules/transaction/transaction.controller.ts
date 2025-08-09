import { Controller, Post, Get, Body, Param, HttpStatus, ValidationPipe, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from '../../common/dtos/create-transaction.dto';
import { TransactionResponseDto } from '../../common/dtos/transaction-response.dto';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new transaction',
    description: 'Creates a new financial transaction with pending status for anti-fraud validation'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Transaction created successfully',
    type: TransactionResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or business rule violation',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Debit and credit accounts cannot be the same' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Transaction type not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Transaction type with ID 1 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async createTransaction(@Body() createTransactionDto: CreateTransactionDto): Promise<TransactionResponseDto> {
    return this.transactionService.createTransaction(createTransactionDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get transaction by ID',
    description: 'Retrieves a transaction by its external ID'
  })
  @ApiParam({
    name: 'id',
    description: 'Transaction external ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction found successfully',
    type: TransactionResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Transaction not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Transaction with ID 550e8400-e29b-41d4-a716-446655440000 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async getTransactionById(@Param('id') id: string): Promise<TransactionResponseDto> {
    return this.transactionService.getTransactionById(id);
  }
} 