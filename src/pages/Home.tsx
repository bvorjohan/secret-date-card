import { dateOptions } from "../data/dateOptions";
import ScratchPanel from "../components/ScratchPanel";
import MascotSticker from "../components/MascotSticker";

/** The main ticket: a grid of scratch-off slots, one per date option. */
export default function Home() {
  return (
    <main className="ticket-page">
      <div className="ticket">
        <div className="ticket__corner ticket__corner--left" aria-hidden="true">
          No. 000427
        </div>
        <MascotSticker
          size="sm"
          caption="Personally guaranteed"
          className="ticket__mascot"
        />

        <header className="ticket__header">
          <p className="ticket__eyebrow">✦ Admit One ✦</p>
          <h1 className="ticket__title">Redeem a Date</h1>
          <p className="ticket__subtitle">Scratch one off to reveal it</p>
        </header>

        <p className="ticket__fineprint">
          Good for one (1) date · redeemable anytime, in person · no cash
          value
        </p>

        <div className="ticket__perforation" aria-hidden="true" />

        <div className="ticket__grid">
          {dateOptions.map((option) => (
            <ScratchPanel key={option.id} option={option} />
          ))}
        </div>

        <footer className="ticket__footer">
          <p>Not valid after the heat death of the universe.</p>
        </footer>
      </div>
    </main>
  );
}
