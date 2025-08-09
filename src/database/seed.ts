import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { seedInitialData } from './seeds/initial-data.seeder';
import { Transaction } from '../common/entities/transaction.entity';
import { TransactionType } from '../common/entities/transaction-type.entity';
import { TransactionStatus } from '../common/entities/transaction-status.entity';

config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'yape_transactions',
  entities: [Transaction, TransactionType, TransactionStatus],
  synchronize: true,
});

async function runSeeders() {
  try {
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    console.log('Database connected successfully');

    console.log('Starting database seeding...');
    await seedInitialData(AppDataSource);
    
    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
    console.log('Database connection closed');
  }
}

runSeeders(); 