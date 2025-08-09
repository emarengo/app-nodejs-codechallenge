import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../common/entities/transaction.entity';
import { TransactionType } from '../../common/entities/transaction-type.entity';
import { TransactionStatus } from '../../common/entities/transaction-status.entity';
import { CreateTransactionDto } from '../../common/dtos/create-transaction.dto';
import { TransactionResponseDto } from '../../common/dtos/transaction-response.dto';
import { KafkaService, TransactionCreatedEvent, TransactionStatusUpdatedEvent } from '../../common/services/kafka.service';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionType)
    private transactionTypeRepository: Repository<TransactionType>,
    @InjectRepository(TransactionStatus)
    private transactionStatusRepository: Repository<TransactionStatus>,
    private kafkaService: KafkaService,
  ) {
    this.initializeKafkaSubscriptions();
  }

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

    const transactionCreatedEvent: TransactionCreatedEvent = {
      transactionExternalId: savedTransaction.transactionExternalId,
      accountExternalIdDebit,
      accountExternalIdCredit,
      tranferTypeId,
      value,
      createdAt: savedTransaction.createdAt.toISOString(),
    };

    try {
      await this.kafkaService.publishTransactionCreated(transactionCreatedEvent);
      this.logger.log(`Transaction created event published for: ${savedTransaction.transactionExternalId}`);
    } catch (error) {
      this.logger.error('Failed to publish transaction created event:', error);
    }

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

  async updateTransactionStatus(transactionExternalId: string, statusName: 'approved' | 'rejected'): Promise<void> {
    const transaction = await this.transactionRepository.findOne({
      where: { transactionExternalId }
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${transactionExternalId} not found`);
    }

    const newStatus = await this.transactionStatusRepository.findOne({
      where: { name: statusName }
    });

    if (!newStatus) {
      throw new Error(`Status ${statusName} not found in database`);
    }

    await this.transactionRepository.update(
      { transactionExternalId },
      { transactionStatusId: newStatus.id }
    );

    this.logger.log(`Transaction ${transactionExternalId} status updated to: ${statusName}`);
  }

  private async initializeKafkaSubscriptions(): Promise<void> {
    try {
      await this.kafkaService.subscribeToTransactionStatusUpdates(
        async (event: TransactionStatusUpdatedEvent) => {
          await this.updateTransactionStatus(event.transactionExternalId, event.status);
        }
      );
    } catch (error) {
      this.logger.error('Failed to initialize Kafka subscriptions:', error);
    }
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