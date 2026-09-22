export type IssueCategory = "bug" | "security" | "performance" | "style" | "maintainability";
export type IssueSeverity = "critical" | "high" | "medium" | "low";

export interface ReviewIssue {
  category: IssueCategory;
  severity: IssueSeverity;
  file: string;
  line: number | null;
  description: string;
  suggestion: string;
}

export type ReviewStatus = "PENDING" | "COMPLETE" | "FAILED";

export interface ReviewSummary {
  id: string;
  prUrl: string;
  owner: string;
  repo: string;
  prNumber: number;
  title: string | null;
  status: ReviewStatus;
  summary: string | null;
  filesReviewed: number;
  createdAt: string;
  completedAt: string | null;
}

export interface ReviewDetail extends ReviewSummary {
  userId: string;
  analysis: { issues: ReviewIssue[]; overallScore: number } | null;
  error: string | null;
}

export interface User {
  id: string;
  username: string;
  avatarUrl: string | null;
}
