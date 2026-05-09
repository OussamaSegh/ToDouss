import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey } from "./crypto-keys";

describe("crypto-keys", () => {
  it("hashes deterministically and rejects mismatch", () => {
    const raw = generateApiKey();
    expect(raw.startsWith("td_live_")).toBe(true);
    expect(hashApiKey(raw)).toBe(hashApiKey(raw));
    expect(hashApiKey(raw)).not.toBe(hashApiKey(generateApiKey()));
  });
});
