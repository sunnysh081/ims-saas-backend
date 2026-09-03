import { Injectable, NestMiddleware } from '@nestjs/common';

import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

import { requestContext } from '../context/request.context';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incomingRequestId = req.header('x-request-id');

    /**
     * Only accept reasonably sized IDs.
     *
     * This prevents someone from injecting a huge
     * value into logs.
     */
    const requestId =
      incomingRequestId && /^[a-zA-Z0-9._:-]{1,128}$/.test(incomingRequestId)
        ? incomingRequestId
        : randomUUID();

    res.setHeader('X-Request-ID', requestId);

    const context = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      startTime: Date.now(),
    };

    requestContext.run(context, () => next());
  }
}
