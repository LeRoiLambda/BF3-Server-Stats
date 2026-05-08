export const SERVER_SECTIONS = [
  "home",
  "leaders",
  "suspicious",
  "countries",
  "maps",
  "server",
  "chat",
  "bans"
] as const;

export type ServerSection = (typeof SERVER_SECTIONS)[number];

export const SERVER_NAV_SECTIONS: ReadonlyArray<Exclude<ServerSection, "home">> =
  ["leaders", "suspicious", "countries", "maps", "server", "chat", "bans"];

export function isServerSection(value: string): value is ServerSection {
  return SERVER_SECTIONS.includes(value as ServerSection);
}

export function sectionLabel(section: ServerSection): string {
  switch (section) {
    case "home":
      return "Home";
    case "leaders":
      return "Leaderboard";
    case "suspicious":
      return "Suspicious";
    case "countries":
      return "Countries";
    case "maps":
      return "Maps";
    case "server":
      return "Server Info";
    case "chat":
      return "Chat";
    case "bans":
      return "Bans";
  }
}
