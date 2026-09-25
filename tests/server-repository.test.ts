import { describe, expect, it } from "vitest";
import { isServerOnline } from "@/src/server/repositories/server-repository";

describe("isServerOnline", () => {
  it("treats servers the logger tracks as online", () => {
    expect(isServerOnline({ connectionState: null })).toBe(true);
    expect(isServerOnline({ connectionState: "on" })).toBe(true);
    expect(isServerOnline({ connectionState: " ON " })).toBe(true);
  });

  it("treats servers switched off as offline", () => {
    expect(isServerOnline({ connectionState: "off" })).toBe(false);
  });
});
