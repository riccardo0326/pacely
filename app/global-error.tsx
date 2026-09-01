"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <main style={{ maxWidth: "28rem", textAlign: "center" }}>
          <p style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Pacely
          </p>
          <h1 style={{ fontSize: "1.5rem" }}>Qualcosa è andato storto</h1>
          <p>
            Non siamo riusciti a caricare l&apos;app. Riprova oppure ricarica la
            pagina.
          </p>
          {error.digest ? (
            <p style={{ fontSize: "0.75rem" }}>Codice: {error.digest}</p>
          ) : null}
          <button type="button" onClick={() => reset()}>
            Riprova
          </button>
        </main>
      </body>
    </html>
  );
}
