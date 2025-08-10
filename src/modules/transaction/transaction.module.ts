import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { Transaction } from '../../common/entities/transaction.entity';
import { TransactionType } from '../../common/entities/transaction-type.entity';
import { TransactionStatus } from '../../common/entities/transaction-status.entity';
import { KafkaService } from '../../common/services/kafka.service';
import { KafkaConfig } from '../../config/kafka.config';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Transaction, TransactionType, TransactionStatus])
  ],
  controllers: [TransactionController],
  providers: [TransactionService, KafkaService, KafkaConfig],
  exports: [TransactionService, KafkaService],
})
export class TransactionModule {} 