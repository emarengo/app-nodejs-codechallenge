import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;
  let mockDataSource: Partial<DataSource>;

  beforeEach(async () => {
    mockDataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([{ now: new Date() }]),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('getServiceInfo', () => {
    it('should return service information', () => {
      const result = appController.getServiceInfo();
      
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('message', 'Yape Transaction Service is running');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('environment');
    });
  });

  describe('getHealthCheck', () => {
    it('should return health status', async () => {
      const result = await appController.getHealthCheck();
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('checks');
      expect(result.checks).toHaveProperty('database');
      expect(result.checks).toHaveProperty('kafka');
    });
  });

  describe('getMetrics', () => {
    it('should return system metrics', () => {
      const result = appController.getMetrics();
      
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('cpu');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('nodeVersion');
      expect(result).toHaveProperty('platform');
      expect(result).toHaveProperty('architecture');
      expect(result.memory).toHaveProperty('used');
      expect(result.memory).toHaveProperty('total');
      expect(result.memory).toHaveProperty('percentage');
      expect(result.cpu).toHaveProperty('user');
      expect(result.cpu).toHaveProperty('system');
      expect(typeof result.uptime).toBe('number');
      expect(typeof result.cpu.user).toBe('number');
      expect(typeof result.cpu.system).toBe('number');
    });
  });
});
