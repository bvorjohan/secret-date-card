import type { DateOption } from "../data/dateOptions";

/**
 * Fires a Netlify Forms submission when a real (non-"No Bueno") date
 * gets revealed, so a Netlify "form notification" (configured in the
 * site's dashboard, not in code — see docs/SPEC.md) can email you.
 *
 * This is a plain fetch() POST, not a real browser form submit — no
 * page navigation happens. The matching hidden <form name="scratch-reveal">
 * lives in index.html; its field names must stay in sync with the
 * URLSearchParams keys below.
 *
 * Best-effort: a failed/blocked request here should never break the
 * reveal page, so errors are swallowed.
 */
export function notifyScratched(option: DateOption): void {
  const body = new URLSearchParams({
    "form-name": "scratch-reveal",
    id: option.id,
    title: option.title ?? option.id,
    when: new Date().toLocaleString(),
  });

  fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  }).catch(() => {
    // Notification is a nice-to-have, not core functionality.
  });
}
