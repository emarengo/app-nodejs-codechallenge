import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../common/entities/transaction.entity';
import { TransactionType } from '../../common/entities/transaction-type.entity';
import { TransactionStatus } from '../../common/entities/transaction-status.entity';
import { CreateTransactionDto } from '../../common/dtos/create-transaction.dto';
import { TransactionResponseDto } from '../../common/dtos/transaction-response.dto';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionType)
    private transactionTypeRepository: Repository<TransactionType>,
    @InjectRepository(TransactionStatus)
    private transactionStatusRepository: Repository<TransactionStatus>,
  ) {}

  async createTransaction(createTransactionDto: CreateTransactionDto): Promise<TransactionResponseDto> {
    const { accountExternalIdDebit, accountExternalIdCredit, tranferTypeId, value } = createTransactionDto;

    if (accountExternalIdDebit === accountExternalIdCredit) {
      throw new BadRequestException('Debit and credit accounts cannot be the same');
    }

    const transactionType = await this.transactionTypeRepository.findOne({
      where: { id: tranferTypeId, isActive: true }
    });

    if (!transactionType) {
      throw new NotFoundException(`Transaction type with ID ${tranferTypeId} not found`);
    }

    const pendingStatus = await this.transactionStatusRepository.findOne({
      where: { name: 'pending' }
    });

    if (!pendingStatus) {
      throw new Error('Pending status not found in database');
    }

    const transaction = this.transactionRepository.create({
      accountExternalIdDebit,
      accountExternalIdCredit,
      tranferTypeId,
      value,
      transactionStatusId: pendingStatus.id,
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    return this.mapToResponseDto(savedTransaction, transactionType, pendingStatus);
  }

  async getTransactionById(transactionExternalId: string): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepository.findOne({
      where: { transactionExternalId },
      relations: ['transactionType', 'transactionStatus'],
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${transactionExternalId} not found`);
    }

    return this.mapToResponseDto(
      transaction,
      transaction.transactionType,
      transaction.transactionStatus
    );
  }

  private mapToResponseDto(
    transaction: Transaction,
    transactionType: TransactionType,
    transactionStatus: TransactionStatus,
  ): TransactionResponseDto {
    return {
      transactionExternalId: transaction.transactionExternalId,
      transactionType: {
        name: transactionType.name,
      },
      transactionStatus: {
        name: transactionStatus.name,
      },
      value: Number(transaction.value),
      createdAt: transaction.createdAt,
    };
  }
} 