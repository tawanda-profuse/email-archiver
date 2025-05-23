import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Welcome to the Email Sync Service! Use /auth/login to start the authentication process.';
  }
}
