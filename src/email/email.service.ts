import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Email } from './email.entity';
import { SyncState } from './sync.entity';
import { GmailService } from 'src/gmail/gmail.service';
import { google } from 'googleapis';

type GmailAttachment = {
  filename: string;
  mimeType: string;
  size: number;
  data?: string; // base64-encoded content, optional
  attachmentId: string;
};

@Injectable()
export class EmailService {
  constructor(
    @InjectRepository(Email)
    private readonly emailRepo: Repository<Email>,

    @InjectRepository(SyncState)
    private readonly syncRepo: Repository<SyncState>,

    @Inject(forwardRef(() => GmailService))
    private readonly gmailService: GmailService,
  ) {}

  async saveEmail(data: Partial<Email>) {
    const email = this.emailRepo.create(data);
    return this.emailRepo.save(email);
  }

  async isDuplicate(messageId: string) {
    return await this.emailRepo.findOne({ where: { messageId } });
  }

  async processAndStoreEmail(message: {
    id: string;
    threadId: string;
    payload: any;
    internalDate: string;
  }) {
    const messageId = message.id;
    if (await this.isDuplicate(messageId)) return;

    const headers = Object.fromEntries(
      message.payload.headers.map((h) => [h.name.toLowerCase(), h.value]),
    );

    const body = this.extractEmailBody(message.payload);
    const attachments = this.extractAttachments(message.payload);

    const email = {
      messageId,
      threadId: message.threadId,
      subject: headers['subject'],
      body,
      sender: headers['from'],
      recipients: headers['to'] || '',
      cc: headers['cc'] || '',
      bcc: headers['bcc'] || '',
      receivedAt: new Date(parseInt(message.internalDate)),
      googleDriveLink: attachments[0]?.link || undefined,
    };

    return this.emailRepo.save(email);
  }

  extractEmailBody(payload: any): string {
    const getBody = (parts: any[]): string | null => {
      for (const part of parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }
      for (const part of parts) {
        if (part.parts) {
          const nested = getBody(part.parts);
          if (nested) return nested;
        }
      }
      return null;
    };

    // Handle simple messages without parts
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    // Handle multipart messages
    if (payload.parts) {
      const body = getBody(payload.parts);
      return body || '';
    }

    return '';
  }

  extractAttachments(payload: any): GmailAttachment[] {
    const attachments: GmailAttachment[] = [];

    const traverseParts = (parts: any[]) => {
      for (const part of parts) {
        // If it's an attachment
        if (
          part.filename &&
          part.filename.length > 0 &&
          part.body?.attachmentId
        ) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size || 0,
            attachmentId: part.body.attachmentId,
            data: part.body.data ?? undefined, // Some attachments may be inline
          });
        }

        // Continue recursion into nested parts
        if (part.parts && part.parts.length > 0) {
          traverseParts(part.parts);
        }
      }
    };

    if (payload.parts && payload.parts.length > 0) {
      traverseParts(payload.parts);
    }

    return attachments;
  }

  async fetchAttachment(messageId: string, attachmentId: string): Promise<any> {
    const gmail = google.gmail({
      version: 'v1',
      auth: this.gmailService.getOAuthClient(),
    });
    const res = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    });
    return res.data;
  }

  async getSyncState(userEmail: string): Promise<SyncState | null> {
    return this.syncRepo.findOne({ where: { userEmail } });
  }

  async updateSyncState(userEmail: string, historyId: string) {
    let record = await this.syncRepo.findOne({ where: { userEmail } });
    if (!record) {
      record = this.syncRepo.create({ userEmail, historyId });
    } else {
      record.historyId = historyId;
    }
    await this.syncRepo.save(record);
  }
}
