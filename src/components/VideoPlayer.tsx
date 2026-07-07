import { useMemo, useRef, useState } from 'react';
import type { PlayerInput } from '../types';
import { useHls } from '../hooks/useHls';
import { usePlayerState } from '../hooks/usePlayerState';
import { useFullscreen } from '../hooks/useFullscreen';
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
  // Remembers the last non-zero volume so toggling mute off restores it, instead of
  // unmuting into silence (a "volume: 0, muted: false" state that's audibly identical
  // to muted — see decisions.md #8 for why `muted` is kept as the single source of truth).
  const lastVolumeRef = useRef(1);
  // Surfaces a rejected video.play() (autoplay policy, decode error, etc.) — otherwise
  // the user clicks play and nothing visibly happens.
  const [playError, setPlayError] = useState<string | null>(null);

  const { levels, currentLevel, setLevel, nativeHls, error } = useHls(videoRef, hlsPlaylistUrl);
  const state = usePlayerState(videoRef);
  const { isFullscreen, toggle: toggleFullscreen, error: fullscreenError } = useFullscreen(containerRef);

  // Prefer the real HLS duration once known; fall back to the input's videoLength so the
  // chapter layout renders before metadata loads (decisions.md #1).
  const duration = state.duration || videoLength;
  const spans = useMemo(() => buildChapterSpans(chapters, duration), [chapters, duration]);

  // Toggle playback; state.paused (from usePlayerState, driven by the video's own
  // play/pause events) decides the direction, so this stays a single source of truth.
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      setPlayError(null);
      v.play().catch(() => setPlayError('Playback failed.'));
    } else {
      v.pause();
    }
  };

  const seek = (t: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = t;
  };

  // Keep `muted` in sync with `volume === 0` so the UI has one source of truth for
  // "silent" instead of two flags that can disagree (decisions.md #8).
  const setVolume = (level: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = level;
    v.muted = level === 0;
    if (level > 0) lastVolumeRef.current = level;
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted || v.volume === 0) {
      v.muted = false;
      v.volume = lastVolumeRef.current || 1;
    } else {
      v.muted = true;
    }
  };

  // Quality menu is only offered when hls.js drives playback — native HLS (Safari)
  // can't switch levels manually, so hide the gear there.
  const qualityLevels = nativeHls ? [] : levels;

  // Streaming/play failures break the whole player, so they get a blocking banner with
  // a "refresh" hint. A denied fullscreen request doesn't — the video keeps playing fine
  // underneath, so it only gets a small non-blocking toast.
  const blockingMessage = error ?? playError;

  return (
    <div className={styles.player} ref={containerRef}>
      <video
        ref={videoRef}
        className={styles.video}
        playsInline
        onClick={togglePlay}
      />

      <div className={styles.scrim} />

      {blockingMessage && (
        <div className={styles.error}>
          <div>
            <p>{blockingMessage}</p>
            <p>Please refresh the page.</p>
          </div>
        </div>
      )}

      {!blockingMessage && fullscreenError && (
        <div className={styles.toast}>{fullscreenError}</div>
      )}

      <div className={styles.controlsWrap}>
        <Timeline
          spans={spans}
          duration={duration}
          currentTime={state.currentTime}
          buffered={state.buffered}
          onSeek={seek}
        />
        <Controls
          currentTime={state.currentTime}
          duration={duration}
          paused={state.paused}
          volume={state.volume}
          muted={state.muted}
          onSetVolume={setVolume}
          onToggleMute={toggleMute}
          qualityLevels={qualityLevels}
          currentLevel={currentLevel}
          onSelectLevel={setLevel}
          onToggle={togglePlay}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>
    </div>
  );
}
