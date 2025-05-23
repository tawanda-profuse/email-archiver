/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Email } from './email.entity';
import { SyncState } from './sync.entity';
import { EmailService } from './email.service';

@Module({
  imports: [TypeOrmModule.forFeature([Email, SyncState])],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
