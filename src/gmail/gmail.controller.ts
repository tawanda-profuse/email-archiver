import { Controller, Get, Query } from '@nestjs/common';
import { GmailService } from './gmail.service';

@Controller('poll')
export class GmailController {
  constructor(private gmailService: GmailService) {}

  @Get()
  async pollNow(
    @Query('maxResults') maxResults = '10',
    @Query('page') page = '1',
  ) {
    const userEmail = process.env.USER_EMAIL;
    if (!userEmail) {
      throw new Error('USER_EMAIL environment variable is not set');
    }

    const results: unknown = await this.gmailService.pollInbox(
      userEmail,
      parseInt(maxResults),
      parseInt(page),
    );

    return results;
  }
}
