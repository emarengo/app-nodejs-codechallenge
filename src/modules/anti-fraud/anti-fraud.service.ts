import { Injectable, Logger } from '@nestjs/common';
import { KafkaService, TransactionCreatedEvent, TransactionStatusUpdatedEvent } from '../../common/services/kafka.service';

export interface FraudCheckResult {
  isApproved: boolean;
  reason?: string;
  riskScore: number;
}

@Injectable()
export class AntiFraudService {
  private readonly logger = new Logger(AntiFraudService.name);

  constructor(private kafkaService: KafkaService) {
    this.initializeKafkaSubscriptions();
  }

  async processTransaction(transaction: TransactionCreatedEvent): Promise<FraudCheckResult> {
    this.logger.log(`Processing transaction for fraud detection: ${transaction.transactionExternalId}`);

    const fraudCheckResult = await this.performFraudCheck(transaction);

    const statusUpdateEvent: TransactionStatusUpdatedEvent = {
      transactionExternalId: transaction.transactionExternalId,
      status: fraudCheckResult.isApproved ? 'approved' : 'rejected',
      reason: fraudCheckResult.reason,
      updatedAt: new Date().toISOString(),
    };

    try {
      await this.kafkaService.publishTransactionStatusUpdate(statusUpdateEvent);
      this.logger.log(
        `Transaction ${transaction.transactionExternalId} processed: ${statusUpdateEvent.status}`
      );
    } catch (error) {
      this.logger.error('Failed to publish transaction status update:', error);
      throw error;
    }

    return fraudCheckResult;
  }

  private async performFraudCheck(transaction: TransactionCreatedEvent): Promise<FraudCheckResult> {
    let riskScore = 0;
    const reasons: string[] = [];

    // Rule 1: Transactions over 1000 should be rejected (as per requirements)
    if (transaction.value > 1000) {
      this.logger.warn(`High value transaction detected: ${transaction.value} > 1000`);
      return {
        isApproved: false,
        reason: 'Transaction value exceeds maximum allowed amount (1000)',
        riskScore: 100,
      };
    }

    // Rule 2: High value transactions (500-1000) get higher risk score
    if (transaction.value >= 500) {
      riskScore += 30;
      reasons.push('High value transaction');
    }

    // Rule 3: Medium value transactions (100-499) get moderate risk score
    if (transaction.value >= 100 && transaction.value < 500) {
      riskScore += 15;
      reasons.push('Medium value transaction');
    }

    // Rule 4: Check for same account transfer (additional validation)
    if (transaction.accountExternalIdDebit === transaction.accountExternalIdCredit) {
      riskScore += 50;
      reasons.push('Same account debit and credit');
    }

    // Rule 5: Check transaction timing (night transactions are riskier)
    const transactionHour = new Date(transaction.createdAt).getHours();
    if (transactionHour >= 23 || transactionHour <= 5) {
      riskScore += 20;
      reasons.push('Night-time transaction');
    }

    // Rule 6: Weekend transactions have slight risk increase
    const transactionDay = new Date(transaction.createdAt).getDay();
    if (transactionDay === 0 || transactionDay === 6) {
      riskScore += 10;
      reasons.push('Weekend transaction');
    }

    // Decision logic
    const isApproved = riskScore < 70; 

    const result: FraudCheckResult = {
      isApproved,
      reason: isApproved 
        ? 'Transaction approved - low risk score'
        : `Transaction rejected - risk score too high: ${reasons.join(', ')}`,
      riskScore,
    };

    this.logger.log(
      `Fraud check completed for ${transaction.transactionExternalId}: ` +
      `Risk Score: ${riskScore}, Status: ${isApproved ? 'APPROVED' : 'REJECTED'}`
    );

    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

    return result;
  }

  private async initializeKafkaSubscriptions(): Promise<void> {
    try {
      await this.kafkaService.subscribeToTransactionCreated(
        async (event: TransactionCreatedEvent) => {
          await this.processTransaction(event);
        }
      );
      this.logger.log('Subscribed to transaction-created events');
    } catch (error) {
      this.logger.error('Failed to initialize Kafka subscriptions:', error);
    }
  }
} 