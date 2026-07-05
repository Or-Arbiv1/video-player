import { describe, it, expect } from 'vitest';
import { buildChapterSpans } from '../src/utils/time';
import type { Chapter } from '../src/types';
import input from '../test-input.json';

/**
 * Requirement #4 — "display chapters on the timeline as shown in the Figma design".
 * The rendering is visual, but the segment geometry is pure: buildChapterSpans turns the raw
 * chapters into gap-free `[start, nextStart)` spans (decisions.md #3) that every timeline
 * layer is positioned from. Tested against the real assignment chapters.
 */
describe('Requirement #4 — chapter segments on the timeline', () => {
  const chapters = input.chapters as Chapter[];
  const duration = input.videoLength; // 348
  const spans = buildChapterSpans(chapters, duration);

  it('produces one span per chapter, indexed in order', () => {
    expect(spans).toHaveLength(7);
    expect(spans.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('closes the 1s gaps in the input so the track has no holes', () => {
    // Input has gaps (e.g. ch0 end=14, ch1 start=15). Each span must reach the NEXT start.
    for (let i = 0; i < spans.length - 1; i++) {
      expect(spans[i].spanEnd).toBe(spans[i + 1].spanStart);
    }
  });

  it('spans the full timeline from 0 to duration with no gaps or overlaps', () => {
    expect(spans[0].spanStart).toBe(0);
    expect(spans[spans.length - 1].spanEnd).toBe(duration);
  });

  it('runs the last chapter all the way to the video duration', () => {
    const last = spans[spans.length - 1];
    expect(last.title).toBe('Conclusion & Recap');
    expect(last.spanEnd).toBe(348);
  });

  it('sorts by start time even if chapters arrive out of order', () => {
    const shuffled = [...chapters].reverse();
    const resorted = buildChapterSpans(shuffled, duration);
    expect(resorted.map((s) => s.spanStart)).toEqual([0, 15, 58, 117, 139, 226, 313]);
  });
});
