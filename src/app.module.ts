/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common'
import { AuthController } from './auth/auth.controller'
import { AuthService } from './auth/auth.service'
import { GmailService } from './gmail/gmail.service'
import { DatabaseModule } from './database/database.module'
import { EmailModule } from './email/email.module'

@Module({
  imports: [DatabaseModule, EmailModule],
  controllers: [AuthController],
  providers: [AuthService, GmailService],
})
export class AppModule {}
