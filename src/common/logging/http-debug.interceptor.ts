import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';

import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

const SENSITIVE_KEY =
  /^(authorization|cookie|set-cookie|password|passwordhash|accesstoken|refreshtoken|token|secret)$/i;

function redact(value: unknown, depth = 0): unknown {
  if (value == null || depth > 6) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(entry, depth + 1),
      ]),
    );
  }

  return value;
}

@Injectable()
export class HttpDebugInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (process.env.NODE_ENV === 'production') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const started = Date.now();

    this.logger.log(
      JSON.stringify(
        {
          phase: 'request',
          method: request.method,
          url: request.originalUrl,
          headers: redact(request.headers),
          query: redact(request.query),
          params: redact(request.params),
          body: redact(request.body),
        },
        null,
        2,
      ),
    );

    return next.handle().pipe(
      tap({
        next: (body) => {
          this.logger.log(
            JSON.stringify(
              {
                phase: 'response',
                method: request.method,
                url: request.originalUrl,
                statusCode: response.statusCode,
                durationMs: Date.now() - started,
                headers: redact(response.getHeaders()),
                body: redact(body),
              },
              null,
              2,
            ),
          );
        },
        error: (error: unknown) => {
          this.logger.error(
            JSON.stringify(
              {
                phase: 'response',
                method: request.method,
                url: request.originalUrl,
                statusCode: response.statusCode,
                durationMs: Date.now() - started,
                headers: redact(response.getHeaders()),
                error:
                  error instanceof Error
                    ? { name: error.name, message: error.message }
                    : error,
              },
              null,
              2,
            ),
          );
        },
      }),
    );
  }
}
