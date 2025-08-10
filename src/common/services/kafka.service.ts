import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer, Producer, EachMessagePayload } from 'kafkajs';
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
  timestamp: string;
}

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private transactionCreatedConsumer: Consumer;
  private transactionStatusConsumer: Consumer;

  constructor(private readonly kafkaConfig: KafkaConfig) {
    this.kafka = new Kafka(this.kafkaConfig.getKafkaConfig());
    this.producer = this.kafka.producer(this.kafkaConfig.getProducerConfig());
    this.transactionCreatedConsumer = this.kafka.consumer({
      ...this.kafkaConfig.getConsumerConfig(),
      groupId: 'anti-fraud-group',
    });
    this.transactionStatusConsumer = this.kafka.consumer({
      ...this.kafkaConfig.getConsumerConfig(),
      groupId: 'transaction-group',
    });
  }

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    try {
      await Promise.all([
        this.producer.connect(),
        this.transactionCreatedConsumer.connect(),
        this.transactionStatusConsumer.connect(),
      ]);
      this.logger.log('Kafka producer and consumers connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await Promise.all([
        this.producer.disconnect(),
        this.transactionCreatedConsumer.disconnect(),
        this.transactionStatusConsumer.disconnect(),
      ]);
      this.logger.log('Kafka connections closed');
    } catch (error) {
      this.logger.error('Failed to disconnect from Kafka:', error);
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

      this.logger.log(`Published TransactionCreated event for: ${event.transactionExternalId}`);
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
      await this.transactionCreatedConsumer.subscribe({ topic: 'transaction-created', fromBeginning: false });

      await this.transactionCreatedConsumer.run({
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
      await this.transactionStatusConsumer.subscribe({ topic: 'transaction-status-updated', fromBeginning: false });

      await this.transactionStatusConsumer.run({
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