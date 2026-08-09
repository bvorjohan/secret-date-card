import { dateOptions } from "../data/dateOptions";
import ScratchPanel from "../components/ScratchPanel";
import MascotSticker from "../components/MascotSticker";
import ArcText from "../components/ArcText";

interface HomeProps {
  /** ids already visited via /date/:id this session — shown pre-scratched. */
  revealedIds: Set<string>;
}

/**
 * The main sheet: a grid of scratch-off tabs, one per date option.
 *
 * Structure deliberately mirrors /ticket-study
 * (src/pages/TicketStudy.tsx) piece for piece — corner price tag,
 * corner badge, arced two-tone headline, kicker, big arced
 * declaration, bordered play area, bold banner line, fine print +
 * serial footer — rather than the app's own earlier layout (banner
 * strip, perforation, venue fine print) reskinned in the new colors.
 * See docs/SPEC.md "Lotto reference board" for why.
 */
export default function Home({ revealedIds }: HomeProps) {
  return (
    <main className="ticket-page">
      <div className="ticket">
        <span className="ticket__price" aria-hidden="true">
          FREE
        </span>
        <MascotSticker
          size="sm"
          caption="Personally guaranteed"
          className="ticket__mascot"
        />

        <header className="ticket__header">
          <h1 className="ticket__title">
            <ArcText text="SECRET DATE" maxDeg={14} radius={18} />
          </h1>
          <h1 className="ticket__title ticket__title--cream">
            <ArcText text="BLOWOUT" maxDeg={16} radius={20} />
          </h1>
          <p className="ticket__kicker">Scratch one off to</p>
          <p className="ticket__declare">
            <ArcText text="WIN A DATE!" maxDeg={12} radius={16} />
          </p>
        </header>

        <div className="ticket__playarea">
          <div className="ticket__grid">
            {dateOptions.map((option, index) => (
              <ScratchPanel
                key={option.id}
                option={option}
                piece={index + 1}
                total={dateOptions.length}
                revealed={revealedIds.has(option.id)}
              />
            ))}
          </div>
        </div>

        <p className="ticket__banner-line">NEVER EXPIRES!</p>

        <footer className="ticket__footer">
          <div className="ticket__footer-text">
            <p>Not valid after the heat death of the universe.</p>
            <p>Collecting all pieces is encouraged.</p>
          </div>
          <span className="ticket__serial" aria-hidden="true">
            No. 000427
          </span>
        </footer>
      </div>
    </main>
  );
}
