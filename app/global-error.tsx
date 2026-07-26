"use client";

export default function GlobalError() {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f7f2ea", color: "#211d1a" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
          <section style={{ maxWidth: "28rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.2em" }}>PS JEWELLERS</p>
            <h1>Something went wrong</h1>
            <p>Please refresh the page and try again.</p>
          </section>
        </main>
      </body>
    </html>
  );
}
