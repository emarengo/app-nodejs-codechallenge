import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly startTime = Date.now();

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  getServiceInfo() {
    return {
      status: 'ok',
      message: 'Yape Transaction Service is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  async getHealthCheck() {
    const checks = {
      database: 'unknown',
      kafka: 'unknown',
    };

    const errors: string[] = [];

    try {
      await this.dataSource.query('SELECT 1');
      checks.database = 'connected';
    } catch (error) {
      checks.database = 'disconnected';
      errors.push('Database connection failed');
      this.logger.error('Database health check failed:', error);
    }

    // For Kafka, we'll do a simple check (in a real implementation, you'd ping Kafka)
    try {
      // Simulate Kafka check - in real implementation, ping Kafka brokers
      if (process.env.KAFKA_BROKER) {
        checks.kafka = 'configured';
      } else {
        checks.kafka = 'not_configured';
        errors.push('Kafka broker not configured');
      }
    } catch (error) {
      checks.kafka = 'error';
      errors.push('Kafka connection failed');
      this.logger.error('Kafka health check failed:', error);
    }

    const isHealthy = errors.length === 0;
    
    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - this.startTime) / 1000,
      environment: process.env.NODE_ENV || 'development',
      checks,
      ...(errors.length > 0 && { errors }),
    };

    if (!isHealthy) {
      this.logger.warn(`Health check failed: ${errors.join(', ')}`);
    }

    return response;
  }

  getMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      uptime: (Date.now() - this.startTime) / 1000,
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100 * 100) / 100,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
    };
  }
}
