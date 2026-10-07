// Case- and accent-insensitive, like utf8mb4's default collations.

export type HighlightPart = {
  text: string;
  match: boolean;
};

export function foldForSearch(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function highlightParts(text: string, terms: string[]): HighlightPart[] {
  const foldedTerms = terms.map(foldForSearch).filter(Boolean);
  if (foldedTerms.length === 0) {
    return [{ text, match: false }];
  }

  let folded = "";
  const starts: number[] = [];
  const ends: number[] = [];
  let index = 0;
  for (const character of text) {
    const piece = foldForSearch(character);
    for (let unit = 0; unit < piece.length; unit += 1) {
      starts.push(index);
      ends.push(index + character.length);
    }
    folded += piece;
    index += character.length;
  }

  const ranges: Array<[number, number]> = [];
  for (const term of foldedTerms) {
    for (let from = folded.indexOf(term); from !== -1; from = folded.indexOf(term, from + 1)) {
      ranges.push([starts[from], ends[from + term.length - 1]]);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);

  const parts: HighlightPart[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (end <= cursor) {
      continue;
    }
    if (start > cursor) {
      parts.push({ text: text.slice(cursor, start), match: false });
    }
    parts.push({ text: text.slice(Math.max(start, cursor), end), match: true });
    cursor = end;
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), match: false });
  }

  return parts.reduce<HighlightPart[]>((merged, part) => {
    const previous = merged.at(-1);
    if (previous && previous.match === part.match) {
      previous.text += part.text;
    } else {
      merged.push({ ...part });
    }
    return merged;
  }, []);
}
