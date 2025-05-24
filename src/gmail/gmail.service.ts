import { gmail_v1, google } from 'googleapis';
import { forwardRef, Inject, Injectable, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { EmailService } from 'src/email/email.service';
import { Readable } from 'typeorm/platform/PlatformTools';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';

@Injectable()
export class GmailService {
  private oAuth2Client: OAuth2Client;
  private readonly logger = new Logger(GmailService.name);

  constructor(
    @Inject(forwardRef(() => EmailService))
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    this.oAuth2Client = new google.auth.OAuth2(
      configService.get('GOOGLE_CLIENT_ID'),
      configService.get('GOOGLE_CLIENT_SECRET'),
      configService.get('REDIRECT_URI'),
    );

    // Load tokens here or from DB/session securely
    this.oAuth2Client.setCredentials({
      refresh_token: configService.get('GOOGLE_REFRESH_TOKEN'),
      access_token: configService.get('GOOGLE_ACCESS_TOKEN'),
    });
  }

  getOAuthClient(): OAuth2Client {
    return this.oAuth2Client;
  }

  async getProfile(auth: OAuth2Client) {
    const gmail = google.gmail({ version: 'v1', auth });
    const res = await gmail.users.getProfile({ userId: 'me' });
    return res.data;
  }

  async pollInbox(
    userEmail: string,
    maxResults = 10,
    page = 1,
  ): Promise<
    {
      id: string;
      subject: string;
      from: string;
      date: string;
      isFresh: boolean;
    }[]
  > {
    const gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });

    const syncState = await this.emailService.getSyncState(userEmail);
    const startHistoryId = syncState?.historyId;
    const now = Date.now();

    let messages: gmail_v1.Schema$Message[] = [];
    const fallbackMessages: gmail_v1.Schema$Message[] = [];

    // Fetch new messages via History API
    if (startHistoryId) {
      const history = await gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded'],
      });

      messages = history.data.history?.flatMap((h) => h.messages || []) || [];

      // Fallback to recent inbox
      const fallback = await gmail.users.messages.list({
        userId: 'me',
        q: 'in:inbox',
        maxResults: 100,
      });
      fallbackMessages.push(...(fallback.data.messages || []));

      if (history.data.historyId) {
        await this.emailService.updateSyncState(
          userEmail,
          history.data.historyId,
        );
      }
    } else {
      const recent = await gmail.users.messages.list({
        userId: 'me',
        q: 'in:inbox',
        maxResults: 100,
      });

      messages = recent.data.messages || [];

      const profile = await gmail.users.getProfile({ userId: 'me' });
      if (profile.data.historyId) {
        await this.emailService.updateSyncState(
          userEmail,
          profile.data.historyId,
        );
      }
    }

    // Merge and deduplicate
    const allMessageIds = new Set([
      ...messages.map((m) => m.id),
      ...fallbackMessages.map((m) => m.id),
    ]);

    const uniqueMessageIds = Array.from(allMessageIds);

    // Apply pagination
    const startIndex = (page - 1) * maxResults;
    const pagedIds = uniqueMessageIds.slice(
      startIndex,
      startIndex + maxResults,
    );

    const enrichedMessages: {
      id: string;
      subject: string;
      from: string;
      date: string;
      isFresh: boolean;
    }[] = [];

    let freshCount = 0;

    for (const id of pagedIds) {
      if (typeof id !== 'string') {
        continue;
      }
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: id,
        format: 'full',
      });

      const { data } = fullMessage;

      if (
        typeof data.id === 'string' &&
        typeof data.threadId === 'string' &&
        typeof data.internalDate === 'string' &&
        data.payload
      ) {
        await this.emailService.processAndStoreEmail({
          id: data.id,
          threadId: data.threadId,
          payload: data.payload,
          internalDate: data.internalDate,
        });

        const headers = data.payload.headers || [];
        const subject = headers.find((h) => h.name === 'Subject')?.value || '';
        const from = headers.find((h) => h.name === 'From')?.value || '';
        const date = headers.find((h) => h.name === 'Date')?.value || '';

        const ageMs = now - parseInt(data.internalDate);
        const isFresh = ageMs <= 5 * 60 * 1000;

        if (isFresh) freshCount++;

        enrichedMessages.push({
          id: data.id,
          subject,
          from,
          date,
          isFresh,
        });
      }
    }

    console.log(
      `Fetched ${enrichedMessages.length} messages for ${userEmail}. ${freshCount} fresh.`,
    );

    return enrichedMessages;
  }

  async uploadToDrive(
    filename: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const drive = google.drive({ version: 'v3', auth: this.getOAuthClient() });

    const res = await drive.files.create({
      requestBody: {
        name: filename,
        mimeType,
      },
      media: {
        mimeType,
        body: Readable.from(fileBuffer),
      },
      fields: 'id, webViewLink, webContentLink',
    });

    return res.data.webViewLink || res.data.webContentLink || '';
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron(
    @Query('maxResults') maxResults = '10',
    @Query('page') page = '1',
  ) {
    const userEmail = process.env.USER_EMAIL;
    if (!userEmail) {
      this.logger.error('USER_EMAIL environment variable is not set');
      return;
    }
    this.logger.log(`Starting polling for ${userEmail}`);
    const messages = await this.pollInbox(
      userEmail,
      parseInt(maxResults),
      parseInt(page),
    );

    return {
      status: 'Polling complete',
      messageCount: messages.length,
      messages, // will contain minimal metadata; can be enhanced
    };
  }
}
