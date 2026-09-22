import rateLimit from "express-rate-limit";

// Claude API calls are the expensive part of a review, so this caps how often
// a single signed-in user can kick one off, independent of GitHub's own rate limit.
export const reviewRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId ?? req.ip ?? "anonymous",
  message: { error: "Too many reviews requested. Please wait a few minutes and try again." },
});
