import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { TransactionType } from './transaction-type.entity';
import { TransactionStatus } from './transaction-status.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  transactionExternalId: string;

  @Column({ type: 'uuid' })
  accountExternalIdDebit: string;

  @Column({ type: 'uuid' })
  accountExternalIdCredit: string;

  @Column({ type: 'int' })
  tranferTypeId: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  value: number;

  @ManyToOne(() => TransactionType, transactionType => transactionType.transactions)
  @JoinColumn({ name: 'tranferTypeId', referencedColumnName: 'id' })
  transactionType: TransactionType;

  @ManyToOne(() => TransactionStatus, transactionStatus => transactionStatus.transactions)
  @JoinColumn({ name: 'transaction_status_id' })
  transactionStatus: TransactionStatus;

  @Column({ type: 'int', name: 'transaction_status_id', default: 1 })
  transactionStatusId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 