import { Module, forwardRef } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { EmailModule } from 'src/email/email.module';
import { ConfigModule } from '@nestjs/config';
import { GmailController } from './gmail.controller';

@Module({
  imports: [
    forwardRef(() => EmailModule), // Handles circular dependency
    ConfigModule,
  ],
  providers: [GmailService],
  controllers: [GmailController],
  exports: [GmailService],
})
export class GmailModule {}
