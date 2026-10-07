import { describe, expect, it } from "vitest";
import { chatHref, chatQuery } from "@/components/chat/chat-href";

describe("chatQuery", () => {
  it("leaves out empty values", () => {
    expect(chatQuery({ q: "ak 47", player: null, channel: "", sid: "1" })).toBe("q=ak+47&sid=1");
  });
});

describe("chatHref", () => {
  it("applies changes to the query", () => {
    expect(chatHref("/servers/1/chat", "q=gg&player=17", { player: null, before: "40" })).toBe(
      "/servers/1/chat?q=gg&before=40"
    );
  });

  it("leaves a bare path without a query", () => {
    expect(chatHref("/servers/chat", "channel=team", { channel: null })).toBe("/servers/chat");
  });
});
