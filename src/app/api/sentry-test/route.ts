import * as Sentry from "@sentry/nextjs";



export const runtime = "nodejs";



export async function GET() {

  try {

    throw new Error("Sentry test error from API route (local)");

  } catch (e) {

    Sentry.captureException(e);

    return new Response(JSON.stringify({ ok: true }), {

      headers: { "Content-Type": "application/json" },

    });

  }

}

