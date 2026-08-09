import type { ReactNode } from "react";

interface RibbonProps {
  children: ReactNode;
  /** e.g. "ticket__ribbon--lg ticket__ribbon--gold" */
  className?: string;
}

/**
 * A folded ribbon banner — see the long comment on
 * `.ticket__ribbon-wrap` in index.css for the construction (it's a
 * direct port of a reference file the user supplied, not something
 * guessed at here): two notched "tail" pieces behind the face and
 * sitting slightly lower, two small skewed "fold" creases marking
 * where each tail disappears behind the face, and the face itself on
 * top holding the text.
 *
 * `className` (the size/color variant, e.g. "ticket__ribbon--gold")
 * goes on *both* the wrap and the inner face: `--gold` sets the three
 * `--ribbon-*` shade variables, which the tail/fold pieces need too
 * (as the wrap's children, not the face's descendants, they only
 * inherit variables set on their own ancestor, the wrap) — while
 * `--sm`/`--lg`/`--prize` set typography properties that only apply to
 * the face. Harmless no-op for whichever selector doesn't match a
 * given element.
 */
export default function Ribbon({ children, className = "" }: RibbonProps) {
  return (
    <span className={`ticket__ribbon-wrap ${className}`}>
      <span className="ticket__ribbon-tail ticket__ribbon-tail--left" aria-hidden="true" />
      <span className="ticket__ribbon-tail ticket__ribbon-tail--right" aria-hidden="true" />
      <span className="ticket__ribbon-fold ticket__ribbon-fold--left" aria-hidden="true" />
      <span className="ticket__ribbon-fold ticket__ribbon-fold--right" aria-hidden="true" />
      <span className={`ticket__ribbon ${className}`}>{children}</span>
    </span>
  );
}
