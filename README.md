# Email Archiving with OAuth Integration

This application allows a business user to automatically store all their incoming emails from a G-Suite inbox inside a database in order to maintain a complete record of all communications for compliance and reference.

## Project setup

Install all dependencies with the following command:

```bash
$ npm install
```

Create a **.env** file in the project root or configure the projects environment variables as follows:

```.env
FRONTEND_URL=http://localhost:5173
USER_EMAIL='<your-email>'
GOOGLE_CLIENT_ID='<your-google-client-id>'
GOOGLE_CLIENT_SECRET='<your-google-client-secret>'
GOOGLE_REFRESH_TOKEN='<your-refresh-token>'
GOOGLE_ACCESS_TOKEN='<your-access-token>'
REDIRECT_URI=<your-redirect-uri>
DB_HOST='<database-host>'
DB_PORT=<database-port>
DB_USERNAME=<database-username>
DB_PASSWORD='<database-password>'
DB_NAME=<database-name>
```

## Postgres Database Setup

1. Create a database using any service that supports Postgres. Some good options are [Supabase](supabase.com) or [Aiven](https://console.aiven.io).
2. Using a local instance of PostgresSQL also works.
3. Acquire the database credentials and update the environment variables for **DB_HOST**, **DB_PORT**, **DB_USERNAME**, **DB_PASSWORD**, and **DB_NAME**.

### Google OAuth Setup

1. [Go to Google Cloud Console](https://console.cloud.google.com).
2. Create a project and name it.
3. Enable **Gmail API** and **Google Drive API**.
4. Create an OAuth 2.0 Client ID and Client Secret.
5. Navigate to **APIs & Services → OAuth consent screen**.
6. Scroll down to the Test users section
7. Click “Add Users”
8. Add the Gmail address you're using to sign in (only emails added to the list will work).
9. Click Save and Continue

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

After successfully running the application in watch mode:

1. Make a GET request to the `/auth/login` endpoint.
2. This returns a response at `/auth/callback` with a **code** value as a URL parameter.
3. The JSON response provides an object including a "refresh_token" and "access_token" property. Use these values to update the environment variables for the **GOOGLE_REFRESH_TOKEN** and **GOOGLE_ACCESS_TOKEN** values.

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

The backend can be deployed with Google Cloud Run and setting up a [Dockerfile](/Dockerfile) similar to the one in this repository. The public endpoint provided by the Google Cloud Runner can be used together with the Google Cloud Scheduler API or Google Push Notifications.

## Key Criteria

1. System authenticates with Gmail API using OAuth without requiring password storage - **authService.getAuthUrl()** ([file](/src/auth/auth.controller.ts)).
2. All incoming emails are captured and stored in PostgreSQL within 5 minutes of receipt - **handleCron()** ([file](/src/gmail/gmail.service.ts)).
3. Email attachments are uploaded to Google Drive with links stored in the database - **uploadToDrive()** ([file](/src/gmail/gmail.service.ts)).
4. Email metadata (sender, recipients, timestamps, headers) is properly captured - **processAndStoreEmail()** ([file](/src/email/email.service.ts)).
5. Email threading information is preserved - **processAndStoreEmail()** ([file](/src/email/email.service.ts)).
6. System handles emails with multiple recipients and CC/BCC fields correctly - **recipients** ([file](/src/email//email.entity.ts)).
7. Duplicate emails are identified and not stored multiple times - **isDuplicate()** ([file](/src/email/email.service.ts)).
8. Handle pagination for large mailboxes - **pollInbox()** ([file](/src/gmail/gmail.service.ts)).
