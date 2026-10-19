import { describe, expect, it } from "vitest";
import { chunkFiles, scoreFromIssues, type ReviewIssue } from "./claude";
import type { PrFile } from "./github";

const file = (name: string, patchLength: number): PrFile => ({
  filename: name,
  status: "modified",
  additions: 1,
  deletions: 0,
  patch: "x".repeat(patchLength),
});

const issue = (severity: ReviewIssue["severity"]): ReviewIssue => ({
  category: "bug",
  severity,
  file: "a.ts",
  line: 1,
  description: "d",
  suggestion: "s",
});

describe("chunkFiles", () => {
  it("keeps small PRs in a single batch", () => {
    expect(chunkFiles([file("a", 100), file("b", 100)])).toHaveLength(1);
  });

  it("splits when the character budget is exceeded, preserving order", () => {
    const batches = chunkFiles([file("a", 7000), file("b", 7000), file("c", 7000)]);
    expect(batches.map((b) => b.map((f) => f.filename))).toEqual([["a"], ["b"], ["c"]]);
  });

  it("never drops a single oversized file", () => {
    const batches = chunkFiles([file("huge", 50000)]);
    expect(batches).toHaveLength(1);
    expect(batches[0][0].filename).toBe("huge");
  });

  it("returns no batches for no files", () => {
    expect(chunkFiles([])).toEqual([]);
  });
});

describe("scoreFromIssues", () => {
  it("is 100 with no issues", () => {
    expect(scoreFromIssues([])).toBe(100);
  });

  it("weights severities", () => {
    expect(scoreFromIssues([issue("critical"), issue("high"), issue("medium"), issue("low")])).toBe(100 - 25 - 12 - 5 - 2);
  });

  it("never goes below 0", () => {
    expect(scoreFromIssues(Array.from({ length: 10 }, () => issue("critical")))).toBe(0);
  });
});
