const GAMEMODE_NAME_BY_CODE: Record<string, string> = {
  ConquestLarge0: "Conquest Large",
  ConquestAssaultLarge0: "Conquest Assault Large",
  ConquestSmall0: "Conquest Small",
  ConquestAssaultSmall: "Conquest Assault Small",
  ConquestAssaultSmall1: "Conquest Assault Small 1",
  RushLarge0: "Rush Large",
  SquadRush0: "Squad Rush",
  SquadDeathMatch0: "Squad Deathmatch",
  TeamDeathMatch0: "Team Deathmatch",
  TeamDeathMatchC0: "Team Deathmatch CQC",
  GunMaster0: "Gun Master",
  Domination0: "Domination",
  TankSuperiority0: "Tank Superiority",
  Scavenger0: "Scavenger",
  CaptureTheFlag0: "Capture The Flag",
  AirSuperiority0: "Air Superiority"
};

const MAP_NAME_BY_CODE: Record<string, string> = {
  MP_001: "Grand Bazaar",
  MP_003: "Teheran Highway",
  MP_007: "Caspian Border",
  MP_011: "Seine Crossing",
  MP_012: "Operation Firestorm",
  MP_013: "Damavand Peak",
  MP_017: "Noshahr Canals",
  MP_018: "Kharg Island",
  MP_Subway: "Operation Metro",
  XP1_001: "Strike At Karkand",
  XP1_002: "Gulf Of Oman",
  XP1_003: "Sharqi Peninsula",
  XP1_004: "Wake Island",
  XP2_Factory: "Scrapmetal",
  XP2_Office: "Operation 925",
  XP2_Palace: "Donya Fortress",
  XP2_Skybar: "Ziba Tower",
  XP3_Desert: "Bandar Desert",
  XP3_Alborz: "Alborz Mountains",
  XP3_Shield: "Armored Shield",
  XP3_Valley: "Death Valley",
  XP4_FD: "Markaz Monolith",
  XP4_Parl: "Azadi Palace",
  XP4_Quake: "Epicenter",
  XP4_Rubble: "Talah Market",
  XP5_001: "Operation Riverside",
  XP5_002: "Nebandan Flats",
  XP5_003: "Kiasar Railroad",
  XP5_004: "Sabalan Pipeline"
};

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

const COUNTRY_FLAG_IMAGE_ALIAS: Record<string, string> = {
  EU: "europeanunion",
  UK: "gb"
};

export function formatGamemodeName(code: string | null): string {
  if (!code) {
    return "Unknown";
  }

  return GAMEMODE_NAME_BY_CODE[code] ?? code;
}

export function formatMapName(code: string | null): string {
  if (!code) {
    return "Unknown";
  }

  return MAP_NAME_BY_CODE[code] ?? code;
}

export function mapImagePath(code: string | null): string {
  if (!code) {
    return "/images/maps/missing.png";
  }

  const normalized = code.trim();
  if (!normalized) {
    return "/images/maps/missing.png";
  }

  return `/images/maps/${normalized}.png`;
}

const WEAPON_IMAGE_ALIAS: Record<string, string> = {
  CrossBow: "Crossbow",
  DamageArea: "Death",
  RoadKill: "Roadkill",
  SoldierCollision: "Death",
  Suicide: "Death"
};

const WEAPON_DISPLAY_NAME_BY_CODE: Record<string, string> = {
  "870MCS": "870 MCS",
  "DAO-12": "DAO-12",
  jackhammer: "MK3A1 Jackhammer",
  M1014: "M1014",
  M26Mass: "M26 MASS",
  Siaga20k: "Saiga20k",
  "SPAS-12": "SPAS-12",
  "USAS-12": "USAS-12",
  "AEK-971": "AEK-971",
  "AN-94_Abakan": "AN-94 Abakan",
  AS_Val: "AS Val",
  F2000: "F2000",
  FAMAS: "FAMAS",
  HK53: "HK53",
  M416: "M416",
  M16A4: "M16A4",
  "QBZ-95": "QBZ-95",
  "SCAR-L": "SCAR-L",
  Steyr_AUG: "Steyr AUG",
  AK74M: "AK74M",
  G3A3: "G3A3",
  KH2002: "KH2002",
  L85A2: "L85A2",
  ACR: "ACR",
  MTAR: "MTAR-21",
  "AKS-74u": "AKS-74u",
  M4A1: "M4A1",
  MP7: "MP7",
  "PP-2000": "PP-2000",
  SG_553_LB: "SG 553 LB",
  A91: "A91",
  G36C: "G36C",
  MagpulPDR: "MagpulPDR",
  P90: "P90",
  "SCAR-H": "SCAR-H",
  UMP45: "UMP45",
  MP5K: "MP5K",
  "FGM-148": "FGM-148",
  FIM92: "FIM-92",
  M320: "M320",
  "RPG-7": "RPG-7",
  SMAW: "SMAW",
  Sa18IGLA: "SA-18 Igla",
  Glock18: "Glock18",
  M1911: "M1911",
  M9: "M9",
  M93R: "M93R",
  Taurus_44: "Taurus .44",
  MP412Rex: "MP-412 REX",
  MP443: "MP443",
  JNG90: "JNG90",
  L96: "L96",
  M417: "M417",
  M39: "M39",
  M40A5: "M40A5",
  Mk11: "MK11",
  Model98B: "Model 98B",
  "QBU-88": "QBU-88",
  SKS: "SKS",
  SV98: "SV98",
  SVD: "SVD",
  LSAT: "LSAT",
  M240: "M240",
  M249: "M249",
  M27IAR: "M27 IAR",
  M60: "M60",
  MG36: "MG36",
  Pecheneg: "Pecheneg",
  "PP-19": "PP-19",
  "QBB-95": "QBB-95",
  "RPK-74M": "RPK-74M",
  Type88: "Type 88",
  L86: "L86",
  M15_AT_Mine: "M15 AT Mine",
  M67: "M67",
  C4: "C4",
  Claymore: "Claymore",
  Medkit: "Medkit",
  RoadKill: "Roadkill",
  Roadkill: "Roadkill",
  CrossBow: "Crossbow",
  Crossbow: "Crossbow",
  Defib: "Defibrillator",
  Knife_RazorBlade: "Razorblade",
  Melee: "Melee",
  Repair_Tool: "Repair Tool",
  Knife: "Knife",
  Death: "Machinery",
  missing: "Missing"
};

const WEAPON_CATEGORY_BY_DAMAGE_TYPE: Record<string, string> = {
  assaultrifle: "Assault",
  carbine: "Carbine",
  dmr: "DMR",
  explosive: "Explosive",
  handgun: "Handgun",
  impact: "Impact",
  lmg: "LMG",
  melee: "Melee",
  nonlethal: "Non-lethal",
  projectileexplosive: "Projectile",
  shotgun: "Shotgun",
  smg: "SMG",
  sniperrifle: "Sniper",
  suicide: "Other",
  vehicle: "Vehicle"
};

export function weaponImagePath(code: string | null): string {
  if (!code) {
    return "/images/weapons/missing.png";
  }

  const normalized = code.trim();
  if (!normalized) {
    return "/images/weapons/missing.png";
  }

  const fileCode = WEAPON_IMAGE_ALIAS[normalized] ?? normalized;
  return `/images/weapons/${fileCode}.png`;
}

export function formatWeaponName(code: string | null, fullName?: string | null): string {
  const normalized = code?.trim();
  if (normalized && WEAPON_DISPLAY_NAME_BY_CODE[normalized]) {
    return WEAPON_DISPLAY_NAME_BY_CODE[normalized];
  }

  const cleanFullName = fullName?.trim();
  if (cleanFullName && !cleanFullName.includes("/")) {
    return cleanFullName.replace(/_/g, " ");
  }

  if (normalized) {
    return normalized.replace(/_/g, " ");
  }

  return "Unknown";
}

export function normalizeWeaponCategory(damageType: string | null): string {
  const normalized = damageType?.trim().toLowerCase();
  if (!normalized) {
    return "other";
  }

  if (normalized.includes("vehicle") || normalized === "none") {
    return "vehicle";
  }

  return normalized;
}

export function formatWeaponCategory(damageType: string | null): string {
  const normalized = normalizeWeaponCategory(damageType);
  if (WEAPON_CATEGORY_BY_DAMAGE_TYPE[normalized]) {
    return WEAPON_CATEGORY_BY_DAMAGE_TYPE[normalized];
  }

  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function rankImagePath(rank: number | null): string {
  if (rank === null || !Number.isFinite(rank)) {
    return "/images/ranks/missing.png";
  }

  const normalizedRank = Math.floor(rank);
  if (normalizedRank < 0 || normalizedRank > 145) {
    return "/images/ranks/missing.png";
  }

  return `/images/ranks/r${normalizedRank}.png`;
}

export function formatCountryName(code: string | null): string {
  if (!code) {
    return "Unknown";
  }

  const normalizedCode = code.toUpperCase();
  if (normalizedCode === "--") {
    return "Unknown";
  }

  return regionNames.of(normalizedCode) ?? normalizedCode;
}

export function normalizeCountryCode(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const candidate = value.trim().toUpperCase();
  if (!candidate) {
    return null;
  }

  if (candidate === "--") {
    return candidate;
  }

  return /^[A-Z]{2}$/.test(candidate) ? candidate : null;
}

export function formatCountryFlag(code: string | null): string {
  const normalized = normalizeCountryCode(code);
  if (!normalized || normalized === "--") {
    return "🏳️";
  }

  return String.fromCodePoint(
    ...Array.from(normalized).map((char) => 127397 + char.charCodeAt(0))
  );
}

export function countryFlagImagePath(code: string | null): string {
  const normalized = normalizeCountryCode(code);
  if (!normalized || normalized === "--") {
    return "/images/flags/none.png";
  }

  return `/images/flags/${COUNTRY_FLAG_IMAGE_ALIAS[normalized] ?? normalized.toLowerCase()}.png`;
}
