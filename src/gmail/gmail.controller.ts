/* eslint-disable prettier/prettier */
import { Controller, Get } from '@nestjs/common';
import { GmailService } from './gmail.service';

@Controller('poll')
export class GmailController {
  constructor(private gmailService: GmailService) {}

  @Get()
  async pollNow() {
    const userEmail = process.env.USER_EMAIL;
    if (!userEmail) {
      throw new Error('USER_EMAIL environment variable is not set');
    }
    await this.gmailService.pollInbox(userEmail);
    return { status: 'Polling complete' };
  }
}
