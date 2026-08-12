import StampCard from "../components/StampCard";

/**
 * Bare preview at /stamp-card-study, not linked from nav — just the
 * card by itself on a dark background, for eyeballing the design in
 * isolation. The actual card markup/styling lives in
 * src/components/StampCard.tsx, which this now shares with Home's
 * loyalty modal (see Home.tsx's "Check your loyalty card" button).
 */
export default function StampCardStudy() {
  return (
    <main className="stamp-study-page">
      <StampCard />
    </main>
  );
}
