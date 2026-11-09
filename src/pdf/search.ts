import type { Pdf } from './engine';
export interface TextRun {
  text: string;
  hasEOL?: boolean;
  transform: number[];
  width: number;
  height: number;
}
export interface Segment {
  index: number;
  from: number;
  to: number;
}
export interface SearchMatch {
  page: number;
  segments: Segment[];
}
export function findInRuns(runs: TextRun[], query: string): Segment[][] {
  if (!query.trim()) return [];
  let text = '';
  const offsets: number[] = [];
  runs.forEach((run, i) => {
    if (i) {
      const previous = runs[i - 1];
      const gap = run.transform[4] - previous.transform[4] - previous.width;
      const sameLine =
        Math.abs(run.transform[5] - previous.transform[5]) <
        Math.max(run.height, previous.height) * 0.3;
      if (previous.hasEOL || !sameLine || gap > Math.max(run.height, previous.height) * 0.15)
        text += ' ';
    }
    offsets.push(text.length);
    text += run.text;
  });
  // Case conversion is per UTF-16 code unit so offsets stay stable even for dotted İ.
  const fold = (s: string) =>
    s
      .split('')
      .map((c) => c.toLowerCase().slice(0, 1))
      .join('');
  const haystack = fold(text),
    needle = fold(query.trim());
  const matches: Segment[][] = [];
  for (
    let start = haystack.indexOf(needle);
    start >= 0 && matches.length < 10000;
    start = haystack.indexOf(needle, start + needle.length)
  ) {
    const end = start + needle.length;
    matches.push(
      runs.flatMap((run, index) => {
        const from = Math.max(start, offsets[index]) - offsets[index],
          to = Math.min(end, offsets[index] + run.text.length) - offsets[index];
        return from < to ? [{ index, from, to }] : [];
      }),
    );
  }
  return matches;
}
const cache = new WeakMap<Pdf, Map<number, TextRun[]>>();
export async function searchPdf(
  pdf: Pdf,
  query: string,
  signal: AbortSignal,
): Promise<SearchMatch[]> {
  let pages = cache.get(pdf);
  if (!pages) {
    pages = new Map();
    cache.set(pdf, pages);
  }
  const results: SearchMatch[] = [];
  for (let page = 0; page < pdf.numPages && results.length < 10000; page++) {
    signal.throwIfAborted();
    let runs = pages.get(page);
    if (!runs) {
      const content = await (await pdf.getPage(page + 1)).getTextContent();
      runs = content.items.flatMap((item) =>
        'str' in item
          ? [
              {
                text: item.str,
                hasEOL: item.hasEOL,
                transform: item.transform,
                width: item.width,
                height: item.height,
              },
            ]
          : [],
      );
      pages.set(page, runs);
    }
    for (const segments of findInRuns(runs, query)) {
      if (results.length >= 10000) break;
      results.push({ page, segments });
    }
  }
  signal.throwIfAborted();
  return results;
}
