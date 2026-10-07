import { describe, expect, it } from "vitest";
import { formatCountryName, normalizeCountryCode } from "@/src/server/domain/bf3-reference";

describe("formatCountryName", () => {
  it("names region codes in any case", () => {
    expect(formatCountryName("us")).toBe("United States");
    expect(formatCountryName("DE")).toBe("Germany");
  });

  it("shows GeoIP pseudo-codes and missing codes as unknown", () => {
    expect(formatCountryName("a1")).toBe("Unknown");
    expect(formatCountryName("--")).toBe("Unknown");
    expect(formatCountryName(null)).toBe("Unknown");
  });
});

describe("normalizeCountryCode", () => {
  it("upper-cases two-letter codes and drops anything else", () => {
    expect(normalizeCountryCode(" de ")).toBe("DE");
    expect(normalizeCountryCode("a1")).toBeNull();
    expect(normalizeCountryCode("")).toBeNull();
  });
});
