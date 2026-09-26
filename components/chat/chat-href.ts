// Query strings and links for the chat page, shared by the page and the
// transcript that loads more messages in the browser.

export type ChatQueryValues = Record<string, string | null>;

// The non-empty values as a query string.
export function chatQuery(values: ChatQueryValues): string {
  const params = new URLSearchParams();

  for (const [name, value] of Object.entries(values)) {
    if (value) {
      params.set(name, value);
    }
  }

  return params.toString();
}

// `path` with `query`, after applying `changes`; null or empty removes a
// parameter.
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
