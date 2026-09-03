import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { LoggerModule } from './common/logging/logger.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { PlatformModule } from './platform/platform.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule,
    DatabaseModule,
    TerminusModule,
    AuthorizationModule,
    PlatformModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
