import { describe, expect, it } from "vitest";
import { parseUtcDateTime } from "@/src/server/utils/dates";

describe("parseUtcDateTime", () => {
  it("reads a stored value as UTC", () => {
    expect(parseUtcDateTime("2026-09-25 14:32:07")?.toISOString()).toBe(
      "2026-09-25T14:32:07.000Z"
    );
  });

  it("returns null for zero, malformed and missing values", () => {
    expect(parseUtcDateTime("0000-00-00 00:00:00")).toBeNull();
    expect(parseUtcDateTime("yesterday")).toBeNull();
    expect(parseUtcDateTime(null)).toBeNull();
  });
});
