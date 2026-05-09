import { describe, expect, it } from "vitest";
import { formatStorageLimit, getPlanLimits } from "./plans";

describe("billing plans", () => {
  it("formats storage for typical tiers", () => {
    expect(formatStorageLimit(null)).toBe("Unlimited");
    expect(formatStorageLimit(100 * 1024 * 1024)).toMatch(/MB/);
    expect(formatStorageLimit(5 * 1024 * 1024 * 1024)).toMatch(/GB/);
  });

  it("returns finite caps for free tier", () => {
    const limits = getPlanLimits("FREE");
    expect(limits.maxActiveProjects).toBe(5);
    expect(limits.maxStorageBytes).not.toBeNull();
  });
});
