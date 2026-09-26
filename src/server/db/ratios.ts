export function perAtLeastOneSql(countSql: string, perSql: string): string {
  return `(${countSql} / GREATEST(${perSql}, 1))`;
}
