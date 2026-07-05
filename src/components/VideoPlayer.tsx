import { useMemo, useRef } from 'react';
import type { PlayerInput } from '../types';
import { useHls } from '../hooks/useHls';
import { usePlayerState } from '../hooks/usePlayerState';
import { buildChapterSpans } from '../utils/time';
import { Timeline } from './Timeline';
import { Controls } from './Controls';
import styles from './VideoPlayer.module.css';

/**
 * Top-level player (decisions.md Architecture): owns the <video> ref and player state,
 * wires hls.js, and composes the timeline + controls. Children get state down and call
 * callbacks up — no child touches the video element directly.
 */
export function VideoPlayer({ hlsPlaylistUrl, videoLength, chapters }: PlayerInput) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { levels, currentLevel, setLevel, nativeHls, error } = useHls(videoRef, hlsPlaylistUrl);
  const state = usePlayerState(videoRef);

  // Prefer the real HLS duration once known; fall back to the input's videoLength so the
  // chapter layout renders before metadata loads (decisions.md #2).
  const duration = state.duration || videoLength;
  const spans = useMemo(() => buildChapterSpans(chapters, duration), [chapters, duration]);

  // Play-only: the first click (icon or video) starts playback; there is no pause
  // (the design has only a play icon, and pausing isn't a requirement).
  const play = () => {
    videoRef.current?.play().catch(() => {});
  };

  const seek = (t: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = t;
  };

  // Quality menu is only offered when hls.js drives playback — native HLS (Safari)
  // can't switch levels manually, so hide the gear there.
  const qualityLevels = nativeHls ? [] : levels;

  return (
    <div className={styles.player} ref={containerRef}>
      <video
        ref={videoRef}
        className={styles.video}
        playsInline
        onClick={play}
      />

      <div className={styles.scrim} />

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.controlsWrap}>
        <Timeline
          spans={spans}
          duration={duration}
          currentTime={state.currentTime}
          buffered={state.buffered}
          onSeek={seek}
        />
        <Controls
          duration={duration}
          qualityLevels={qualityLevels}
          currentLevel={currentLevel}
          onSelectLevel={setLevel}
          onPlay={play}
        />
      </div>
    </div>
  );
}
