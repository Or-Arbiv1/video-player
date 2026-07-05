import { describe, it, expect } from 'vitest';
import { AUTO_LEVEL, buildQualityLevels } from '../src/utils/levels';

/**
 * Requirement #3 — "support HLS streaming and allow users to change video resolution
 * (720p, 1080p, etc.)". The HLS transport is hls.js; the part we own and can unit-test is
 * how `hls.levels` becomes the resolution menu (buildQualityLevels). See decisions.md #5/#5b.
 */
describe('Requirement #3 — resolution menu from HLS levels', () => {
  // Shape of the real test stream (see decisions.md Learnings): 240/360/480/720, no 1080.
  const testStreamLevels = [
    { height: 240, bitrate: 400_000 },
    { height: 360, bitrate: 800_000 },
    { height: 480, bitrate: 1_400_000 },
    { height: 720, bitrate: 2_800_000 },
  ];

  it('pins an "Auto" (ABR) entry on top', () => {
    const menu = buildQualityLevels(testStreamLevels);
    expect(menu[0]).toEqual({ id: AUTO_LEVEL, label: 'Auto' });
    expect(AUTO_LEVEL).toBe(-1);
  });

  it('orders real renditions tallest-first and labels them "<height>p"', () => {
    const menu = buildQualityLevels(testStreamLevels);
    expect(menu.map((l) => l.label)).toEqual(['Auto', '720p', '480p', '360p', '240p']);
  });

  it('keeps each entry\'s original hls.js index as id, so selection maps to hls.currentLevel', () => {
    // Input is ascending (240=idx0 … 720=idx3); after tallest-first sort, ids stay bound to
    // the original index, not the menu position.
    const menu = buildQualityLevels(testStreamLevels);
    expect(menu.find((l) => l.label === '720p')?.id).toBe(3);
    expect(menu.find((l) => l.label === '240p')?.id).toBe(0);
  });

  it('does not invent resolutions — only what the manifest reports (no hardcoded 1080p)', () => {
    const menu = buildQualityLevels(testStreamLevels);
    expect(menu.some((l) => l.label === '1080p')).toBe(false);
    expect(menu).toHaveLength(testStreamLevels.length + 1); // + Auto
  });

  it('falls back to a bitrate label when a level has no height (e.g. audio-only)', () => {
    const menu = buildQualityLevels([{ bitrate: 128_000 }]);
    expect(menu.map((l) => l.label)).toEqual(['Auto', '128k']);
  });

  it('handles an empty manifest by offering Auto only', () => {
    expect(buildQualityLevels([])).toEqual([{ id: AUTO_LEVEL, label: 'Auto' }]);
  });
});
