/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Email } from './email.entity'
import { SyncState } from './sync.entity'
import { GmailService } from 'src/gmail/gmail.service'
import { google } from 'googleapis'

@Injectable()
export class EmailService {
  constructor (
    @InjectRepository(Email)
    private readonly emailRepo: Repository<Email>,
    
    @InjectRepository(SyncState)
    private readonly syncRepo: Repository<SyncState>,
    
    private readonly gmailService: GmailService,
  ) {}

  async saveEmail (data: Partial<Email>) {
    const email = this.emailRepo.create(data)
    return this.emailRepo.save(email)
  }

  async isDuplicate (messageId: string) {
    return await this.emailRepo.findOne({ where: { messageId } })
  }

  async processAndStoreEmail (message: any) {
    const messageId = message.id
    if (await this.isDuplicate(messageId)) return

    const headers = Object.fromEntries(
      message.payload.headers.map(h => [h.name.toLowerCase(), h.value]),
    )

    const body = this.extractEmailBody(message.payload)
    const attachments = await this.extractAttachments(message)

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
    }

    return this.emailRepo.save(email)
  }

  extractEmailBody (payload: any): string {
    if (payload.parts) {
      const part = payload.parts.find(
        p => p.mimeType === 'text/html' || p.mimeType === 'text/plain',
      )
      return Buffer.from(part.body.data, 'base64').toString('utf-8')
    }
    return Buffer.from(payload.body.data || '', 'base64').toString('utf-8')
  }

  async extractAttachments (
    message: any,
  ): Promise<{ name: string; link: string }[]> {
  const attachments: { name: string; link: string }[] = [];

    const parts = message.payload.parts || []
    for (const part of parts) {
      if (part.filename && part.body.attachmentId) {
        const attachment = await this.fetchAttachment(
          message.id,
          part.body.attachmentId,
        )
        const buffer = Buffer.from(attachment.data, 'base64')
        const link = await this.gmailService.uploadToDrive(
          part.filename,
          buffer,
          part.mimeType || 'application/octet-stream',
        )
        attachments.push({ name: part.filename, link })
      }
    }
    return attachments
  }

  async fetchAttachment (messageId: string, attachmentId: string): Promise<any> {
    const gmail = google.gmail({
      version: 'v1',
      auth: this.gmailService.getOAuthClient(),
    })
    const res = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    })
    return res.data
  }

  async getSyncState (userEmail: string): Promise<SyncState | null> {
    return this.syncRepo.findOne({ where: { userEmail } })
  }

  async updateSyncState (userEmail: string, historyId: string) {
    let record = await this.syncRepo.findOne({ where: { userEmail } })
    if (!record) {
      record = this.syncRepo.create({ userEmail, historyId })
    } else {
      record.historyId = historyId
    }
    await this.syncRepo.save(record)
  }
}
