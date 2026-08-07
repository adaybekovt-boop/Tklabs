"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("ui.global_error", { digest: error.digest ?? "unknown", name: error.name });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f5f5f2", color: "#111318", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }} data-global-error-boundary>
          <section style={{ width: "min(100%, 620px)", border: "1px solid rgba(17,19,24,.18)", borderRadius: "28px", background: "white", padding: "32px", boxShadow: "0 28px 90px rgba(15,23,42,.12)" }}>
            <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", opacity: .55 }}>TK LAB · Runtime recovery</p>
            <h1 style={{ margin: "18px 0 0", fontFamily: "Georgia, serif", fontSize: "clamp(38px, 8vw, 58px)", lineHeight: 1.04, fontWeight: 400 }}>The application shell could not start.</h1>
            <p style={{ margin: "20px 0 0", fontSize: "16px", lineHeight: 1.7, opacity: .72 }}>Reload the runtime. Local browser conversations and workspace files are not cleared by this recovery action.</p>
            {error.digest ? <p style={{ margin: "18px 0 0", fontFamily: "monospace", fontSize: "12px", opacity: .55 }}>Error reference: {error.digest}</p> : null}
            <button type="button" onClick={reset} style={{ marginTop: "28px", minHeight: "46px", border: 0, borderRadius: "999px", background: "#111318", color: "white", padding: "0 20px", fontWeight: 700, cursor: "pointer" }}>Reload TK LAB</button>
          </section>
        </main>
      </body>
    </html>
  );
}
