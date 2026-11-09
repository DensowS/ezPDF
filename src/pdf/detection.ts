import type { Rect } from '../domain';
export interface TextBox extends Rect {
  text: string;
}
// Scan contiguous pale, neutral pixels. Text holes are tolerated inside a region.
// Coordinates stay in unrotated, top-left page space throughout the domain.
export function detectGrayRegions(data: Uint8ClampedArray, width: number, height: number): Rect[] {
  const active: Rect[] = [],
    finished: Rect[] = [];
  for (let y = 0; y < height; y++) {
    const runs: { x: number; width: number }[] = [];
    let start = -1,
      last = -1;
    for (let x = 0; x <= width; x++) {
      const i = (y * width + x) * 4,
        r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      const gray =
        x < width &&
        data[i + 3] > 240 &&
        Math.min(r, g, b) > 175 &&
        Math.max(r, g, b) < 248 &&
        Math.max(r, g, b) - Math.min(r, g, b) < 20;
      if (gray) {
        if (start < 0) start = x;
        last = x;
      }
      if (start >= 0 && ((!gray && x - last > 3) || x === width)) {
        if (last - start >= 35) runs.push({ x: start, width: last - start + 1 });
        start = -1;
      }
    }
    const used = new Set<Rect>();
    for (const run of runs) {
      const existing = active.find(
        (r) =>
          !used.has(r) &&
          Math.abs(r.x - run.x) < 5 &&
          Math.abs(r.width - run.width) < 8 &&
          r.y + r.height >= y - 2,
      );
      if (existing) {
        existing.height = y - existing.y + 1;
        used.add(existing);
      } else {
        const rect = { ...run, y, height: 1 };
        active.push(rect);
        used.add(rect);
      }
    }
    for (let i = active.length - 1; i >= 0; i--)
      if (active[i].y + active[i].height < y - 2) finished.push(...active.splice(i, 1));
  }
  return [...finished, ...active]
    .filter(
      (r) =>
        r.height >= 12 &&
        r.height <= 130 &&
        r.width >= 40 &&
        r.width * r.height < width * height * 0.2,
    )
    .sort((a, b) => a.y - b.y || a.x - b.x);
}
export function labelFor(rect: Rect, texts: TextBox[]): string {
  const below = texts.filter(
    (t) =>
      t.y >= rect.y + rect.height - 3 &&
      t.y < rect.y + rect.height + 23 &&
      t.x >= rect.x - 4 &&
      t.x < rect.x + rect.width,
  );
  if (below.length)
    return below
      .sort((a, b) => a.x - b.x)
      .map((t) => t.text)
      .join(' ')
      .trim();
  const above = texts.filter(
    (t) =>
      t.y + t.height <= rect.y + 3 &&
      t.y + t.height > rect.y - 22 &&
      t.x >= rect.x - 4 &&
      t.x < rect.x + rect.width,
  );
  return (
    above
      .sort((a, b) => a.x - b.x)
      .map((t) => t.text)
      .join(' ')
      .trim() || 'Textfeld'
  );
}
export function overlaps(a: Rect, b: Rect): boolean {
  return (
    Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x) &&
    Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y)
  );
}
