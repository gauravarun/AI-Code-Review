import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getReview } from "../api/reviews";
import type { ReviewDetail as ReviewDetailType } from "../types";
import { ScoreBadge } from "../components/ScoreBadge";
import { IssueList } from "../components/IssueCard";

export function ReviewDetail() {
  const { id } = useParams<{ id: string }>();
  const [review, setReview] = useState<ReviewDetailType | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    getReview(id)
      .then(setReview)
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) return <p>Review not found.</p>;
  if (!review) return <p className="page-loading">Loading...</p>;

  return (
    <div className="review-detail">
      <Link to="/history" className="back-link">
        &larr; Back to history
      </Link>
      <div className="review-result-header">
        <h2>{review.title ?? `${review.owner}/${review.repo} #${review.prNumber}`}</h2>
        {review.analysis && <ScoreBadge score={review.analysis.overallScore} />}
      </div>
      <a href={review.prUrl} target="_blank" rel="noreferrer">
        {review.prUrl}
      </a>

      {review.status === "FAILED" && <p className="error-text">Review failed: {review.error}</p>}
      {review.status === "PENDING" && <p className="loading-text">This review is still processing.</p>}

      {review.summary && <p className="review-summary">{review.summary}</p>}
      {review.analysis && <IssueList issues={review.analysis.issues} />}
    </div>
  );
}
