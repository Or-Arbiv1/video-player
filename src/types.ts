/** A single chapter as provided in the input (seconds). */
export interface Chapter {
  title: string;
  start: number;
  end: number;
}

/** The player's config input (see test-input.json). */
export interface PlayerInput {
  hlsPlaylistUrl: string;
  /** Total video length in seconds. Used for initial layout before HLS metadata loads. */
  videoLength: number;
  chapters: Chapter[];
}

/**
 * A selectable quality level, derived from `hls.levels`.
 * `id` maps to the hls.js level index; `id === -1` is the synthetic "Auto" (ABR) entry.
 */
export interface QualityLevel {
  id: number;
  label: string;
  height?: number;
  bitrate?: number;
}

/** Reactive snapshot of the underlying <video> element (from usePlayerState). */
export interface PlayerState {
  currentTime: number;
  duration: number;
  buffered: number;
  paused: boolean;
  volume: number;
  muted: boolean;
}
