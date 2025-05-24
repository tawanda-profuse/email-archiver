# Email Archiving with OAuth Integration

This application allows a business user to automatically store all their incoming emails from a G-Suite inbox inside a database in order to maintain a complete record of all communications for compliance and reference.

## Project setup

Create a .env file or configure the projects environment variables as follows:

```.env
USER_EMAIL='<your-email>'
GOOGLE_CLIENT_ID='<your-google-client-id>'
GOOGLE_CLIENT_SECRET='<your-google-client-secret>'
GOOGLE_REFRESH_TOKEN=''
REDIRECT_URI=<your-redirect-uri>
DB_HOST='<database-host>'
DB_PORT=<database-port>
DB_USERNAME=<database-username>
DB_PASSWORD='<database-password>'
DB_NAME=<database-name>
```

Install all dependencies with the following command:

```bash
$ npm install
```

## Google OAuth Setup

1. [Go to Google Cloud Console](https://console.cloud.google.com).
2. Enable Gmail API and Google Drive API.
3. Create OAuth 2.0 Client ID.
4. Navigate to **APIs & Services → OAuth consent screen**.
5. Scroll down to the Test users section
6. Click “Add Users”
7. Add the Gmail address you're using to sign in
8. Click Save and Continue

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

After successfully running the application in watch mode, the callback URI produces a JSON response that has a "refresh_token" property. Use this value in the environment for the **GOOGLE_REFRESH_TOKEN** value.

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment


