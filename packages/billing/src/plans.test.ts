import { describe, expect, it } from "vitest";
import { formatStorageLimit, getPlanLimits } from "./plans";

describe("billing plans", () => {
  it("formats storage for typical tiers", () => {
    expect(formatStorageLimit(null)).toBe("Unlimited");
    expect(formatStorageLimit(100 * 1024 * 1024)).toMatch(/MB/);
    expect(formatStorageLimit(5 * 1024 * 1024 * 1024)).toMatch(/GB/);
  });

  it("uses KB for small non-zero byte values", () => {
    expect(formatStorageLimit(512)).toMatch(/KB/);
  });

  it("returns finite caps for free tier", () => {
    const limits = getPlanLimits("FREE");
    expect(limits.maxActiveProjects).toBe(5);
    expect(limits.maxStorageBytes).not.toBeNull();
  });

  it("PRO caps storage but not projects or members", () => {
    const limits = getPlanLimits("PRO");
    expect(limits.maxActiveProjects).toBeNull();
    expect(limits.maxMembers).toBeNull();
    expect(limits.maxStorageBytes).toBe(5 * 1024 * 1024 * 1024);
  });

  it("BUSINESS and ENTERPRISE are unlimited across dimensions", () => {
    expect(getPlanLimits("BUSINESS")).toEqual({
      maxActiveProjects: null,
      maxMembers: null,
      maxStorageBytes: null,
    });
    expect(getPlanLimits("ENTERPRISE")).toEqual(getPlanLimits("BUSINESS"));
  });

  it("treats unknown plan strings as FREE limits", () => {
    const unknown = getPlanLimits("STARTUP");
    expect(unknown).toEqual(getPlanLimits("FREE"));
  });
});
