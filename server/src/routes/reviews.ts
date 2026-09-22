import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { reviewRateLimiter } from "../middleware/rateLimit";
import { decryptToken } from "../services/crypto";
import { fetchPullRequest, parsePrUrl } from "../services/github";
import { analyzePullRequest } from "../services/claude";

export const reviewsRouter = Router();

const createReviewSchema = z.object({
  prUrl: z.string().url(),
});

reviewsRouter.post("/", requireAuth, reviewRateLimiter, async (req, res) => {
  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid GitHub pull request URL is required" });
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = parsePrUrl(parsed.data.prUrl);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
    return;
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  const accessToken = decryptToken(user.githubAccessToken);

  const review = await prisma.review.create({
    data: {
      userId: user.id,
      prUrl: parsed.data.prUrl,
      owner: parsedUrl.owner,
      repo: parsedUrl.repo,
      prNumber: parsedUrl.prNumber,
      status: "PENDING",
    },
  });

  try {
    const pr = await fetchPullRequest(accessToken, parsedUrl);
    const analysis = await analyzePullRequest(pr);

    const completed = await prisma.review.update({
      where: { id: review.id },
      data: {
        title: pr.title,
        status: "COMPLETE",
        summary: analysis.summary,
        analysis: { issues: analysis.issues, overallScore: analysis.overallScore } as object,
        filesReviewed: analysis.filesReviewed,
        completedAt: new Date(),
      },
    });

    res.status(201).json({ review: completed, githubRateLimit: pr.rateLimit });
  } catch (error) {
    console.error("Review failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.review.update({
      where: { id: review.id },
      data: { status: "FAILED", error: message },
    });
    res.status(502).json({ error: `Review failed: ${message}` });
  }
});

reviewsRouter.get("/", requireAuth, async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      prUrl: true,
      owner: true,
      repo: true,
      prNumber: true,
      title: true,
      status: true,
      summary: true,
      filesReviewed: true,
      createdAt: true,
      completedAt: true,
    },
  });
  res.json(reviews);
});

reviewsRouter.get("/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  const review = await prisma.review.findFirst({
    where: { id, userId: req.userId },
  });
  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  res.json(review);
});
