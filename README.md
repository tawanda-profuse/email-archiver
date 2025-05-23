# Email Archiving with OAuth Integration

This application allows a business user to automatically store all their incoming emails from a G-Suite inbox inside a database in order to maintain a complete record of all communications for compliance and reference.

## Project setup

Create a .env file or configure the projects environment variables as follows:

```.env
USER_EMAIL='<your-email>'
GOOGLE_CLIENT_ID='<your-google-client-id>'
GOOGLE_CLIENT_SECRET='<your-google-client-secret>'
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

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

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


