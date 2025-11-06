import * as Sentry from "@sentry/nextjs";

console.log("[Sentry] server config loaded");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.2,
  environment: process.env.VERCEL_ENV || "local",
  debug: true, // temp: see logs in terminal
});
