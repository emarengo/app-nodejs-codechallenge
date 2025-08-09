import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { KafkaConfig } from '../../config/kafka.config';

export interface TransactionCreatedEvent {
  transactionExternalId: string;
  accountExternalIdDebit: string;
  accountExternalIdCredit: string;
  tranferTypeId: number;
  value: number;
  createdAt: string;
}

export interface TransactionStatusUpdatedEvent {
  transactionExternalId: string;
  status: 'approved' | 'rejected';
  reason?: string;
  updatedAt: string;
}

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor(private kafkaConfig: KafkaConfig) {
    this.kafka = new Kafka(this.kafkaConfig.getKafkaConfig());
    this.producer = this.kafka.producer(this.kafkaConfig.getProducerConfig());
    this.consumer = this.kafka.consumer(this.kafkaConfig.getConsumerConfig());
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      this.logger.log('Kafka producer and consumer connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      this.logger.log('Kafka connections closed');
    } catch (error) {
      this.logger.error('Error disconnecting from Kafka:', error);
    }
  }

  async publishTransactionCreated(event: TransactionCreatedEvent): Promise<void> {
    try {
      await this.producer.send({
        topic: 'transaction-created',
        messages: [
          {
            key: event.transactionExternalId,
            value: JSON.stringify(event),
            headers: {
              eventType: 'TransactionCreated',
              version: '1.0',
              timestamp: new Date().toISOString(),
            },
          },
        ],
      });

      this.logger.log(`Published TransactionCreated event for transaction: ${event.transactionExternalId}`);
    } catch (error) {
      this.logger.error('Failed to publish TransactionCreated event:', error);
      throw error;
    }
  }

  async publishTransactionStatusUpdate(event: TransactionStatusUpdatedEvent): Promise<void> {
    try {
      await this.producer.send({
        topic: 'transaction-status-updated',
        messages: [
          {
            key: event.transactionExternalId,
            value: JSON.stringify(event),
            headers: {
              eventType: 'TransactionStatusUpdated',
              version: '1.0',
              timestamp: new Date().toISOString(),
            },
          },
        ],
      });

      this.logger.log(`Published TransactionStatusUpdated event for transaction: ${event.transactionExternalId} -> ${event.status}`);
    } catch (error) {
      this.logger.error('Failed to publish TransactionStatusUpdated event:', error);
      throw error;
    }
  }

  async subscribeToTransactionCreated(
    callback: (event: TransactionCreatedEvent) => Promise<void>
  ): Promise<void> {
    try {
      await this.consumer.subscribe({ topic: 'transaction-created', fromBeginning: false });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
          try {
            const eventData = JSON.parse(message.value?.toString() || '{}') as TransactionCreatedEvent;
            this.logger.log(`Received TransactionCreated event: ${eventData.transactionExternalId}`);
            
            await callback(eventData);
          } catch (error) {
            this.logger.error('Error processing transaction created event:', error);
            throw error;
          }
        },
      });

      this.logger.log('Subscribed to transaction-created topic');
    } catch (error) {
      this.logger.error('Failed to subscribe to transaction created events:', error);
      throw error;
    }
  }

  async subscribeToTransactionStatusUpdates(
    callback: (event: TransactionStatusUpdatedEvent) => Promise<void>
  ): Promise<void> {
    try {
      await this.consumer.subscribe({ topic: 'transaction-status-updated', fromBeginning: false });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
          try {
            const eventData = JSON.parse(message.value?.toString() || '{}') as TransactionStatusUpdatedEvent;
            this.logger.log(`Received TransactionStatusUpdated event: ${eventData.transactionExternalId} -> ${eventData.status}`);
            
            await callback(eventData);
          } catch (error) {
            this.logger.error('Error processing transaction status update:', error);
            throw error;
          }
        },
      });

      this.logger.log('Subscribed to transaction-status-updated topic');
    } catch (error) {
      this.logger.error('Failed to subscribe to transaction status updates:', error);
      throw error;
    }
  }
} 