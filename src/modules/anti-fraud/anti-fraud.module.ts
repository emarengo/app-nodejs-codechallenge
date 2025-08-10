import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AntiFraudService } from './anti-fraud.service';
import { KafkaService } from '../../common/services/kafka.service';
import { KafkaConfig } from '../../config/kafka.config';

@Module({
  imports: [ConfigModule],
  providers: [AntiFraudService, KafkaService, KafkaConfig],
  exports: [AntiFraudService],
})
export class AntiFraudModule {} 