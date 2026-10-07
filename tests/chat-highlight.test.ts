import { describe, expect, it } from "vitest";
import { highlightParts } from "@/components/chat/chat-highlight";

function marked(text: string, terms: string[]): string {
  return highlightParts(text, terms)
    .map((part) => (part.match ? `[${part.text}]` : part.text))
    .join("");
}

describe("highlightParts", () => {
  it("marks every term, ignoring case", () => {
    expect(marked("GG wp, gg", ["gg"])).toBe("[GG] wp, [gg]");
  });

  it("ignores accents, as the database does", () => {
    expect(marked("Grüße aus München", ["munchen"])).toBe("Grüße aus [München]");
    expect(marked("rush B", ["ü"])).toBe("r[u]sh B");
  });

  it("joins overlapping and touching matches", () => {
    expect(marked("nice shot", ["nice", "ce sh", "hot"])).toBe("[nice shot]");
  });

  it("keeps characters that fold to several units whole", () => {
    expect(marked("İstanbul 😀 gg", ["gg", "istanbul"])).toBe("[İstanbul] 😀 [gg]");
  });

  it("leaves text without terms as it is", () => {
    expect(highlightParts("gg", [])).toEqual([{ text: "gg", match: false }]);
  });
});
