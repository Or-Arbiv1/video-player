import type { QualityLevel } from '../types';

/**
 * Quality-level math for the resolution menu (requirement #3) — pure, no hls.js/DOM deps,
 * so it's unit-testable. `useHls` feeds it `hls.levels` after MANIFEST_PARSED.
 */

/** Auto/ABR entry id — the synthetic "Auto" level that lets hls.js pick (decisions.md #5). */
export const AUTO_LEVEL = -1;

/** The subset of an hls.js `Level` we need to build one menu entry. */
export interface RawLevel {
  height?: number;
  bitrate: number;
}

/**
 * Build the resolution menu from hls.js levels: one entry per rendition, **tallest first**,
 * labelled by height (`720p`) — or by bitrate (`1200k`) when a level has no height
 * (e.g. audio-only) — with a synthetic **Auto** (ABR) entry pinned on top. Each entry keeps
 * its original hls.js index as `id` so selection maps straight to `hls.currentLevel`.
 */
export function buildQualityLevels(rawLevels: RawLevel[]): QualityLevel[] {
  const levels: QualityLevel[] = rawLevels
    .map((l, i) => ({
      id: i,
      height: l.height,
      bitrate: l.bitrate,
      label: l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)}k`,
    }))
    .sort((a, b) => (b.height ?? 0) - (a.height ?? 0));

  return [{ id: AUTO_LEVEL, label: 'Auto' }, ...levels];
}
