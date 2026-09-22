import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listReviews } from "../api/reviews";
import type { ReviewSummary } from "../types";

const STATUS_LABEL: Record<ReviewSummary["status"], string> = {
  PENDING: "Pending",
  COMPLETE: "Complete",
  FAILED: "Failed",
};

export function History() {
  const [reviews, setReviews] = useState<ReviewSummary[] | null>(null);

  useEffect(() => {
    listReviews().then(setReviews);
  }, []);

  if (!reviews) return <p className="page-loading">Loading history...</p>;
  if (reviews.length === 0) return <p>No reviews yet. Go analyze a pull request.</p>;

  return (
    <div className="history-page">
      <h2>Review History</h2>
      <ul className="history-list">
        {reviews.map((review) => (
          <li key={review.id} className={`history-item history-item--${review.status.toLowerCase()}`}>
            <Link to={`/reviews/${review.id}`}>
              <span className="history-repo">
                {review.owner}/{review.repo} #{review.prNumber}
              </span>
              <span className="history-title">{review.title ?? review.prUrl}</span>
              <span className="history-status">{STATUS_LABEL[review.status]}</span>
              <span className="history-date">{new Date(review.createdAt).toLocaleString()}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
