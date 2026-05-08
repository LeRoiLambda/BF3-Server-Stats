export function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toFixedNumber(value: unknown, digits = 2): number {
  return Number(toNumber(value).toFixed(digits));
}

