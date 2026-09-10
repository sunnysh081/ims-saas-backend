import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import { requestContext } from '../context/request.context';
import { AppLogger } from './logger.service';

const isProduction = process.env.NODE_ENV === 'production';

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',

        autoLogging: false,

        customProps: () => {
          const context = requestContext.getStore();

          return {
            requestId: context?.requestId,
          };
        },

        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["set-cookie"]',

            '*.password',
            '*.passwordHash',
            '*.accessToken',
            '*.refreshToken',
            '*.token',
            '*.secret',
          ],
          censor: '[REDACTED]',
        },

        ...(isProduction
          ? {}
          : {
              transport: {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: false,
                  translateTime: 'yyyy-mm-dd HH:MM:ss.l',
                  ignore: 'pid,hostname',
                },
              },
            }),
      },
    }),
  ],

  providers: [AppLogger],

  exports: [AppLogger],
})
export class LoggerModule {}
