import * as Sentry from "@sentry/nextjs";

console.log("[Sentry] client config loaded");

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "local",
  debug: true, // temp: see logs in browser console
});
