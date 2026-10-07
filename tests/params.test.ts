import { describe, expect, it } from "vitest";
import { parsePositiveInt } from "@/src/server/routing/params";

describe("parsePositiveInt", () => {
  it("reads positive integers", () => {
    expect(parsePositiveInt("1")).toBe(1);
    expect(parsePositiveInt("117")).toBe(117);
  });

  it("rejects anything but digits", () => {
    for (const value of ["", "0", "01", "-1", "1abc", "1e3", "1.5", " 1", "9".repeat(16)]) {
      expect(parsePositiveInt(value)).toBeNull();
    }
  });
});
