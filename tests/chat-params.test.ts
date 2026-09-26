import { describe, expect, it } from "vitest";
import {
  chatFilterQuery,
  parseChatJumpTo,
  parseChatTerms,
  readChatParams as readChatParamsIn
} from "@/src/server/routing/chat-params";

const ZONE = "America/Los_Angeles";

function readChatParams(get: (name: string) => string | null) {
  return readChatParamsIn(get, ZONE);
}

function query(values: Record<string, string>) {
  const params = new URLSearchParams(values);
  return (name: string) => params.get(name);
}

describe("parseChatTerms", () => {
  it("reads words and quoted phrases", () => {
    expect(parseChatTerms('  ak  47 "nice   shot" gg ')).toEqual(["ak", "47", "nice shot", "gg"]);
  });

  it("drops repeats, empty phrases and stray quotes", () => {
    expect(parseChatTerms('GG gg "" "ak')).toEqual(["GG", "ak"]);
  });

  it("keeps at most eight terms of at most 100 characters", () => {
    expect(parseChatTerms("a b c d e f g h i j")).toHaveLength(8);
    expect(parseChatTerms("x".repeat(150))).toEqual(["x".repeat(100)]);
  });
});

describe("parseChatJumpTo", () => {
  it("reads a date and time in the zone it is given", () => {
    expect(parseChatJumpTo("2026-09-25T21:00", ZONE)?.toISOString()).toBe("2026-09-26T04:00:00.000Z");
    expect(parseChatJumpTo("2026-09-25", ZONE)?.toISOString()).toBe("2026-09-25T07:00:00.000Z");
  });

  it("moves a time that clocks skip past the change", () => {
    expect(parseChatJumpTo("2026-03-08T02:30", ZONE)?.toISOString()).toBe("2026-03-08T10:30:00.000Z");
  });

  it("rejects impossible, early and malformed values", () => {
    for (const value of [
      "2026-02-30T12:00",
      "2026-09-25T24:00",
      "0100-01-01",
      "9999-12-31T23:59",
      "yesterday",
      ""
    ]) {
      expect(parseChatJumpTo(value, ZONE)).toBeNull();
    }
  });
});

describe("readChatParams", () => {
  it("reads the filters", () => {
    expect(readChatParams(query({ q: " gg ", player: "17", channel: "Team" }))).toMatchObject({
      text: "gg",
      terms: ["gg"],
      playerId: 17,
      channel: "team",
      position: { kind: "latest" }
    });
  });

  it("ignores filters it cannot read", () => {
    expect(readChatParams(query({ player: "1abc", channel: "all" }))).toMatchObject({
      playerId: null,
      channel: null
    });
  });

  it("places the messages by msg, then at, then before, then after", () => {
    const all = { msg: "5", at: "2026-09-25T21:00", before: "9", after: "0" };

    expect(readChatParams(query(all)).position).toEqual({ kind: "around", messageId: 5 });
    expect(readChatParams(query({ ...all, msg: "" })).position).toEqual({
      kind: "at",
      instant: new Date("2026-09-26T04:00:00.000Z")
    });
    expect(readChatParams(query({ before: "9", after: "0" })).position).toEqual({
      kind: "before",
      messageId: 9
    });
    expect(readChatParams(query({ after: "0" })).position).toEqual({ kind: "after", messageId: 0 });
  });

  it("opens at the latest messages for ids it cannot read", () => {
    const unreadable: Array<Record<string, string>> = [
      { msg: "0" },
      { before: "-3" },
      { before: "50000000000000000000" },
      { after: "1e3" },
      { at: "tomorrow" }
    ];
    for (const values of unreadable) {
      expect(readChatParams(query(values)).position).toEqual({ kind: "latest" });
    }
  });
});

describe("chatFilterQuery", () => {
  it("keeps the set filters", () => {
    expect(
      chatFilterQuery({ text: "gg", terms: ["gg"], playerId: null, channel: "squad" })
    ).toEqual({ q: "gg", player: null, channel: "squad" });
  });
});
