import { useEffect, useState } from 'react';
import type { PlayerState } from '../types';

const INITIAL: PlayerState = {
  currentTime: 0,
  duration: 0,
  buffered: 0,
};

/**
 * Subscribe to the <video> element's events and expose a reactive snapshot
 * (decisions.md #1: the video element is the single source of truth — no parallel timer).
 */
export function usePlayerState(videoRef: React.RefObject<HTMLVideoElement>): PlayerState {
  const [state, setState] = useState<PlayerState>(INITIAL);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const sync = () => {
      const buffered =
        video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0;
      setState({
        currentTime: video.currentTime,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        buffered,
      });
    };

    const events = [
      'timeupdate',
      'durationchange',
      'loadedmetadata',
      'progress',
      'seeking',
      'seeked',
    ];
    events.forEach((e) => video.addEventListener(e, sync));
    sync();

    return () => events.forEach((e) => video.removeEventListener(e, sync));
  }, [videoRef]);

  return state;
}
