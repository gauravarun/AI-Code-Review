import { apiClient } from "./client";
import type { ReviewDetail, ReviewSummary } from "../types";

export interface CreateReviewResponse {
  review: ReviewDetail;
  githubRateLimit: { limit: number; remaining: number; resetAt: string };
}

export async function createReview(prUrl: string): Promise<CreateReviewResponse> {
  const { data } = await apiClient.post<CreateReviewResponse>("/api/reviews", { prUrl });
  return data;
}

export async function listReviews(): Promise<ReviewSummary[]> {
  const { data } = await apiClient.get<ReviewSummary[]>("/api/reviews");
  return data;
}

export async function getReview(id: string): Promise<ReviewDetail> {
  const { data } = await apiClient.get<ReviewDetail>(`/api/reviews/${id}`);
  return data;
}
