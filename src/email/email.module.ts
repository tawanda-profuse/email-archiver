import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Email } from './email.entity';
import { SyncState } from './sync.entity';
import { EmailService } from './email.service';
import { GmailModule } from 'src/gmail/gmail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Email, SyncState]),
    forwardRef(() => GmailModule),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
