import { Octokit } from "@octokit/rest";

export interface ParsedPrUrl {
  owner: string;
  repo: string;
  prNumber: number;
}

const PR_URL_PATTERN = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;

export function parsePrUrl(url: string): ParsedPrUrl {
  const match = url.trim().match(PR_URL_PATTERN);
  if (!match) {
    throw new Error("That doesn't look like a GitHub pull request URL (expected https://github.com/<owner>/<repo>/pull/<number>)");
  }
  const [, owner, repo, prNumber] = match;
  return { owner, repo, prNumber: Number(prNumber) };
}

export interface PrFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface PrData {
  title: string;
  body: string | null;
  author: string;
  baseBranch: string;
  headBranch: string;
  files: PrFile[];
  rateLimit: {
    limit: number;
    remaining: number;
    resetAt: string;
  };
}

const MAX_FILES = 60;
const MAX_PATCH_CHARS_PER_FILE = 6000;

export async function fetchPullRequest(accessToken: string, { owner, repo, prNumber }: ParsedPrUrl): Promise<PrData> {
  const octokit = new Octokit({ auth: accessToken });

  const [{ data: pr }, filesResponse] = await Promise.all([
    octokit.pulls.get({ owner, repo, pull_number: prNumber }),
    octokit.pulls.listFiles({ owner, repo, pull_number: prNumber, per_page: MAX_FILES }),
  ]);

  const rateLimitHeader = filesResponse.headers;
  const files: PrFile[] = filesResponse.data.slice(0, MAX_FILES).map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch ? file.patch.slice(0, MAX_PATCH_CHARS_PER_FILE) : undefined,
  }));

  return {
    title: pr.title,
    body: pr.body,
    author: pr.user?.login ?? "unknown",
    baseBranch: pr.base.ref,
    headBranch: pr.head.ref,
    files,
    rateLimit: {
      limit: Number(rateLimitHeader["x-ratelimit-limit"] ?? 0),
      remaining: Number(rateLimitHeader["x-ratelimit-remaining"] ?? 0),
      resetAt: new Date(Number(rateLimitHeader["x-ratelimit-reset"] ?? 0) * 1000).toISOString(),
    },
  };
}
