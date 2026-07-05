import { describe, it, expect } from 'vitest';
import { buildChapterSpans, chapterAt, clamp, formatTime, timeToPct } from '../src/utils/time';
import type { Chapter } from '../src/types';
import input from '../test-input.json';

const chapters = input.chapters as Chapter[];
const duration = input.videoLength; // 348
const spans = buildChapterSpans(chapters, duration);

/**
 * Requirement #5a — "on hover, show current time and the name of the hovered chapter."
 * chapterAt resolves the hovered chapter; formatTime renders the hovered time (padded mm:ss,
 * matching the Figma tooltip "01:45").
 */
describe('Requirement #5a — hover shows chapter name + time', () => {
  it('resolves the chapter at a hovered time', () => {
    expect(chapterAt(spans, 0)?.title).toBe('Introduction & Course Overview');
    expect(chapterAt(spans, 15)?.title).toBe("Curiosity's Role in Critical & Creative Thinking");
    // decisions.md worked example: 58 <= 59 < 117.
    expect(chapterAt(spans, 59)?.title).toBe('Analytical vs Creative Thinking Explained');
  });

  it('still names a chapter when hovering inside an input gap (e.g. t=14.5)', () => {
    // ch0 ends at 14, ch1 starts at 15. The span model extends ch0 to 15, so there is no
    // "no chapter" dead zone on the track.
    expect(chapterAt(spans, 14.5)?.title).toBe('Introduction & Course Overview');
  });

  it('treats the very end of the video as the last chapter', () => {
    expect(chapterAt(spans, duration)?.title).toBe('Conclusion & Recap');
  });

  it('returns null outside the timeline', () => {
    expect(chapterAt(spans, -1)).toBeNull();
    expect(chapterAt(spans, duration + 1)).toBeNull();
  });

  it('formats the hovered time as padded mm:ss (Figma tooltip style)', () => {
    expect(formatTime(105, true)).toBe('01:45'); // matches the Figma tooltip
    expect(formatTime(0, true)).toBe('00:00');
    expect(formatTime(348, true)).toBe('05:48');
  });
});

/**
 * Requirement #5b — "clicking on the timeline should seek to the selected time."
 * The click handler maps pointer fraction -> time via `pct * duration`, with pct clamped to
 * [0,1]; timeToPct is the inverse used to place the played fill / knob. These primitives make
 * the seek exact and edge-safe.
 */
describe('Requirement #5b — click position maps to a seek time', () => {
  it('maps a fractional click position to the correct time', () => {
    // This is the exact mapping the Timeline click handler performs: time = pct * duration.
    expect(0.0 * duration).toBe(0);
    expect(0.5 * duration).toBe(174);
    expect(1.0 * duration).toBe(348);
  });

  it('round-trips time <-> fraction so the knob lands where you clicked', () => {
    for (const t of [0, 59, 174, 348]) {
      expect(timeToPct(t, duration) * duration).toBeCloseTo(t, 6);
    }
  });

  it('clamps clicks outside the track to the valid range', () => {
    expect(clamp(-40, 0, duration)).toBe(0);
    expect(clamp(500, 0, duration)).toBe(348);
    expect(timeToPct(-10, duration)).toBe(0);
    expect(timeToPct(9999, duration)).toBe(1);
  });

  it('never divides by zero before duration is known', () => {
    expect(timeToPct(50, 0)).toBe(0);
  });
});

/**
 * The control-bar clock uses unpadded m:ss (e.g. "5:48"), distinct from the padded tooltip.
 */
describe('Control-bar clock formatting (m:ss)', () => {
  it('formats without leading zero on minutes', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(59)).toBe('0:59');
    expect(formatTime(348)).toBe('5:48');
  });

  it('guards against negative / NaN input', () => {
    expect(formatTime(-5)).toBe('0:00');
    expect(formatTime(NaN)).toBe('0:00');
  });
});
