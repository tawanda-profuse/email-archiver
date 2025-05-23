/* eslint-disable prettier/prettier */
import { Controller, Get, Query, Res } from '@nestjs/common'
import { AuthService } from './auth.service'
import { Response } from 'express'

@Controller('auth')
export class AuthController {
  constructor (private readonly authService: AuthService) {}

  @Get('login')
  login (@Res() res: Response) {
    const url = this.authService.getAuthUrl()
    return res.redirect(url)
  }

  @Get('callback')
  async callback (@Query('code') code: string, @Res() res: Response) {
    const tokens = await this.authService.getTokens(code)
    // Store tokens securely in DB (not shown here)
    return res.json(tokens)
  }
}
