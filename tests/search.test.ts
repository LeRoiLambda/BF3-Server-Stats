import { describe, expect, it } from "vitest";
import {
  containsPattern,
  escapeLikePattern,
  searchableText,
  startsWithPattern
} from "@/src/server/db/search";

describe("LIKE patterns", () => {
  it("escapes wildcards and the escape character", () => {
    expect(escapeLikePattern("50%_off\\")).toBe("50\\%\\_off\\\\");
  });

  it("builds contains and starts-with patterns from escaped text", () => {
    expect(containsPattern("a_b")).toBe("%a\\_b%");
    expect(startsWithPattern("x%")).toBe("x\\%%");
  });
});

describe("searchableText", () => {
  it("compares the column as utf8mb4", () => {
    expect(searchableText("tpd.SoldierName")).toBe("CONVERT(tpd.SoldierName USING utf8mb4)");
  });
});
