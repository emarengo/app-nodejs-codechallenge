import { Test, TestingModule } from '@nestjs/testing';
import { AntiFraudService } from './anti-fraud.service';
import { KafkaService, TransactionCreatedEvent } from '../../common/services/kafka.service';

describe('AntiFraudService', () => {
  let service: AntiFraudService;
  let kafkaService: KafkaService;

  const mockKafkaService = {
    publishTransactionStatusUpdate: jest.fn(),
    subscribeToTransactionCreated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AntiFraudService,
        {
          provide: KafkaService,
          useValue: mockKafkaService,
        },
      ],
    }).compile();

    service = module.get<AntiFraudService>(AntiFraudService);
    kafkaService = module.get<KafkaService>(KafkaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processTransaction', () => {
    const baseTransaction: TransactionCreatedEvent = {
      transactionExternalId: '123e4567-e89b-12d3-a456-426614174000',
      accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
      accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
      tranferTypeId: 1,
      value: 50,
      createdAt: new Date('2024-01-15T14:30:00.000Z').toISOString(),
    };

    it('should approve transaction with low value (< 100)', async () => {
      const transaction = { ...baseTransaction, value: 50 };
      mockKafkaService.publishTransactionStatusUpdate.mockResolvedValue(undefined);

      const result = await service.processTransaction(transaction);

      expect(result.isApproved).toBe(true);
      expect(result.riskScore).toBe(0);
      expect(result.reason).toBe('Transaction approved - low risk score');
      expect(kafkaService.publishTransactionStatusUpdate).toHaveBeenCalledWith({
        transactionExternalId: transaction.transactionExternalId,
        status: 'approved',
        reason: result.reason,
        timestamp: expect.any(String),
      });
    });

    it('should reject transaction with high value (> 1000)', async () => {
      const transaction = { ...baseTransaction, value: 1500 };
      mockKafkaService.publishTransactionStatusUpdate.mockResolvedValue(undefined);

      const result = await service.processTransaction(transaction);

      expect(result.isApproved).toBe(false);
      expect(result.riskScore).toBe(100);
      expect(result.reason).toBe('Transaction value exceeds maximum allowed amount (1000)');
      expect(kafkaService.publishTransactionStatusUpdate).toHaveBeenCalledWith({
        transactionExternalId: transaction.transactionExternalId,
        status: 'rejected',
        reason: result.reason,
        timestamp: expect.any(String),
      });
    });

    it('should reject transaction between same accounts', async () => {
      const transaction = {
        ...baseTransaction,
        accountExternalIdCredit: baseTransaction.accountExternalIdDebit,
        value: 500,
        createdAt: new Date('2024-01-14T14:30:00.000Z').toISOString(),
      };
      mockKafkaService.publishTransactionStatusUpdate.mockResolvedValue(undefined);

      const result = await service.processTransaction(transaction);

      expect(result.isApproved).toBe(false);
      expect(result.riskScore).toBeGreaterThanOrEqual(70);
      expect(result.reason).toContain('Same account debit and credit');
      expect(kafkaService.publishTransactionStatusUpdate).toHaveBeenCalledWith({
        transactionExternalId: transaction.transactionExternalId,
        status: 'rejected',
        reason: result.reason,
        timestamp: expect.any(String),
      });
    });

    it('should apply higher risk score for high value transactions (500-1000)', async () => {
      const transaction = { ...baseTransaction, value: 800 };
      mockKafkaService.publishTransactionStatusUpdate.mockResolvedValue(undefined);

      const result = await service.processTransaction(transaction);

      expect(result.isApproved).toBe(true);
      expect(result.riskScore).toBe(30);
      expect(result.reason).toBe('Transaction approved - low risk score');
    });

    it('should apply risk for medium value transactions (100-499)', async () => {
      const transaction = { ...baseTransaction, value: 300 };
      mockKafkaService.publishTransactionStatusUpdate.mockResolvedValue(undefined);

      const result = await service.processTransaction(transaction);

      expect(result.isApproved).toBe(true);
      expect(result.riskScore).toBe(15);
      expect(result.reason).toBe('Transaction approved - low risk score');
    });

    it('should apply night time risk factor', async () => {
      const nightTime = new Date('2024-01-15T02:00:00.000Z');
      
      const transaction = {
        ...baseTransaction,
        value: 500,
        createdAt: nightTime.toISOString(),
      };
      mockKafkaService.publishTransactionStatusUpdate.mockResolvedValue(undefined);

      const result = await service.processTransaction(transaction);

      expect(result.isApproved).toBe(true);
      expect(result.riskScore).toBe(40);
      expect(result.reason).toBe('Transaction approved - low risk score');
    });

    it('should apply weekend risk factor', async () => {
      const sunday = new Date('2024-01-14T14:30:00.000Z');
      
      const transaction = {
        ...baseTransaction,
        value: 500,
        createdAt: sunday.toISOString(),
      };
      mockKafkaService.publishTransactionStatusUpdate.mockResolvedValue(undefined);

      const result = await service.processTransaction(transaction);

      expect(result.isApproved).toBe(true);
      expect(result.riskScore).toBe(40);
      expect(result.reason).toBe('Transaction approved - low risk score');
    });

    it('should handle Kafka publish errors gracefully', async () => {
      const transaction = { ...baseTransaction, value: 500 };
      const kafkaError = new Error('Kafka connection failed');
      mockKafkaService.publishTransactionStatusUpdate.mockRejectedValue(kafkaError);

      await expect(service.processTransaction(transaction)).rejects.toThrow(kafkaError);
    });
  });

  describe('performFraudCheck', () => {
    it('should calculate risk score correctly for normal transaction', async () => {
      const transaction: TransactionCreatedEvent = {
        transactionExternalId: '123e4567-e89b-12d3-a456-426614174000',
        accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
        tranferTypeId: 1,
        value: 300,
        createdAt: new Date('2024-01-15T14:30:00.000Z').toISOString(),
      };

      const result = await (service as any).performFraudCheck(transaction);

      expect(result).toHaveProperty('isApproved');
      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('reason');
      expect(typeof result.isApproved).toBe('boolean');
      expect(typeof result.riskScore).toBe('number');
      expect(typeof result.reason).toBe('string');
      expect(result.riskScore).toBe(15);
    });

    it('should reject immediately for values over 1000', async () => {
      const transaction: TransactionCreatedEvent = {
        transactionExternalId: '123e4567-e89b-12d3-a456-426614174000',
        accountExternalIdDebit: '550e8400-e29b-41d4-a716-446655440000',
        accountExternalIdCredit: '550e8400-e29b-41d4-a716-446655440001',
        tranferTypeId: 1,
        value: 2000,
        createdAt: new Date('2024-01-15T14:30:00.000Z').toISOString(),
      };

      const result = await (service as any).performFraudCheck(transaction);

      expect(result.isApproved).toBe(false);
      expect(result.reason).toBe('Transaction value exceeds maximum allowed amount (1000)');
      expect(result.riskScore).toBe(100);
    });

    it('should reject same account transfers', async () => {
      const sameAccount = '550e8400-e29b-41d4-a716-446655440000';
      const transaction: TransactionCreatedEvent = {
        transactionExternalId: '123e4567-e89b-12d3-a456-426614174000',
        accountExternalIdDebit: sameAccount,
        accountExternalIdCredit: sameAccount,
        tranferTypeId: 1,
        value: 500,
        createdAt: new Date('2024-01-14T14:30:00.000Z').toISOString(),
      };

      const result = await (service as any).performFraudCheck(transaction);

      expect(result.isApproved).toBe(false);
      expect(result.reason).toContain('Same account debit and credit');
      expect(result.riskScore).toBeGreaterThanOrEqual(70);
    });
  });
}); 