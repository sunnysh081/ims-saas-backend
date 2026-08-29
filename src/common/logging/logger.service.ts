import {
    Injectable,
} from '@nestjs/common';

import {
    PinoLogger,
} from 'nestjs-pino';

import {
    getRequestContext,
    getRequestId,
} from '../context/request.context';

@Injectable()
export class AppLogger {
    constructor(
        private readonly logger: PinoLogger,
    ) { }

    private context() {
        const requestContext =
            getRequestContext();

        return {
            requestId:
                requestContext?.requestId,
        };
    }

    info(
        message: string,
        data?: Record<string, unknown>,
    ) {
        this.logger.info(
            {
                ...this.context(),
                ...data,
            },
            message,
        );
    }

    warn(
        message: string,
        data?: Record<string, unknown>,
    ) {
        this.logger.warn(
            {
                ...this.context(),
                ...data,
            },
            message,
        );
    }

    error(
        message: string,
        error?: unknown,
        data?: Record<string, unknown>,
    ) {
        const errorData =
            error instanceof Error
                ? {
                    error: {
                        name: error.name,
                        message: error.message,
                        stack: error.stack,
                    },
                }
                : {
                    error,
                };

        this.logger.error(
            {
                ...this.context(),
                ...data,
                ...errorData,
            },
            message,
        );
    }

    debug(
        message: string,
        data?: Record<string, unknown>,
    ) {
        this.logger.debug(
            {
                ...this.context(),
                ...data,
            },
            message,
        );
    }

    getRequestId() {
        return getRequestId();
    }
}