import { Link } from "react-router-dom";

/** Shown for any /date/:id that doesn't match a known option, or any other unknown route. */
export default function NotFound() {
  return (
    <main className="reveal-page">
      <div className="reveal-card">
        <span className="reveal-card__icon" aria-hidden="true">
          🎫
        </span>
        <p className="reveal-card__eyebrow">Hmm</p>
        <h1 className="reveal-card__title">That ticket doesn't exist</h1>
        <p className="reveal-card__description">
          This link doesn't match any date on the ticket.
        </p>
        <Link to="/" className="reveal-card__back">
          ← Back to the ticket
        </Link>
      </div>
    </main>
  );
}
