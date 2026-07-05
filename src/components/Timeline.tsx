import { useRef, useState } from 'react';
import type { ChapterSpan } from '../utils/time';
import { chapterAt, clamp, formatTime, timeToPct } from '../utils/time';
import styles from './Timeline.module.css';

interface TimelineProps {
  spans: ChapterSpan[];
  duration: number;
  currentTime: number;
  buffered: number;
  onSeek: (t: number) => void;
}

interface HoverInfo {
  /** x within the track, in px */
  x: number;
  time: number;
  chapter: ChapterSpan | null;
}

/**
 * Timeline (figma.md §3, requirements #4 & #5). Built as stacked layers so playback
 * (time-driven) and hover (pointer-driven) stay decoupled (decisions.md #4c):
 *   1. base chapter segments (#8B8EA4, 4px gaps)
 *   2. played overlay (#F6F9FF, 0 → currentTime)
 *   3. hover accent (#76A4F9) recoloring the single hovered segment
 *   + scrubber knob (4×18, #F6F9FF) at currentTime
 * Time ↔ x is linear on the full track width, so all layers align exactly.
 */
export function Timeline({ spans, duration, currentTime, buffered, onSeek }: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const timeFromEvent = (clientX: number): { pct: number; time: number; x: number } => {
    const rect = trackRef.current!.getBoundingClientRect();
    const pct = clamp((clientX - rect.left) / rect.width, 0, 1);
    return { pct, time: pct * duration, x: pct * rect.width };
  };

  const handleMove = (e: React.PointerEvent) => {
    const { time, x } = timeFromEvent(e.clientX);
    setHover({ x, time, chapter: chapterAt(spans, time) });
  };

  const handleLeave = () => setHover(null);

  const handleClick = (e: React.PointerEvent) => {
    const { time } = timeFromEvent(e.clientX);
    onSeek(time);
  };

  const playedPct = timeToPct(currentTime, duration) * 100;
  const bufferedPct = timeToPct(buffered, duration) * 100;

  // Clamp the tooltip so it never overflows the track edges (decisions.md #7).
  let tooltipLeft = hover?.x ?? 0;
  if (hover && trackRef.current) {
    const trackW = trackRef.current.getBoundingClientRect().width;
    const halfW = (tooltipRef.current?.offsetWidth ?? 0) / 2;
    tooltipLeft = clamp(hover.x, halfW, trackW - halfW);
  }

  return (
    <div className={styles.timeline}>
      {hover && (
        <div
          ref={tooltipRef}
          className={styles.tooltip}
          style={{ left: tooltipLeft }}
          role="tooltip"
        >
          {hover.chapter && <span className={styles.tooltipTitle}>{hover.chapter.title}</span>}
          <span className={styles.tooltipTime}>{formatTime(hover.time, true)}</span>
          <span className={styles.tooltipArrow} />
        </div>
      )}

      <div
        ref={trackRef}
        className={styles.track}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        onPointerDown={handleClick}
      >
        {/* Layer 1 — base chapter segments */}
        {spans.map((s) => {
          const left = timeToPct(s.spanStart, duration) * 100;
          const width = timeToPct(s.spanEnd - s.spanStart, duration) * 100;
          return (
            <div
              key={s.index}
              className={styles.segment}
              style={{ left: `${left}%`, width: `calc(${width}% - var(--vp-gap))` }}
            />
          );
        })}

        {/* Buffered hint (not in Figma; subtle, below played) */}
        <div className={styles.buffered} style={{ width: `${bufferedPct}%` }} />

        {/* Layer 2 — played overlay (time-driven, 0 → currentTime) */}
        <div className={styles.played} style={{ width: `${playedPct}%` }} />

        {/* Layer 3 — hover accent (pointer-driven, above played so it stays visible) */}
        {hover?.chapter && (
          <div
            className={styles.hoverAccent}
            style={{
              left: `${timeToPct(hover.chapter.spanStart, duration) * 100}%`,
              width: `calc(${timeToPct(hover.chapter.spanEnd - hover.chapter.spanStart, duration) * 100}% - var(--vp-gap))`,
            }}
          />
        )}

        {/* Scrubber knob */}
        <div className={styles.knob} style={{ left: `${playedPct}%` }} />
      </div>
    </div>
  );
}
