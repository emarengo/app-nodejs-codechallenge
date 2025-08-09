import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseConfig } from './config/database.config';
import { TransactionModule } from './modules/transaction/transaction.module';
import { AntiFraudModule } from './modules/anti-fraud/anti-fraud.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),
    TransactionModule,
    AntiFraudModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
