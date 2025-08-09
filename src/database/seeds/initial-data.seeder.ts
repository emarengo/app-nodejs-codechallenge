import { DataSource } from 'typeorm';
import { TransactionType } from '../../common/entities/transaction-type.entity';
import { TransactionStatus } from '../../common/entities/transaction-status.entity';

export async function seedInitialData(dataSource: DataSource): Promise<void> {
  const transactionTypeRepository = dataSource.getRepository(TransactionType);
  const transactionStatusRepository = dataSource.getRepository(TransactionStatus);

  const transactionTypes = [
    {
      id: 1,
      name: 'Transfer',
      description: 'Standard money transfer between accounts',
      isActive: true,
    },
    {
      id: 2,
      name: 'Payment',
      description: 'Payment for goods or services',
      isActive: true,
    },
    {
      id: 3,
      name: 'Refund',
      description: 'Refund transaction',
      isActive: true,
    },
  ];

  const transactionStatuses = [
    {
      id: 1,
      name: 'pending',
      description: 'Transaction is pending anti-fraud validation',
      isActive: true,
    },
    {
      id: 2,
      name: 'approved',
      description: 'Transaction approved by anti-fraud system',
      isActive: true,
    },
    {
      id: 3,
      name: 'rejected',
      description: 'Transaction rejected by anti-fraud system',
      isActive: true,
    },
  ];

  for (const typeData of transactionTypes) {
    const existingType = await transactionTypeRepository.findOne({
      where: { id: typeData.id }
    });
    
    if (!existingType) {
      const transactionType = transactionTypeRepository.create(typeData);
      await transactionTypeRepository.save(transactionType);
      console.log(`Created transaction type: ${typeData.name}`);
    }
  }

  for (const statusData of transactionStatuses) {
    const existingStatus = await transactionStatusRepository.findOne({
      where: { id: statusData.id }
    });
    
    if (!existingStatus) {
      const transactionStatus = transactionStatusRepository.create(statusData);
      await transactionStatusRepository.save(transactionStatus);
      console.log(`Created transaction status: ${statusData.name}`);
    }
  }

  console.log('Initial data seeding completed');
} 