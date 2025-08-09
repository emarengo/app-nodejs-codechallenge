import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { Transaction } from '../../common/entities/transaction.entity';
import { TransactionType } from '../../common/entities/transaction-type.entity';
import { TransactionStatus } from '../../common/entities/transaction-status.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, TransactionType, TransactionStatus])
  ],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {} 