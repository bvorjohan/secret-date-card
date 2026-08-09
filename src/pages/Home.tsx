import { dateOptions } from "../data/dateOptions";
import ScratchPanel from "../components/ScratchPanel";

/** The main ticket: a grid of scratch-off slots, one per date option. */
export default function Home() {
  return (
    <main className="ticket-page">
      <div className="ticket">
        <header className="ticket__header">
          <p className="ticket__eyebrow">One Lucky Winner</p>
          <h1 className="ticket__title">Redeem a Date</h1>
          <p className="ticket__subtitle">Scratch one off to reveal it</p>
        </header>

        <div className="ticket__perforation" aria-hidden="true" />

        <div className="ticket__grid">
          {dateOptions.map((option) => (
            <ScratchPanel key={option.id} option={option} />
          ))}
        </div>

        <footer className="ticket__footer">
          <p>No purchase necessary. Redeemable anytime, with me.</p>
        </footer>
      </div>
    </main>
  );
}
