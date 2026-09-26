// Ratios of stats columns in SQL.

// Kills per death, or wins per loss, counting none as one: a player who never
// died has a KDR equal to their kills, and ranks by it.
export function perAtLeastOneSql(countSql: string, perSql: string): string {
  return `(${countSql} / GREATEST(${perSql}, 1))`;
}
