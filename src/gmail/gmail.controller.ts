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
    const messages = await this.gmailService.pollInbox(userEmail);

    return {
      status: 'Polling complete',
      messageCount: messages.length,
      messages, // will contain minimal metadata; can be enhanced
    };
  }
}
