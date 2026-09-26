import { afterEach, describe, expect, it, vi } from "vitest";
import { importWithEnv } from "./test-env";

async function chatRepository(env: Record<string, string> = {}) {
  return importWithEnv(env, () => import("@/src/server/repositories/chat-repository"));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("centerChatWindow", () => {
  const ids = (from: number, count: number, step: number) =>
    Array.from({ length: count }, (_, index) => from + index * step);

  it("puts half the messages on each side of the anchor", async () => {
    const { centerChatWindow } = await chatRepository();

    expect(centerChatWindow(ids(99, 5, -1), ids(100, 5, 1), 4)).toEqual({
      ids: [98, 99, 100, 101],
      hasOlder: true,
      hasNewer: true
    });
  });

  it("fills the window from the other side near either end of the log", async () => {
    const { centerChatWindow } = await chatRepository();

    expect(centerChatWindow(ids(99, 5, -1), [100], 4)).toEqual({
      ids: [97, 98, 99, 100],
      hasOlder: true,
      hasNewer: false
    });
    expect(centerChatWindow([99], ids(100, 5, 1), 4)).toEqual({
      ids: [99, 100, 101, 102],
      hasOlder: false,
      hasNewer: true
    });
  });
});

describe("chat log times", () => {
  const instant = new Date("2026-09-25T16:00:00Z");

  it("reads the stats logger's clock", async () => {
    const { chatLogInstant, chatLogTime } = await chatRepository({
      BF3_STATS_LOGGER_TIME_ZONE: "Europe/Paris"
    });

    expect(chatLogTime(instant, false)).toBe("2026-09-25 18:00:00");
    expect(chatLogInstant("2026-09-25 18:00:00", false)?.toISOString()).toBe(
      instant.toISOString()
    );
  });

  it("reads UTC where AdKats writes the chat log", async () => {
    const { chatLogInstant, chatLogTime } = await chatRepository({
      BF3_STATS_LOGGER_TIME_ZONE: "Europe/Paris"
    });

    expect(chatLogTime(instant, true)).toBe("2026-09-25 16:00:00");
    expect(chatLogInstant("2026-09-25 16:00:00", true)?.toISOString()).toBe(
      instant.toISOString()
    );
  });
});
