import { RowDataPacket } from "mysql2";
import { getDbPool } from "@/src/server/db/pool";
import { hasTable } from "@/src/server/db/schema";
import { toDateTimeString } from "@/src/server/utils/dates";

export type ModerationStatusKind = "none" | "activeBan" | "expiredBan";
export type ModerationBanDuration = "permanent" | "temporary" | null;

export type ModerationStatus = {
  kind: ModerationStatusKind;
  label: string;
  detail: string | null;
  startedAt: string | null;
  endsAt: string | null;
  banDuration: ModerationBanDuration;
};

export type ModerationMuteStatus = {
  active: boolean;
  label: string;
  detail: string | null;
  startedAt: string | null;
  endsAt: string | null;
  durationLabel: string | null;
};

export type ModerationPoints = {
  punishPoints: number;
  forgivePoints: number;
  totalPoints: number;
  source: "global" | "server";
};

export type ModerationLadderKey = "punishment";

export type ModerationLadderStepState = "past" | "next" | "future";
export type ModerationSeverity = "neutral" | "low" | "medium" | "high" | "critical";

export type ModerationLadderStep = {
  index: number;
  token: string;
  label: string;
  state: ModerationLadderStepState;
  severity: ModerationSeverity;
};

export type ModerationLadder = {
  key: ModerationLadderKey;
  label: string;
  steps: ModerationLadderStep[];
};

export type ModerationAction = {
  recordId: number;
  serverId: number | null;
  occurredAt: string | null;
  label: string;
  commandLabel: string;
  actionLabel: string;
  actor: string | null;
  message: string | null;
  severity: ModerationSeverity;
};

export type PlayerModerationSummary = {
  available: boolean;
  currentStatus: ModerationStatus;
  muteStatus: ModerationMuteStatus;
  points: ModerationPoints | null;
  ladders: ModerationLadder[];
  nextStep: ModerationLadderStep | null;
  recentActions: ModerationAction[];
};

export type PlayerModerationInput = {
  playerId: number;
  serverId: number | null;
  recentLimit?: number;
};

export type ModerationPolicyInput = {
  serverId: number | null;
};

export type ModerationPolicy = {
  available: boolean;
  combineServerPunishments: boolean;
  ladders: ModerationLadder[];
};

type ModerationAvailability = {
  bans: boolean;
  settings: boolean;
  infractionsGlobal: boolean;
  infractionsServer: boolean;
  records: boolean;
  commands: boolean;
};

type BanRow = RowDataPacket & {
  banStatus: string | null;
  banNotes: string | null;
  banStartTime: string | Date | null;
  banEndTime: string | Date | null;
  commandType?: number | null;
  commandAction?: number | null;
  commandText?: string | null;
  recordMessage?: string | null;
};

type SettingRow = RowDataPacket & {
  serverId: number;
  settingName: string;
  settingValue: string | null;
};

type InfractionRow = RowDataPacket & {
  punishPoints: number | null;
  forgivePoints: number | null;
  totalPoints: number | null;
};

type RecordRow = RowDataPacket & {
  recordId: number;
  serverId: number | null;
  commandType: number | null;
  commandAction: number | null;
  commandNumeric: number | null;
  sourceId: number | null;
  sourceName: string | null;
  recordMessage: string | null;
  recordTime: string | Date | null;
  typeCommandKey?: string | null;
  typeCommandText?: string | null;
  typeCommandName?: string | null;
  actionCommandKey?: string | null;
  actionCommandText?: string | null;
  actionCommandName?: string | null;
};

type ParsedSettings = {
  combineServerPunishments: boolean;
  ladders: ModerationLadder[];
};

const DEFAULT_STATUS: ModerationStatus = {
  kind: "none",
  label: "No active punishment",
  detail: null,
  startedAt: null,
  endsAt: null,
  banDuration: null
};

const DEFAULT_MUTE_STATUS: ModerationMuteStatus = {
  active: false,
  label: "No active mute found",
  detail: null,
  startedAt: null,
  endsAt: null,
  durationLabel: null
};

const LADDER_SETTINGS: Array<{
  key: ModerationLadderKey;
  label: string;
  settingName: string;
}> = [
  {
    key: "punishment",
    label: "Punishment Ladder",
    settingName: "Punishment Hierarchy"
  }
];

const SETTING_NAMES = [
  ...LADDER_SETTINGS.map((setting) => setting.settingName),
  "Combine Server Punishments"
];

const MODERATION_COMMAND_TEXTS = [
  "warn",
  "mute",
  "unmute",
  "punish",
  "forgive",
  "kill",
  "kick",
  "tban",
  "ban",
  "unban",
  "enforceban",
  "pretban",
  "preban",
  "fban"
];

const MODERATION_COMMAND_IDS = [3, 6, 7, 8, 9, 10, 11, 36, 37, 50, 72, 73, 92, 146];
const MODERATION_COMMAND_KEY_PATTERNS = [
  "%ban%",
  "%mute%",
  "%warn%",
  "%punish%",
  "%forgive%"
];
const PERMANENT_BAN_COMMAND_TEXTS = new Set(["ban", "fban"]);
const TEMPORARY_BAN_COMMAND_TEXTS = new Set(["tban"]);
const PERMANENT_BAN_COMMAND_IDS = new Set([8, 50]);
const TEMPORARY_BAN_COMMAND_IDS = new Set([7]);

function toFiniteNumber(value: unknown): number {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function cleanDateTime(value: unknown): string | null {
  const formatted = toDateTimeString(value);
  if (!formatted || formatted.startsWith("0000-00-00")) {
    return null;
  }

  return formatted;
}

function banDurationFromRow(row: BanRow): ModerationBanDuration {
  const commandText = row.commandText?.trim().toLowerCase();
  if (commandText && PERMANENT_BAN_COMMAND_TEXTS.has(commandText)) {
    return "permanent";
  }

  if (commandText && TEMPORARY_BAN_COMMAND_TEXTS.has(commandText)) {
    return "temporary";
  }

  const commandId = Number(row.commandAction ?? row.commandType ?? 0);
  if (PERMANENT_BAN_COMMAND_IDS.has(commandId)) {
    return "permanent";
  }

  if (TEMPORARY_BAN_COMMAND_IDS.has(commandId)) {
    return "temporary";
  }

  return null;
}

function activeBanLabel(duration: ModerationBanDuration): string {
  if (duration === "permanent") {
    return "Permanent ban";
  }

  if (duration === "temporary") {
    return "Temporary ban";
  }

  return "Active ban";
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseBoolean(value: string | null | undefined, defaultValue: boolean): boolean {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

async function getModerationAvailability(): Promise<ModerationAvailability> {
  const [bans, settings, infractionsGlobal, infractionsServer, records, commands] =
    await Promise.all([
      hasTable("adkats_bans"),
      hasTable("adkats_settings"),
      hasTable("adkats_infractions_global"),
      hasTable("adkats_infractions_server"),
      hasTable("adkats_records_main"),
      hasTable("adkats_commands")
    ]);

  return {
    bans,
    settings,
    infractionsGlobal,
    infractionsServer,
    records,
    commands
  };
}

function placeholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ");
}

async function getCurrentStatus(
  playerId: number,
  availability: ModerationAvailability
): Promise<ModerationStatus> {
  if (!availability.bans) {
    return DEFAULT_STATUS;
  }

  const pool = getDbPool();
  const recordsJoin = availability.records
    ? "LEFT JOIN adkats_records_main abr ON abr.record_id = adk.latest_record_id"
    : "";
  const recordMessageField = availability.records ? ", abr.record_message AS recordMessage" : "";
  const recordCommandFields = availability.records
    ? `,
        abr.command_type AS commandType,
        abr.command_action AS commandAction`
    : "";
  const commandJoins =
    availability.records && availability.commands
      ? `
        LEFT JOIN adkats_commands type_cmd ON type_cmd.command_id = abr.command_type
        LEFT JOIN adkats_commands action_cmd ON action_cmd.command_id = abr.command_action`
      : "";
  const commandTextField =
    availability.records && availability.commands
      ? ", COALESCE(LOWER(action_cmd.command_text), LOWER(type_cmd.command_text)) AS commandText"
      : "";
  const [rows] = await pool.query<BanRow[]>(
    `
      SELECT
        adk.ban_status AS banStatus,
        adk.ban_notes AS banNotes,
        adk.ban_startTime AS banStartTime,
        adk.ban_endTime AS banEndTime
        ${recordMessageField}
        ${recordCommandFields}
        ${commandTextField}
      FROM adkats_bans adk
      ${recordsJoin}
      ${commandJoins}
      WHERE adk.player_id = ?
      ORDER BY
        CASE
          WHEN adk.ban_status = 'Active' THEN 0
          WHEN adk.ban_status = 'Expired' THEN 1
          ELSE 2
        END,
        adk.ban_startTime DESC,
        adk.latest_record_id DESC
      LIMIT 1
    `,
    [playerId]
  );

  const row = rows[0];
  if (!row) {
    return DEFAULT_STATUS;
  }

  const detail = row.recordMessage || row.banNotes || null;
  const banDuration = banDurationFromRow(row);
  if (row.banStatus === "Active") {
    return {
      kind: "activeBan",
      label: activeBanLabel(banDuration),
      detail,
      startedAt: cleanDateTime(row.banStartTime),
      endsAt: cleanDateTime(row.banEndTime),
      banDuration
    };
  }

  if (row.banStatus === "Expired") {
    return {
      kind: "expiredBan",
      label: "Expired ban",
      detail,
      startedAt: cleanDateTime(row.banStartTime),
      endsAt: cleanDateTime(row.banEndTime),
      banDuration
    };
  }

  return DEFAULT_STATUS;
}

function isMuteRecord(row: RecordRow): boolean {
  return row.actionCommandText?.trim().toLowerCase() === "mute" || row.commandAction === 11;
}

function isUnmuteRecord(row: RecordRow): boolean {
  return row.actionCommandText?.trim().toLowerCase() === "unmute" || row.commandAction === 146;
}

function buildMuteStatus(row: RecordRow | undefined): ModerationMuteStatus {
  if (!row || isUnmuteRecord(row) || !isMuteRecord(row)) {
    return DEFAULT_MUTE_STATUS;
  }

  const durationMinutes = Number(row.commandNumeric ?? 0);
  const startedAt = toDate(row.recordTime);
  if (!startedAt || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return DEFAULT_MUTE_STATUS;
  }

  const endsAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
  if (endsAt.getTime() <= Date.now()) {
    return DEFAULT_MUTE_STATUS;
  }

  const remainingMinutes = Math.max(1, Math.ceil((endsAt.getTime() - Date.now()) / 60000));

  return {
    active: true,
    label: "Muted",
    detail: row.recordMessage || null,
    startedAt: cleanDateTime(startedAt),
    endsAt: cleanDateTime(endsAt),
    durationLabel: `${formatMinutes(remainingMinutes)} left`
  };
}

async function getCurrentMuteStatus(
  input: PlayerModerationInput,
  availability: ModerationAvailability
): Promise<ModerationMuteStatus> {
  if (!availability.records) {
    return DEFAULT_MUTE_STATUS;
  }

  const pool = getDbPool();
  const serverCondition = input.serverId === null ? "" : "AND r.server_id = ?";
  const serverParams = input.serverId === null ? [] : [input.serverId];

  if (availability.commands) {
    const [rows] = await pool.query<RecordRow[]>(
      `
        SELECT
          r.record_id AS recordId,
          r.server_id AS serverId,
          r.command_type AS commandType,
          r.command_action AS commandAction,
          r.command_numeric AS commandNumeric,
          r.source_id AS sourceId,
          r.source_name AS sourceName,
          r.record_message AS recordMessage,
          r.record_time AS recordTime,
          action_cmd.command_text AS actionCommandText,
          action_cmd.command_name AS actionCommandName
        FROM adkats_records_main r
        LEFT JOIN adkats_commands action_cmd ON action_cmd.command_id = r.command_action
        WHERE r.target_id = ?
          ${serverCondition}
          AND (r.source_id IS NULL OR r.source_id <> r.target_id)
          AND (
            action_cmd.command_text IN ('mute', 'unmute')
            OR r.command_action IN (11, 146)
          )
        ORDER BY r.record_time DESC, r.record_id DESC
        LIMIT 1
      `,
      [input.playerId, ...serverParams]
    );

    return buildMuteStatus(rows[0]);
  }

  const [rows] = await pool.query<RecordRow[]>(
    `
      SELECT
        r.record_id AS recordId,
        r.server_id AS serverId,
        r.command_type AS commandType,
        r.command_action AS commandAction,
        r.command_numeric AS commandNumeric,
        r.source_id AS sourceId,
        r.source_name AS sourceName,
        r.record_message AS recordMessage,
        r.record_time AS recordTime
      FROM adkats_records_main r
      WHERE r.target_id = ?
        ${serverCondition}
        AND (r.source_id IS NULL OR r.source_id <> r.target_id)
        AND r.command_action IN (11, 146)
      ORDER BY r.record_time DESC, r.record_id DESC
      LIMIT 1
    `,
    [input.playerId, ...serverParams]
  );

  return buildMuteStatus(rows[0]);
}

async function listSettingsRows(
  serverId: number | null,
  availability: ModerationAvailability
): Promise<SettingRow[]> {
  if (!availability.settings) {
    return [];
  }

  const pool = getDbPool();
  const namesSql = placeholders(SETTING_NAMES.length);
  if (serverId !== null) {
    const [serverRows] = await pool.query<SettingRow[]>(
      `
        SELECT
          server_id AS serverId,
          setting_name AS settingName,
          setting_value AS settingValue
        FROM adkats_settings
        WHERE server_id = ?
          AND setting_name IN (${namesSql})
        ORDER BY setting_name
      `,
      [serverId, ...SETTING_NAMES]
    );

    if (serverRows.length > 0) {
      return serverRows;
    }
  }

  const [rows] = await pool.query<SettingRow[]>(
    `
      SELECT
        server_id AS serverId,
        setting_name AS settingName,
        setting_value AS settingValue
      FROM adkats_settings
      WHERE setting_name IN (${namesSql})
      ORDER BY server_id ASC, setting_name ASC
    `,
    SETTING_NAMES
  );

  return rows;
}

function selectSettings(rows: SettingRow[], serverId: number | null): Map<string, string> {
  if (rows.length === 0) {
    return new Map();
  }

  const selectedServerId =
    serverId !== null && rows.some((row) => Number(row.serverId) === serverId)
      ? serverId
      : Number(rows[0].serverId);

  return new Map(
    rows
      .filter((row) => Number(row.serverId) === selectedServerId)
      .filter((row) => row.settingValue !== null)
      .map((row) => [row.settingName, String(row.settingValue)])
  );
}

function parseDurationToken(value: string): string | null {
  const numericMinutes = Number.parseInt(value, 10);
  if (/^\d+$/.test(value) && Number.isFinite(numericMinutes)) {
    return formatMinutes(numericMinutes);
  }

  const match = value.match(/^(\d+)?(day|days|week|weeks|month|months|year|years|hour|hours)$/);
  if (!match) {
    return null;
  }

  const amount = match[1] ? Number.parseInt(match[1], 10) : 1;
  const unit = match[2].replace(/s$/, "");
  return `${amount} ${unit}${amount === 1 ? "" : "s"}`;
}

function formatMinutes(minutes: number): string {
  if (minutes >= 525600) {
    const years = Math.round(minutes / 525600);
    return `${years} year${years === 1 ? "" : "s"}`;
  }

  if (minutes >= 43200) {
    const months = Math.round(minutes / 43200);
    return `${months} month${months === 1 ? "" : "s"}`;
  }

  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} day${days === 1 ? "" : "s"}`;
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function formatLadderToken(token: string): string {
  const normalized = token.trim().toLowerCase();

  switch (normalized) {
    case "warn":
      return "Warning";
    case "kill":
      return "Kill";
    case "kick":
      return "Kick";
    case "mute":
      return "Mute";
    case "unmute":
      return "Unmute";
    case "ban":
      return "Permanent ban";
    case "forgive":
      return "Forgive";
    default:
      break;
  }

  if (normalized.startsWith("tban")) {
    const duration = parseDurationToken(normalized.slice(4));
    return duration ? `Temp ban: ${duration}` : "Temp ban";
  }

  return token.trim();
}

function severityForToken(token: string): ModerationSeverity {
  const normalized = token.trim().toLowerCase();
  if (normalized === "ban" || normalized === "preban") {
    return "critical";
  }

  if (normalized.startsWith("tban") || normalized === "pretban") {
    return "high";
  }

  if (normalized === "kick" || normalized === "mute") {
    return "medium";
  }

  if (normalized === "kill" || normalized === "warn") {
    return "low";
  }

  return "neutral";
}

function buildLadder(
  key: ModerationLadderKey,
  label: string,
  rawValue: string | null,
  totalPoints: number | null
): ModerationLadder | null {
  if (!rawValue?.trim()) {
    return null;
  }

  const tokens = rawValue
    .split("|")
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return null;
  }

  const steps = tokens.map((token, index) => {
    const isPrimary = key === "punishment" && totalPoints !== null;
    const state: ModerationLadderStepState = !isPrimary
      ? "future"
      : index < totalPoints
        ? "past"
        : index === totalPoints
          ? "next"
          : "future";

    return {
      index,
      token,
      label: formatLadderToken(token),
      state,
      severity: severityForToken(token)
    };
  });

  return {
    key,
    label,
    steps
  };
}

function parseSettings(
  rows: SettingRow[],
  serverId: number | null,
  points: ModerationPoints | null
): ParsedSettings {
  const selectedSettings = selectSettings(rows, serverId);
  const totalPoints = points?.totalPoints ?? null;
  const ladders = LADDER_SETTINGS.map((ladderSetting) =>
    buildLadder(
      ladderSetting.key,
      ladderSetting.label,
      selectedSettings.get(ladderSetting.settingName) ?? null,
      totalPoints
    )
  ).filter((ladder): ladder is ModerationLadder => ladder !== null);

  return {
    combineServerPunishments: parseBoolean(
      selectedSettings.get("Combine Server Punishments"),
      true
    ),
    ladders
  };
}

async function getInfractionPoints(
  input: PlayerModerationInput,
  availability: ModerationAvailability,
  combineServerPunishments: boolean
): Promise<ModerationPoints | null> {
  const pool = getDbPool();

  if (
    input.serverId !== null &&
    !combineServerPunishments &&
    availability.infractionsServer
  ) {
    const [rows] = await pool.query<InfractionRow[]>(
      `
        SELECT
          punish_points AS punishPoints,
          forgive_points AS forgivePoints,
          total_points AS totalPoints
        FROM adkats_infractions_server
        WHERE player_id = ?
          AND server_id = ?
        LIMIT 1
      `,
      [input.playerId, input.serverId]
    );

    return {
      punishPoints: toFiniteNumber(rows[0]?.punishPoints),
      forgivePoints: toFiniteNumber(rows[0]?.forgivePoints),
      totalPoints: toFiniteNumber(rows[0]?.totalPoints),
      source: "server"
    };
  }

  if (availability.infractionsGlobal) {
    const [rows] = await pool.query<InfractionRow[]>(
      `
        SELECT
          punish_points AS punishPoints,
          forgive_points AS forgivePoints,
          total_points AS totalPoints
        FROM adkats_infractions_global
        WHERE player_id = ?
        LIMIT 1
      `,
      [input.playerId]
    );

    return {
      punishPoints: toFiniteNumber(rows[0]?.punishPoints),
      forgivePoints: toFiniteNumber(rows[0]?.forgivePoints),
      totalPoints: toFiniteNumber(rows[0]?.totalPoints),
      source: "global"
    };
  }

  if (input.serverId !== null && availability.infractionsServer) {
    const [rows] = await pool.query<InfractionRow[]>(
      `
        SELECT
          punish_points AS punishPoints,
          forgive_points AS forgivePoints,
          total_points AS totalPoints
        FROM adkats_infractions_server
        WHERE player_id = ?
          AND server_id = ?
        LIMIT 1
      `,
      [input.playerId, input.serverId]
    );

    return {
      punishPoints: toFiniteNumber(rows[0]?.punishPoints),
      forgivePoints: toFiniteNumber(rows[0]?.forgivePoints),
      totalPoints: toFiniteNumber(rows[0]?.totalPoints),
      source: "server"
    };
  }

  return null;
}

function commandBaseLabel(
  commandId: number | null,
  commandText: string | null | undefined,
  commandName: string | null | undefined
): string {
  const normalized = commandText?.trim().toLowerCase() ?? "";

  switch (normalized) {
    case "warn":
      return "Warning";
    case "mute":
      return "Mute";
    case "unmute":
      return "Unmute";
    case "punish":
      return "Punishment";
    case "forgive":
      return "Forgive";
    case "kill":
      return "Kill";
    case "kick":
      return "Kick";
    case "tban":
    case "pretban":
      return "Temp ban";
    case "ban":
    case "preban":
    case "fban":
      return "Permanent ban";
    case "unban":
      return "Unban";
    case "enforceban":
      return "Ban enforcement";
    default:
      break;
  }

  return commandName || commandText || (commandId === null ? "Moderation action" : `Command ${commandId}`);
}

function isTempBanCommand(commandText: string | null | undefined): boolean {
  const normalized = commandText?.trim().toLowerCase();
  return normalized === "tban" || normalized === "pretban";
}

function formatActionLabel(row: RecordRow): {
  label: string;
  commandLabel: string;
  actionLabel: string;
} {
  const commandLabel = commandBaseLabel(
    row.commandType,
    row.typeCommandText,
    row.typeCommandName
  );
  let actionLabel = commandBaseLabel(
    row.commandAction,
    row.actionCommandText,
    row.actionCommandName
  );

  if (isTempBanCommand(row.actionCommandText) && row.commandNumeric && row.commandNumeric > 0) {
    actionLabel = `Temp ban: ${formatMinutes(Number(row.commandNumeric))}`;
  }

  if (row.typeCommandText?.trim().toLowerCase() === "punish" && actionLabel !== "Punishment") {
    return {
      label: `Punishment: ${actionLabel}`,
      commandLabel,
      actionLabel
    };
  }

  if (commandLabel === actionLabel) {
    return {
      label: actionLabel,
      commandLabel,
      actionLabel
    };
  }

  return {
    label: `${commandLabel}: ${actionLabel}`,
    commandLabel,
    actionLabel
  };
}

function severityForAction(row: RecordRow): ModerationSeverity {
  const actionText = row.actionCommandText?.trim().toLowerCase() ?? "";
  const typeText = row.typeCommandText?.trim().toLowerCase() ?? "";
  const token = actionText || typeText;
  return severityForToken(token);
}

async function listRecentActions(
  input: PlayerModerationInput,
  availability: ModerationAvailability
): Promise<ModerationAction[]> {
  if (!availability.records) {
    return [];
  }

  const pool = getDbPool();
  const limit = Math.max(1, Math.min(20, Math.floor(input.recentLimit ?? 8)));
  const serverCondition = input.serverId === null ? "" : "AND r.server_id = ?";
  const serverParams = input.serverId === null ? [] : [input.serverId];

  if (availability.commands) {
    const textSql = placeholders(MODERATION_COMMAND_TEXTS.length);
    const patternSql = MODERATION_COMMAND_KEY_PATTERNS.map(
      () => "LOWER(type_cmd.command_key) LIKE ?"
    ).join(" OR ");
    const actionPatternSql = MODERATION_COMMAND_KEY_PATTERNS.map(
      () => "LOWER(action_cmd.command_key) LIKE ?"
    ).join(" OR ");
    const [rows] = await pool.query<RecordRow[]>(
      `
        SELECT
          r.record_id AS recordId,
          r.server_id AS serverId,
          r.command_type AS commandType,
          r.command_action AS commandAction,
          r.command_numeric AS commandNumeric,
          r.source_id AS sourceId,
          r.source_name AS sourceName,
          r.record_message AS recordMessage,
          r.record_time AS recordTime,
          type_cmd.command_key AS typeCommandKey,
          type_cmd.command_text AS typeCommandText,
          type_cmd.command_name AS typeCommandName,
          action_cmd.command_key AS actionCommandKey,
          action_cmd.command_text AS actionCommandText,
          action_cmd.command_name AS actionCommandName
        FROM adkats_records_main r
        LEFT JOIN adkats_commands type_cmd ON type_cmd.command_id = r.command_type
        LEFT JOIN adkats_commands action_cmd ON action_cmd.command_id = r.command_action
        WHERE r.target_id = ?
          ${serverCondition}
          AND (r.source_id IS NULL OR r.source_id <> r.target_id)
          AND (
            LOWER(type_cmd.command_text) IN (${textSql})
            OR LOWER(action_cmd.command_text) IN (${textSql})
            OR ${patternSql}
            OR ${actionPatternSql}
          )
        ORDER BY r.record_time DESC, r.record_id DESC
        LIMIT ?
      `,
      [
        input.playerId,
        ...serverParams,
        ...MODERATION_COMMAND_TEXTS,
        ...MODERATION_COMMAND_TEXTS,
        ...MODERATION_COMMAND_KEY_PATTERNS,
        ...MODERATION_COMMAND_KEY_PATTERNS,
        limit
      ]
    );

    return rows.map(formatRecordRow);
  }

  const idSql = placeholders(MODERATION_COMMAND_IDS.length);
  const [rows] = await pool.query<RecordRow[]>(
    `
      SELECT
        r.record_id AS recordId,
        r.server_id AS serverId,
        r.command_type AS commandType,
        r.command_action AS commandAction,
        r.command_numeric AS commandNumeric,
        r.source_id AS sourceId,
        r.source_name AS sourceName,
        r.record_message AS recordMessage,
        r.record_time AS recordTime
      FROM adkats_records_main r
      WHERE r.target_id = ?
        ${serverCondition}
        AND (r.source_id IS NULL OR r.source_id <> r.target_id)
        AND (
          r.command_type IN (${idSql})
          OR r.command_action IN (${idSql})
        )
      ORDER BY r.record_time DESC, r.record_id DESC
      LIMIT ?
    `,
    [
      input.playerId,
      ...serverParams,
      ...MODERATION_COMMAND_IDS,
      ...MODERATION_COMMAND_IDS,
      limit
    ]
  );

  return rows.map(formatRecordRow);
}

function formatRecordRow(row: RecordRow): ModerationAction {
  const labels = formatActionLabel(row);

  return {
    recordId: Number(row.recordId),
    serverId: row.serverId === null || row.serverId === undefined ? null : Number(row.serverId),
    occurredAt: cleanDateTime(row.recordTime),
    label: labels.label,
    commandLabel: labels.commandLabel,
    actionLabel: labels.actionLabel,
    actor: row.sourceName || null,
    message: row.recordMessage || null,
    severity: severityForAction(row)
  };
}

export async function getPlayerModerationSummary(
  input: PlayerModerationInput
): Promise<PlayerModerationSummary> {
  const availability = await getModerationAvailability();
  const available =
    availability.bans ||
    availability.settings ||
    availability.infractionsGlobal ||
    availability.infractionsServer ||
    availability.records;

  if (!available) {
    return {
      available: false,
      currentStatus: DEFAULT_STATUS,
      muteStatus: DEFAULT_MUTE_STATUS,
      points: null,
      ladders: [],
      nextStep: null,
      recentActions: []
    };
  }

  const [currentStatus, muteStatus, settingsRows] = await Promise.all([
    getCurrentStatus(input.playerId, availability),
    getCurrentMuteStatus(input, availability),
    listSettingsRows(input.serverId, availability)
  ]);
  const initialSettings = parseSettings(settingsRows, input.serverId, null);
  const points = await getInfractionPoints(
    input,
    availability,
    initialSettings.combineServerPunishments
  );
  const settings = parseSettings(settingsRows, input.serverId, points);
  const recentActions = await listRecentActions(input, availability);
  const primaryLadder = settings.ladders.find((ladder) => ladder.key === "punishment");

  return {
    available: true,
    currentStatus,
    muteStatus,
    points,
    ladders: settings.ladders,
    nextStep: primaryLadder?.steps.find((step) => step.state === "next") ?? null,
    recentActions
  };
}

export async function getModerationPolicy(
  input: ModerationPolicyInput
): Promise<ModerationPolicy> {
  const availability = await getModerationAvailability();
  if (!availability.settings) {
    return {
      available: false,
      combineServerPunishments: true,
      ladders: []
    };
  }

  const settingsRows = await listSettingsRows(input.serverId, availability);
  const settings = parseSettings(settingsRows, input.serverId, null);

  return {
    available: settings.ladders.length > 0,
    combineServerPunishments: settings.combineServerPunishments,
    ladders: settings.ladders
  };
}
