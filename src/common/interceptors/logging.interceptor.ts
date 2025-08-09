import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, body, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';
    const ip = request.ip || 'Unknown';
    
    const correlationId = this.generateCorrelationId();
    
    response.setHeader('X-Correlation-ID', correlationId);

    const startTime = Date.now();

    this.logger.log(
      `Incoming Request [${correlationId}]: ${method} ${url} - IP: ${ip} - UserAgent: ${userAgent}`
    );

    // Log request body for non-GET requests (excluding sensitive data)
    if (method !== 'GET' && body && Object.keys(body).length > 0) {
      const sanitizedBody = this.sanitizeRequestBody(body);
      this.logger.debug(
        `Request Body [${correlationId}]: ${JSON.stringify(sanitizedBody)}`
      );
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          
          this.logger.log(
            `Outgoing Response [${correlationId}]: ${method} ${url} - Status: ${statusCode} - Duration: ${duration}ms`
          );

          // Log response data for debugging (in development only)
          if (process.env.NODE_ENV === 'development' && data) {
            const sanitizedData = this.sanitizeResponseData(data);
            this.logger.debug(
              `Response Data [${correlationId}]: ${JSON.stringify(sanitizedData)}`
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode || 500;
          
          this.logger.error(
            `Error Response [${correlationId}]: ${method} ${url} - Status: ${statusCode} - Duration: ${duration}ms - Error: ${error.message}`
          );
        },
      })
    );
  }

  private generateCorrelationId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private sanitizeRequestBody(body: any): any {
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
    
    if (typeof body !== 'object' || body === null) {
      return body;
    }

    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***HIDDEN***';
      }
    }

    return sanitized;
  }

  private sanitizeResponseData(data: any): any {
    // For large responses, only log a summary
    if (Array.isArray(data) && data.length > 10) {
      return {
        type: 'Array',
        length: data.length,
        sample: data.slice(0, 2),
      };
    }

    // For objects, remove potentially sensitive information
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
      
      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '***HIDDEN***';
        }
      }
      
      return sanitized;
    }

    return data;
  }
} 