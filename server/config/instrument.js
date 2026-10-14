import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      Sentry.mongooseIntegration()
    ],
    tracesSampleRate: 1.0,
  });
}