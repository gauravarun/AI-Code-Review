import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";
import { PrData, PrFile } from "./github";

const anthropic = new Anthropic({ apiKey: env.anthropicApiKey });
const MODEL = "claude-sonnet-5";

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

export interface BatchReviewResult {
  issues: ReviewIssue[];
  batchSummary: string;
}

export interface PrAnalysis {
  summary: string;
  overallScore: number;
  issues: ReviewIssue[];
  filesReviewed: number;
}

const REVIEW_TOOL: Anthropic.Tool = {
  name: "submit_code_review",
  description: "Submit the structured findings from reviewing a batch of pull request file diffs.",
  input_schema: {
    type: "object",
    properties: {
      batchSummary: {
        type: "string",
        description: "One or two sentence summary of what this batch of files does and its overall quality.",
      },
      issues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string", enum: ["bug", "security", "performance", "style", "maintainability"] },
            severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
            file: { type: "string", description: "The filename this issue was found in." },
            line: { type: ["number", "null"], description: "Line number in the diff, or null if not line-specific." },
            description: { type: "string", description: "What is wrong and why it matters." },
            suggestion: { type: "string", description: "A concrete fix or improvement." },
          },
          required: ["category", "severity", "file", "line", "description", "suggestion"],
        },
      },
    },
    required: ["batchSummary", "issues"],
  },
};

const SYSTEM_PROMPT = `You are a senior software engineer performing a thorough code review on a GitHub pull request diff.
Focus on: correctness bugs, security vulnerabilities (injection, auth, secrets, unsafe deserialization, XSS, etc.),
performance issues, and maintainability/style problems worth flagging. Be specific and reference the actual file and
line when possible. Do not invent issues that aren't supported by the diff. If a file's diff looks fine, do not force
an issue for it. Always respond by calling the submit_code_review tool.`;

function formatFileForPrompt(file: PrFile): string {
  return `### ${file.filename} (${file.status}, +${file.additions}/-${file.deletions})\n\`\`\`diff\n${file.patch ?? "(no diff available, e.g. binary or too large)"}\n\`\`\``;
}

// Claude has a finite context window and per-request cost, so large PRs are chunked
// into batches rather than sent as one giant prompt.
const MAX_CHARS_PER_BATCH = 12000;

export function chunkFiles(files: PrFile[]): PrFile[][] {
  const batches: PrFile[][] = [];
  let currentBatch: PrFile[] = [];
  let currentChars = 0;

  for (const file of files) {
    const fileChars = (file.patch ?? "").length;
    if (currentBatch.length > 0 && currentChars + fileChars > MAX_CHARS_PER_BATCH) {
      batches.push(currentBatch);
      currentBatch = [];
      currentChars = 0;
    }
    currentBatch.push(file);
    currentChars += fileChars;
  }
  if (currentBatch.length > 0) batches.push(currentBatch);
  return batches;
}

// Anthropic's SDK throws on 429s rather than blocking, so batches retry with
// exponential backoff instead of failing the whole PR review on a transient rate limit.
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimited = error instanceof Anthropic.APIError && error.status === 429;
      if (!isRateLimited || attempt === retries) throw error;
      const delayMs = 2 ** attempt * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("unreachable");
}

async function analyzeBatch(prTitle: string, batch: PrFile[]): Promise<BatchReviewResult> {
  const prompt = `Pull request title: ${prTitle}\n\nReview the following ${batch.length} file diff(s):\n\n${batch
    .map(formatFileForPrompt)
    .join("\n\n")}`;

  const response = await withRetry(() =>
    anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [REVIEW_TOOL],
      tool_choice: { type: "tool", name: "submit_code_review" },
      messages: [{ role: "user", content: prompt }],
    })
  );

  const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
  if (!toolUse) {
    throw new Error("Claude did not return a structured review for this batch");
  }

  const input = toolUse.input as { batchSummary: string; issues: ReviewIssue[] };
  return { batchSummary: input.batchSummary, issues: input.issues ?? [] };
}

export function scoreFromIssues(issues: ReviewIssue[]): number {
  const penalties: Record<IssueSeverity, number> = { critical: 25, high: 12, medium: 5, low: 2 };
  const total = issues.reduce((sum, issue) => sum + penalties[issue.severity], 0);
  return Math.max(0, 100 - total);
}

// Batches run sequentially (not Promise.all) to stay under Anthropic's requests-per-minute
// rate limit for large PRs with many chunks.
export async function analyzePullRequest(pr: PrData): Promise<PrAnalysis> {
  const batches = chunkFiles(pr.files.filter((f) => f.patch));
  const allIssues: ReviewIssue[] = [];
  const batchSummaries: string[] = [];

  for (const batch of batches) {
    const result = await analyzeBatch(pr.title, batch);
    allIssues.push(...result.issues);
    batchSummaries.push(result.batchSummary);
  }

  const summary =
    batchSummaries.length <= 1
      ? batchSummaries[0] ?? "No reviewable file diffs were found in this pull request."
      : await synthesizeSummary(pr.title, batchSummaries, allIssues);

  return {
    summary,
    overallScore: scoreFromIssues(allIssues),
    issues: allIssues,
    filesReviewed: pr.files.filter((f) => f.patch).length,
  };
}

async function synthesizeSummary(prTitle: string, batchSummaries: string[], issues: ReviewIssue[]): Promise<string> {
  const counts = issues.reduce<Record<string, number>>((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] ?? 0) + 1;
    return acc;
  }, {});

  const response = await withRetry(() =>
    anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: "You write a concise, senior-engineer-style overall summary of a pull request review given per-file batch summaries and an issue count. 3-5 sentences, no markdown headers.",
      messages: [
        {
          role: "user",
          content: `PR title: ${prTitle}\n\nBatch summaries:\n${batchSummaries.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nIssue counts by severity: ${JSON.stringify(
            counts
          )}\n\nWrite the overall PR review summary.`,
        },
      ],
    })
  );

  const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text");
  return textBlock?.text ?? batchSummaries.join(" ");
}
