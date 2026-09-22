import ReactMarkdown from "react-markdown";
import type { ReviewIssue } from "../types";

const SEVERITY_ORDER: ReviewIssue["severity"][] = ["critical", "high", "medium", "low"];

export function IssueList({ issues }: { issues: ReviewIssue[] }) {
  if (issues.length === 0) {
    return <p className="no-issues">No issues found. Nice work.</p>;
  }

  const sorted = [...issues].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  return (
    <div className="issue-list">
      {sorted.map((issue, i) => (
        <div key={i} className={`issue-card issue-card--${issue.severity}`}>
          <div className="issue-card-header">
            <span className={`badge badge--${issue.severity}`}>{issue.severity}</span>
            <span className="badge badge--category">{issue.category}</span>
            <span className="issue-file">
              {issue.file}
              {issue.line ? `:${issue.line}` : ""}
            </span>
          </div>
          <div className="issue-description">
            <ReactMarkdown>{issue.description}</ReactMarkdown>
          </div>
          <div className="issue-suggestion">
            <strong>Suggestion:</strong> <ReactMarkdown>{issue.suggestion}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
}
