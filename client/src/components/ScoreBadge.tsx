export function ScoreBadge({ score }: { score: number }) {
  const tier = score >= 85 ? "good" : score >= 60 ? "warn" : "bad";
  return (
    <span className={`score-badge score-badge--${tier}`} title="Overall review score">
      {score}/100
    </span>
  );
}
