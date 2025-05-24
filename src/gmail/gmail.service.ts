import { google, gmail_v1 } from 'googleapis';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { EmailService } from 'src/email/email.service';
import { Readable } from 'typeorm/platform/PlatformTools';
import {Cron, CronExpression} from '@nestjs/schedule';
import {Logger} from '@nestjs/common';

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

  async pollInbox(userEmail: string): Promise<
    {
      id: string;
      subject: string;
      from: string;
      date: string;
      isFresh: boolean; // added to distinguish fresh messages
    }[]
  > {
    const gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });

    const syncState = await this.emailService.getSyncState(userEmail);
    const startHistoryId = syncState?.historyId;
    const now = Date.now();

    let messages: gmail_v1.Schema$Message[] = [];
    const fallbackMessages: gmail_v1.Schema$Message[] = [];

    // 1. Fetch new messages via History API
    if (startHistoryId) {
      const history = await gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded'],
      });

      messages = history.data.history?.flatMap((h) => h.messages || []) || [];

      // 2. Always include recent inbox as fallback
      const fallback = await gmail.users.messages.list({
        userId: 'me',
        q: 'in:inbox',
        maxResults: 10,
      });
      fallbackMessages.push(...(fallback.data.messages || []));

      if (history.data.historyId) {
        await this.emailService.updateSyncState(
          userEmail,
          history.data.historyId,
        );
      }
    } else {
      // 3. First time setup — fallback only
      const recent = await gmail.users.messages.list({
        userId: 'me',
        q: 'in:inbox',
        maxResults: 10,
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

    // 4. Merge and deduplicate message IDs
    const allMessageIds = new Set([
      ...messages.map((m) => m.id),
      ...fallbackMessages.map((m) => m.id),
    ]);

    const allMessages: gmail_v1.Schema$Message[] = Array.from(
      allMessageIds,
    ).map((id) => {
      return { id } as gmail_v1.Schema$Message;
    });

    // 5. Process and enrich messages
    const enrichedMessages: {
      id: string;
      subject: string;
      from: string;
      date: string;
      isFresh: boolean;
    }[] = [];

    let freshCount = 0;

    for (const msg of allMessages) {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
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
      `Fetched ${enrichedMessages.length} total messages for ${userEmail}. ${freshCount} new message(s).`,
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
  async handleCron() {
    const userEmail = process.env.USER_EMAIL;
    if (!userEmail) {
      this.logger.error('USER_EMAIL environment variable is not set');
      return;
    }
    this.logger.log(`Starting polling for ${userEmail}`);
    const messages = await this.pollInbox(userEmail);

    return {
      status: 'Polling complete',
      messageCount: messages.length,
      messages, // will contain minimal metadata; can be enhanced
    };
  }
}
