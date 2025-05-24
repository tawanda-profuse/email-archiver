import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { GmailService } from './gmail/gmail.service';
import { DatabaseModule } from './database/database.module';
import { EmailModule } from './email/email.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [DatabaseModule, EmailModule, ScheduleModule.forRoot()],
  controllers: [AuthController, AppController],
  providers: [AuthService, GmailService, AppService],
})
export class AppModule {}
