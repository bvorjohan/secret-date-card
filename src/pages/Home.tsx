import { dateOptions } from "../data/dateOptions";
import ScratchPanel from "../components/ScratchPanel";
import MascotSticker from "../components/MascotSticker";

interface HomeProps {
  /** ids already visited via /date/:id this session — shown pre-scratched. */
  revealedIds: Set<string>;
}

/** The main sheet: a grid of scratch-off tabs, one per date option. */
export default function Home({ revealedIds }: HomeProps) {
  return (
    <main className="ticket-page">
      <div className="ticket">
        <div className="ticket__banner">
          <p className="ticket__eyebrow">★ Win Big! ★</p>
        </div>

        <div className="ticket__corner ticket__corner--left" aria-hidden="true">
          No. 000427
        </div>
        <MascotSticker
          size="sm"
          caption="Personally guaranteed"
          className="ticket__mascot"
        />

        <header className="ticket__header">
          <h1 className="ticket__title">Secret Date Blowout</h1>
          <p className="ticket__subtitle">Scratch one off to redeem a date with me</p>
        </header>

        <p className="ticket__fineprint">
          Redeemable at Central Cinema, San Fermo, Chihuly, Atoma, and other
          participating locations
        </p>

        <div className="ticket__perforation" aria-hidden="true" />

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

        <footer className="ticket__footer">
          <p>Not valid after the heat death of the universe.</p>
          <p>Collecting all pieces is encouraged.</p>
        </footer>
      </div>
    </main>
  );
}
