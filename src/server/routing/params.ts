export function firstValue(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

const POSITIVE_INT_PATTERN = /^[1-9]\d{0,14}$/;

export function parsePositiveInt(value: string): number | null {
  return POSITIVE_INT_PATTERN.test(value) ? Number(value) : null;
}

