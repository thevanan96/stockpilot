"use client";

import "./globals.css";

/** Last-resort boundary for errors in the root layout (app shell). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-background p-6 font-sans">
        <div className="max-w-sm text-center">
          <h1 className="text-base font-semibold">StockPilot hit an unexpected error</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Try again. If it keeps happening, clearing this site&apos;s data restores the demo workspace.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-5 h-8 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
