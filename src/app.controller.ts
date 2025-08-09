import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Service status',
    description: 'Returns basic service information and status'
  })
  @ApiResponse({
    status: 200,
    description: 'Service is running',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        message: { type: 'string', example: 'Yape Transaction Service is running' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
        version: { type: 'string', example: '1.0.0' },
      },
    },
  })
  getServiceInfo() {
    return this.appService.getServiceInfo();
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Health check',
    description: 'Comprehensive health check including database and Kafka connectivity'
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
        uptime: { type: 'number', example: 12345.67 },
        environment: { type: 'string', example: 'development' },
        checks: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'connected' },
            kafka: { type: 'string', example: 'connected' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service is unhealthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'unhealthy' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
        errors: {
          type: 'array',
          items: { type: 'string' },
          example: ['Database connection failed', 'Kafka connection failed'],
        },
      },
    },
  })
  async getHealthCheck() {
    return this.appService.getHealthCheck();
  }

  @Get('metrics')
  @ApiOperation({ 
    summary: 'Service metrics',
    description: 'Basic service metrics for monitoring'
  })
  @ApiResponse({
    status: 200,
    description: 'Service metrics',
    schema: {
      type: 'object',
      properties: {
        uptime: { type: 'number', example: 12345.67 },
        memory: {
          type: 'object',
          properties: {
            used: { type: 'number', example: 52428800 },
            total: { type: 'number', example: 134217728 },
            percentage: { type: 'number', example: 39.06 },
          },
        },
        cpu: {
          type: 'object',
          properties: {
            user: { type: 'number', example: 123456 },
            system: { type: 'number', example: 78901 },
          },
        },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
      },
    },
  })
  getMetrics() {
    return this.appService.getMetrics();
  }
}
