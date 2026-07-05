import type { Chapter } from '../types';

/**
 * Pure timeline math — no DOM, unit-testable (decisions.md #4).
 */

/** Clamp `n` into the inclusive range [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/** Fraction (0..1) of the way through `duration` that `t` sits at. */
export function timeToPct(t: number, duration: number): number {
  if (duration <= 0) return 0;
  return clamp(t / duration, 0, 1);
}

/**
 * Format seconds as a clock.
 * - Control-bar clock uses `m:ss` (`0:59`, `5:48`) → `pad = false` (default).
 * - Tooltip uses zero-padded `mm:ss` (`00:59`) to match Figma → `pad = true`.
 */
export function formatTime(totalSeconds: number, pad = false): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  const mm = pad ? String(minutes).padStart(2, '0') : String(minutes);
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * A chapter's effective span is `[start, nextStart)` — the input has 1s gaps between
 * `end` and the next `start`, so we extend each chapter to the next chapter's start
 * (last chapter → `duration`) to avoid holes (decisions.md #3).
 */
export interface ChapterSpan extends Chapter {
  index: number;
  spanStart: number;
  spanEnd: number;
}

/** Build gap-free spans from raw chapters, sorted by start. */
export function buildChapterSpans(chapters: Chapter[], duration: number): ChapterSpan[] {
  const sorted = [...chapters].sort((a, b) => a.start - b.start);
  return sorted.map((c, i) => ({
    ...c,
    index: i,
    spanStart: c.start,
    spanEnd: i < sorted.length - 1 ? sorted[i + 1].start : duration,
  }));
}

/**
 * Find the chapter whose half-open span contains `t` (`spanStart ≤ t < spanEnd`).
 * The last chapter is inclusive of `duration`. Returns `null` if none match.
 */
export function chapterAt(spans: ChapterSpan[], t: number): ChapterSpan | null {
  for (const span of spans) {
    const isLast = span.index === spans.length - 1;
    if (t >= span.spanStart && (t < span.spanEnd || (isLast && t <= span.spanEnd))) {
      return span;
    }
  }
  return null;
}
