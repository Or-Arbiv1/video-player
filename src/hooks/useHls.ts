import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import type { QualityLevel } from '../types';
import { AUTO_LEVEL, buildQualityLevels } from '../utils/levels';

// Re-exported so existing imports of `AUTO_LEVEL` from this hook keep working.
export { AUTO_LEVEL };

interface UseHlsResult {
  /** Quality levels for the menu (Auto first, then heights descending). */
  levels: QualityLevel[];
  /** User-selected level id (-1 = Auto). Drives the menu checkmark. */
  currentLevel: number;
  /** Select a level by id (-1 = Auto). */
  setLevel: (id: number) => void;
  /** True when playing through the browser's native HLS (Safari) — no manual switching. */
  nativeHls: boolean;
  error: string | null;
}

/**
 * Wire hls.js to a <video> element (decisions.md §6, #5).
 * - Loads the manifest, exposes levels after MANIFEST_PARSED.
 * - Falls back to native HLS (Safari) via video.src if hls.js isn't supported.
 */
export function useHls(
  videoRef: React.RefObject<HTMLVideoElement>,
  src: string
): UseHlsResult {
  const hlsRef = useRef<Hls | null>(null);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(AUTO_LEVEL);
  const [nativeHls, setNativeHls] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Native HLS path (Safari): no manual level control available.
    if (!Hls.isSupported() && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      setNativeHls(true);
      return;
    }

    if (!Hls.isSupported()) {
      setError('HLS is not supported in this browser.');
      return;
    }

    const hls = new Hls({ enableWorker: true });
    hlsRef.current = hls;
    hls.attachMedia(video);
    hls.loadSource(src);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      // Build the menu from hls.levels (pure logic lives in utils/levels for testability).
      setLevels(buildQualityLevels(hls.levels));
    });

    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (!data.fatal) return;
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          hls.startLoad(); // try to recover
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          hls.recoverMediaError();
          break;
        default:
          setError('Fatal streaming error — could not recover.');
          hls.destroy();
      }
    });

    return () => {
      hls.destroy();
      hlsRef.current = null;
    };
  }, [videoRef, src]);

  const setLevel = (id: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = id; // -1 => Auto/ABR
    setCurrentLevel(id);
  };

  return { levels, currentLevel, setLevel, nativeHls, error };
}
