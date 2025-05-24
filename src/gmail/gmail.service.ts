import { google } from 'googleapis';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class GmailService {
  private oAuth2Client: OAuth2Client;

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

  async pollInbox(userEmail: string) {
    const gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });

    const syncState = await this.emailService.getSyncState(userEmail);
    const startHistoryId = syncState?.historyId;

    // Explicitly type messages as Schema$Message[]
    let messages: import('googleapis').gmail_v1.Schema$Message[] = [];

    if (startHistoryId) {
      // Use history API for incremental sync
      const history = await gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded'],
      });

      messages = history.data.history?.flatMap((h) => h.messages || []) || [];

      // Update historyId only if present
      if (history.data.historyId) {
        await this.emailService.updateSyncState(
          userEmail,
          history.data.historyId,
        );
      }

      console.log(`Synced ${messages.length} new message(s) for ${userEmail}.`);
    } else {
      // Fallback to list most recent 10 messages
      const recentMessagesList = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 10,
      });

      messages = recentMessagesList.data.messages || [];

      console.log(
        `No sync state found. Fetched ${messages.length} most recent message(s) for ${userEmail}.`,
      );

      // Get the latest historyId and save it for next poll
      const profile = await gmail.users.getProfile({ userId: 'me' });
      if (profile.data.historyId) {
        await this.emailService.updateSyncState(
          userEmail,
          profile.data.historyId,
        );
      }
    }

    // Process each message
    for (const msg of messages) {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      });

      if (
        typeof fullMessage.data.id === 'string' &&
        typeof fullMessage.data.threadId === 'string' &&
        typeof fullMessage.data.internalDate === 'string' &&
        fullMessage.data.payload
      ) {
        await this.emailService.processAndStoreEmail({
          id: fullMessage.data.id,
          threadId: fullMessage.data.threadId,
          payload: fullMessage.data.payload,
          internalDate: fullMessage.data.internalDate,
        });
      }
    }
  }

  async uploadToDrive(
    filename: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const drive = google.drive({ version: 'v3', auth: this.oAuth2Client });

    const file = await drive.files.create({
      requestBody: {
        name: filename,
        mimeType,
      },
      media: {
        mimeType,
        body: Buffer.from(buffer),
      },
      fields: 'id,webViewLink',
    });

    return file.data.webViewLink!;
  }
}
