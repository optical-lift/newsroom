import Link from "next/link";

export default function HomePage() {
  return (
    <main className="public-shell">
      <div className="brand-mark">OL</div>
      <p className="eyebrow">Optical Lift</p>
      <h1>Newsroom</h1>
      <p className="lede">
        A human-facing workspace for source-grounded reporting tools. Newsroom organizes what reporters need to see while the underlying evidence systems retain source custody.
      </p>
      <div className="public-actions">
        <Link className="primary-button" href="/forum">Open Forum shell</Link>
        <span className="quiet-note">Shell release — no private newsroom data is connected.</span>
      </div>
    </main>
  );
}
