export type ChatQueryValues = Record<string, string | null>;

export function chatQuery(values: ChatQueryValues): string {
  const params = new URLSearchParams();

  for (const [name, value] of Object.entries(values)) {
    if (value) {
      params.set(name, value);
    }
  }

  return params.toString();
}

export function chatHref(path: string, query: string, changes: ChatQueryValues = {}): string {
  const params = new URLSearchParams(query);

  for (const [name, value] of Object.entries(changes)) {
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
  }

  const text = params.toString();
  return text ? `${path}?${text}` : path;
}
