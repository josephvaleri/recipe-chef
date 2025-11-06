"use client";

import * as Sentry from "@sentry/nextjs";



export default function Page() {

  return (

    <main style={{ padding: 24 }}>

      <h1>Send a Sentry Test Event</h1>

      <button

        onClick={() => {

          try {

            throw new Error("Sentry test error from the browser (local)");

          } catch (e) {

            Sentry.captureException(e);

            alert("Sent a test error to Sentry (check dashboard)");

          }

        }}

      >

        Trigger Client Error

      </button>

    </main>

  );

}

