import Link from "next/link";

export function HonestFooter() {
  return (
    <footer className="site-footer">
      <div>
        <span className="eyebrow text-[#e7ff49]">06 / REVEAL</span>
        <p className="footer-punchline">The servers are imaginary.<br />The disclosure is not.</p>
      </div>
      <div className="footer-links">
        <Link href="/truth">Truth</Link>
        <Link href="/status">Status</Link>
        <Link href="/legal/terms">Terms</Link>
        <Link href="/legal/privacy">Privacy</Link>
      </div>
      <div className="footer-meta">
        <span>© 2026 Imaginary Intelligence</span>
        <span>built for the bit / maintained for the footnote</span>
      </div>
    </footer>
  );
}
