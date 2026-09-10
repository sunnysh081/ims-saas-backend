import { MiddlewareConsumer, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { HttpDebugInterceptor } from './common/logging/http-debug.interceptor';
import { LoggerModule } from './common/logging/logger.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { AcademicModule } from './academic/academic.module';
import { InstituteModule } from './institute/institute.module';
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
    InstituteModule,
    AcademicModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpDebugInterceptor,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
