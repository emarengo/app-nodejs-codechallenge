import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);
  private readonly timeoutMs: number;

  constructor(timeoutMs: number = 30000) { // Default 30 seconds
    this.timeoutMs = timeoutMs;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError(err => {
        if (err instanceof TimeoutError) {
          this.logger.warn(
            `Request timeout: ${method} ${url} exceeded ${this.timeoutMs}ms`
          );
          return throwError(() => new RequestTimeoutException(
            `Request timeout. The operation took longer than ${this.timeoutMs}ms to complete.`
          ));
        }
        return throwError(() => err);
      }),
    );
  }
} 