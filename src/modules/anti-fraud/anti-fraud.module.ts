import { Module } from '@nestjs/common';
import { AntiFraudService } from './anti-fraud.service';
import { KafkaService } from '../../common/services/kafka.service';
import { KafkaConfig } from '../../config/kafka.config';

@Module({
  providers: [AntiFraudService, KafkaService, KafkaConfig],
  exports: [AntiFraudService],
})
export class AntiFraudModule {} 