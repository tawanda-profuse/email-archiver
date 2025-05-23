/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common'
import { google } from 'googleapis'
import * as dotenv from 'dotenv'
dotenv.config()

@Injectable()
export class AuthService {
  private oAuth2Client 

  constructor () {
    this.oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.REDIRECT_URI,
    )
  }

  getAuthUrl (): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/drive.file',
    ]

    return this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    })
  }

  async getTokens (code: string) {
    const { tokens } = await this.oAuth2Client.getToken(code)
    return tokens
  }

  getOAuthClient () {
    return this.oAuth2Client
  }

  setCredentials (tokens: any) {
    this.oAuth2Client.setCredentials(tokens)
  }
}
