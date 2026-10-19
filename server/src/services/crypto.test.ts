import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "./crypto";

describe("token encryption", () => {
  it("round-trips a token", () => {
    const token = "gho_exampleToken123";
    expect(decryptToken(encryptToken(token))).toBe(token);
  });

  it("does not store plaintext and uses a fresh IV each time", () => {
    const a = encryptToken("secret");
    const b = encryptToken("secret");
    expect(a).not.toContain("secret");
    expect(a).not.toBe(b);
  });

  it("rejects tampered ciphertext (GCM auth tag)", () => {
    const raw = Buffer.from(encryptToken("secret"), "base64");
    raw[raw.length - 1] ^= 0xff;
    expect(() => decryptToken(raw.toString("base64"))).toThrow();
  });
});
