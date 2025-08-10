import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global Interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TimeoutInterceptor(30000) // 30 seconds timeout
  );

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: false,
      stopAtFirstError: false,
      validateCustomDecorators: true,
    }),
  );

  // CORS Configuration
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://yape.app']
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  });

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Yape Transaction Service')
    .setDescription(`
      **Anti-fraud transaction processing microservice for Yape code challenge**
      
      This service provides secure transaction processing with real-time fraud detection capabilities.
      
      ## Features
      - Transaction creation with automatic fraud validation
      - Real-time status updates via Kafka messaging
      - Comprehensive input validation and error handling
      - Request/response logging and monitoring
      - Swagger documentation with examples
      
      ## Business Rules
      - Transactions over $1000 are automatically rejected
      - All transactions start with 'pending' status
      - Anti-fraud service processes transactions asynchronously
      - Status updates: pending → approved/rejected
      
      ## Error Handling
      All errors include correlation IDs for tracking and debugging.
    `)
    .setVersion('1.0')
    .addTag('Transactions', 'Financial transaction operations')
    .addTag('Health', 'Service health and monitoring')
    .setContact(
      'Engineering Team',
      'https://yape.com.pe',
      'engineering@yape.com.pe'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Yape Transaction API',
    customfavIcon: '/favicon.ico',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api-docs`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
