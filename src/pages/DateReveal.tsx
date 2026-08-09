import { Link, Navigate, useParams } from "react-router-dom";
import { getDateOption, getSerialNumber } from "../data/dateOptions";
import MascotSticker from "../components/MascotSticker";
import StampSeal from "../components/StampSeal";

/**
 * The reveal route: /date/:id
 *
 * Three possible outcomes, based on the looked-up DateOption:
 *  - no match for :id           -> redirect to the 404 page
 *  - match with status "pending" -> ComingSoon fallback (see below)
 *  - match with status "ready"   -> full title/description reveal
 */
export default function DateReveal() {
  const { id } = useParams<{ id: string }>();
  const option = id ? getDateOption(id) : undefined;

  if (!option) {
    return <Navigate to="/not-found" replace />;
  }

  const isReady = option.status === "ready";

  return (
    <main className="reveal-page">
      <div className="reveal-card">
        <StampSeal
          text={isReady ? "Confirmed ✓" : "Pending"}
          tone={isReady ? "accent" : "muted"}
          className="reveal-card__stamp"
        />

        <MascotSticker size="lg" className="reveal-card__mascot" />

        <span className="reveal-card__icon" aria-hidden="true">
          {option.icon}
        </span>

        {isReady ? (
          <>
            <p className="reveal-card__eyebrow">You scratched off</p>
            <h1 className="reveal-card__title">{option.title}</h1>
            <p className="reveal-card__description">{option.description}</p>
          </>
        ) : (
          <>
            <p className="reveal-card__eyebrow">You scratched off</p>
            <h1 className="reveal-card__title">Still cooking</h1>
            <p className="reveal-card__description">
              This one isn't planned yet, but it's a real slot on the
              ticket — check back soon and it'll be ready to redeem.
            </p>
          </>
        )}

        <p className="reveal-card__serial" aria-hidden="true">
          {getSerialNumber(option.id)}
        </p>

        <Link to="/" className="reveal-card__back">
          ← Back to the ticket
        </Link>
      </div>
    </main>
  );
}
