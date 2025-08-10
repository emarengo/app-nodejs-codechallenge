import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { Transaction } from '../../common/entities/transaction.entity';
import { TransactionType } from '../../common/entities/transaction-type.entity';
import { TransactionStatus } from '../../common/entities/transaction-status.entity';
import { KafkaService } from '../../common/services/kafka.service';
import { CreateTransactionDto } from '../../common/dtos/create-transaction.dto';

describe('TransactionService', () => {
  let service: TransactionService;
  let transactionRepository: Repository<Transaction>;
  let transactionTypeRepository: Repository<TransactionType>;
  let transactionStatusRepository: Repository<TransactionStatus>;
  let kafkaService: KafkaService;

  const mockTransactionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockTransactionTypeRepository = {
    findOne: jest.fn(),
  };

  const mockTransactionStatusRepository = {
    findOne: jest.fn(),
  };

  const mockKafkaService = {
    publishTransactionCreated: jest.fn(),
    subscribeToTransactionStatusUpdates: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(TransactionType),
          useValue: mockTransactionTypeRepository,
        },
        {
          provide: getRepositoryToken(TransactionStatus),
          useValue: mockTransactionStatusRepository,
        },
        {
          provide: KafkaService,
          useValue: mockKafkaService,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    transactionRepository = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    transactionTypeRepository = module.get<Repository<TransactionType>>(getRepositoryToken(TransactionType));
    transactionStatusRepository = module.get<Repository<TransactionStatus>>(getRepositoryToken(TransactionStatus));
    kafkaService = module.get<KafkaService>(KafkaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTransaction', () => {
    const createTransactionDto: CreateTransactionDto = {
      accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
      accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
      tranferTypeId: 1,
      value: 100.50,
    };

    const mockTransactionType = {
      id: 1,
      name: 'Transfer',
      description: 'Money transfer',
      isActive: true,
    };

    const mockPendingStatus = {
      id: 1,
      name: 'pending',
      description: 'Transaction pending',
      isActive: true,
    };

    const mockTransaction = {
      transactionExternalId: '123e4567-e89b-12d3-a456-426614174000',
      accountExternalIdDebit: createTransactionDto.accountExternalIdDebit,
      accountExternalIdCredit: createTransactionDto.accountExternalIdCredit,
      tranferTypeId: createTransactionDto.tranferTypeId,
      value: createTransactionDto.value,
      transactionStatusId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a transaction successfully', async () => {
      mockTransactionTypeRepository.findOne.mockResolvedValue(mockTransactionType);
      mockTransactionStatusRepository.findOne.mockResolvedValue(mockPendingStatus);
      mockTransactionRepository.create.mockReturnValue(mockTransaction);
      mockTransactionRepository.save.mockResolvedValue(mockTransaction);
      mockKafkaService.publishTransactionCreated.mockResolvedValue(undefined);

      const result = await service.createTransaction(createTransactionDto);

      expect(transactionTypeRepository.findOne).toHaveBeenCalledWith({
        where: { id: createTransactionDto.tranferTypeId, isActive: true }
      });
      expect(transactionStatusRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'pending' }
      });
      expect(transactionRepository.create).toHaveBeenCalledWith({
        accountExternalIdDebit: createTransactionDto.accountExternalIdDebit,
        accountExternalIdCredit: createTransactionDto.accountExternalIdCredit,
        tranferTypeId: createTransactionDto.tranferTypeId,
        value: createTransactionDto.value,
        transactionStatusId: mockPendingStatus.id,
      });
      expect(transactionRepository.save).toHaveBeenCalledWith(mockTransaction);
      expect(kafkaService.publishTransactionCreated).toHaveBeenCalled();

      expect(result).toEqual({
        transactionExternalId: mockTransaction.transactionExternalId,
        transactionType: { name: mockTransactionType.name },
        transactionStatus: { name: mockPendingStatus.name },
        value: mockTransaction.value,
        createdAt: mockTransaction.createdAt,
      });
    });

    it('should throw BadRequestException when debit and credit accounts are the same', async () => {
      const invalidDto = {
        ...createTransactionDto,
        accountExternalIdCredit: createTransactionDto.accountExternalIdDebit,
      };

      await expect(service.createTransaction(invalidDto)).rejects.toThrow(
        new BadRequestException('Debit and credit accounts cannot be the same')
      );
    });

    it('should throw NotFoundException when transaction type is not found', async () => {
      mockTransactionTypeRepository.findOne.mockResolvedValue(null);

      await expect(service.createTransaction(createTransactionDto)).rejects.toThrow(
        new NotFoundException(`Transaction type with ID ${createTransactionDto.tranferTypeId} not found`)
      );
    });

    it('should throw Error when pending status is not found', async () => {
      mockTransactionTypeRepository.findOne.mockResolvedValue(mockTransactionType);
      mockTransactionStatusRepository.findOne.mockResolvedValue(null);

      await expect(service.createTransaction(createTransactionDto)).rejects.toThrow(
        'Pending status not found in database'
      );
    });
  });

  describe('getTransactionById', () => {
    const transactionId = '123e4567-e89b-12d3-a456-426614174000';

    const mockTransactionWithRelations = {
      transactionExternalId: transactionId,
      accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
      accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
      tranferTypeId: 1,
      value: 100.50,
      transactionStatusId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactionType: {
        id: 1,
        name: 'Transfer',
        description: 'Money transfer',
        isActive: true,
      },
      transactionStatus: {
        id: 1,
        name: 'pending',
        description: 'Transaction pending',
        isActive: true,
      },
    };

    it('should return transaction by ID', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(mockTransactionWithRelations);

      const result = await service.getTransactionById(transactionId);

      expect(transactionRepository.findOne).toHaveBeenCalledWith({
        where: { transactionExternalId: transactionId },
        relations: ['transactionType', 'transactionStatus'],
      });

      expect(result).toEqual({
        transactionExternalId: mockTransactionWithRelations.transactionExternalId,
        transactionType: { name: mockTransactionWithRelations.transactionType.name },
        transactionStatus: { name: mockTransactionWithRelations.transactionStatus.name },
        value: mockTransactionWithRelations.value,
        createdAt: mockTransactionWithRelations.createdAt,
      });
    });

    it('should throw NotFoundException when transaction is not found', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(null);

      await expect(service.getTransactionById(transactionId)).rejects.toThrow(
        new NotFoundException(`Transaction with ID ${transactionId} not found`)
      );
    });
  });

  describe('updateTransactionStatus', () => {
    const transactionId = '123e4567-e89b-12d3-a456-426614174000';

    const mockTransaction = {
      transactionExternalId: transactionId,
      accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
      accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
      tranferTypeId: 1,
      value: 100.50,
      transactionStatusId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockApprovedStatus = {
      id: 2,
      name: 'approved',
      description: 'Transaction approved',
      isActive: true,
    };

    it('should update transaction status successfully', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(mockTransaction);
      mockTransactionStatusRepository.findOne.mockResolvedValue(mockApprovedStatus);
      mockTransactionRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateTransactionStatus(transactionId, 'approved');

      expect(transactionRepository.findOne).toHaveBeenCalledWith({
        where: { transactionExternalId: transactionId }
      });
      expect(transactionStatusRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'approved' }
      });
      expect(transactionRepository.update).toHaveBeenCalledWith(
        { transactionExternalId: transactionId },
        { transactionStatusId: mockApprovedStatus.id }
      );
    });

    it('should throw NotFoundException when transaction is not found', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(null);

      await expect(service.updateTransactionStatus(transactionId, 'approved')).rejects.toThrow(
        new NotFoundException(`Transaction with ID ${transactionId} not found`)
      );
    });

    it('should throw Error when status is not found', async () => {
      mockTransactionRepository.findOne.mockResolvedValue(mockTransaction);
      mockTransactionStatusRepository.findOne.mockResolvedValue(null);

      await expect(service.updateTransactionStatus(transactionId, 'approved')).rejects.toThrow(
        'Status approved not found in database'
      );
    });
  });
}); 