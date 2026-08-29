import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from "@nestjs/terminus"

@Module({
  imports: [ConfigModule.forRoot(), DatabaseModule, TerminusModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
