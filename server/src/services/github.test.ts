import { describe, expect, it } from "vitest";
import { parsePrUrl } from "./github";

describe("parsePrUrl", () => {
  it("extracts owner, repo and PR number", () => {
    expect(parsePrUrl("https://github.com/octocat/hello-world/pull/42")).toEqual({
      owner: "octocat",
      repo: "hello-world",
      prNumber: 42,
    });
  });

  it("tolerates surrounding whitespace and trailing path segments", () => {
    expect(parsePrUrl("  https://github.com/a/b/pull/7/files  ")).toEqual({ owner: "a", repo: "b", prNumber: 7 });
  });

  it("rejects repo URLs and non-PR URLs", () => {
    expect(() => parsePrUrl("https://github.com/gauravarun/AI-Code-Review.git")).toThrow(/pull request URL/);
    expect(() => parsePrUrl("https://github.com/a/b/issues/3")).toThrow();
    expect(() => parsePrUrl("not a url")).toThrow();
  });
});
