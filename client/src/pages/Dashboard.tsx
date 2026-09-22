import { useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { createReview } from "../api/reviews";
import type { ReviewDetail } from "../types";
import { ScoreBadge } from "../components/ScoreBadge";
import { IssueList } from "../components/IssueCard";

export function Dashboard() {
  const [prUrl, setPrUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewDetail | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { review } = await createReview(prUrl);
      setResult(review);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Something went wrong analyzing this pull request.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard">
      <form onSubmit={handleSubmit} className="pr-form">
        <label htmlFor="prUrl">GitHub pull request URL</label>
        <div className="pr-form-row">
          <input
            id="prUrl"
            type="url"
            required
            placeholder="https://github.com/owner/repo/pull/123"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Analyzing..." : "Review PR"}
          </button>
        </div>
      </form>

      {error && <p className="error-text">{error}</p>}

      {loading && <p className="loading-text">Fetching the diff and running it through Claude — this can take a bit for large PRs.</p>}

      {result && (
        <div className="review-result">
          <div className="review-result-header">
            <h2>{result.title ?? `${result.owner}/${result.repo} #${result.prNumber}`}</h2>
            {result.analysis && <ScoreBadge score={result.analysis.overallScore} />}
          </div>
          <p className="review-summary">{result.summary}</p>
          <p className="review-meta">{result.filesReviewed} file(s) reviewed</p>
          {result.analysis && <IssueList issues={result.analysis.issues} />}
        </div>
      )}
    </div>
  );
}
