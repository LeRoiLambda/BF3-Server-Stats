import { describe, expect, it } from "vitest";
import {
  chatFilterQuery,
  parseChatDayEnd,
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

describe("parseChatDayEnd", () => {
  const end = (date: string, hour = "", zone = ZONE) => parseChatDayEnd(date, hour, zone)?.toISOString();

  it("ends a day at the next midnight in the zone", () => {
    expect(end("2026-09-25")).toBe("2026-09-26T07:00:00.000Z");
    expect(end("2026-09-25", "", "Europe/Paris")).toBe("2026-09-25T22:00:00.000Z");
  });

  it("ends an hour at the next one", () => {
    expect(end("2026-09-25", "21")).toBe("2026-09-26T05:00:00.000Z");
    expect(end("2026-09-25", "0")).toBe("2026-09-25T08:00:00.000Z");
    expect(end("2026-09-25", "23")).toBe("2026-09-26T07:00:00.000Z");
  });

  it("ends hours on days clocks change on", () => {
    // 02:00 is skipped on 8 March 2026 in Los Angeles; 01:00 happens twice
    // on 1 November.
    expect(end("2026-03-08", "1")).toBe("2026-03-08T10:00:00.000Z");
    expect(end("2026-11-01", "1")).toBe("2026-11-01T10:00:00.000Z");
  });

  it("reads an hour it cannot read as the whole day", () => {
    for (const hour of ["24", "-1", "abc", "1.5"]) {
      expect(end("2026-09-25", hour)).toBe("2026-09-26T07:00:00.000Z");
    }
  });

  it("rejects impossible, early, late and malformed days", () => {
    for (const date of ["2026-02-30", "0100-01-01", "9999-12-31", "2026-9-25", "yesterday", ""]) {
      expect(parseChatDayEnd(date, "", ZONE)).toBeNull();
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

  it("places the messages by msg, then date, then before, then after", () => {
    const all = { msg: "5", date: "2026-09-25", hour: "21", before: "9", after: "0" };

    expect(readChatParams(query(all)).position).toEqual({ kind: "around", messageId: 5 });
    expect(readChatParams(query({ ...all, msg: "" })).position).toEqual({
      kind: "until",
      end: new Date("2026-09-26T05:00:00.000Z")
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
      { date: "tomorrow" }
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
