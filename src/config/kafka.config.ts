import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KafkaConfig {
  constructor(private configService: ConfigService) {}

  getKafkaConfig() {
    return {
      clientId: this.configService.get<string>('KAFKA_CLIENT_ID') || 'transaction-service',
      brokers: [this.configService.get<string>('KAFKA_BROKER') || 'localhost:9092'],
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    };
  }

  getProducerConfig() {
    return {
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
    };
  }

  getConsumerConfig() {
    return {
      groupId: this.configService.get<string>('KAFKA_GROUP_ID') || 'transaction-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    };
  }
} 