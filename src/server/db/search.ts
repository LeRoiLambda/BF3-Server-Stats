// Helpers for matching user-typed search text in SQL.

// Logger text columns are latin1 on databases created under MySQL 5.x, and
// comparing them with utf8mb4 search text fails (ER 1267). Converting the
// column to utf8mb4 is lossless for latin1 and utf8mb3.
export function searchableText(columnSql: string): string {
  return `CONVERT(${columnSql} USING utf8mb4)`;
}

// Escapes LIKE wildcards so `_`, `%` and `\` in the search text match literally.
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export function containsPattern(value: string): string {
  return `%${escapeLikePattern(value)}%`;
}

export function startsWithPattern(value: string): string {
  return `${escapeLikePattern(value)}%`;
}
