import { useEffect, useState } from 'react';

interface UseFullscreenResult {
  isFullscreen: boolean;
  toggle: () => void;
}

/**
 * Toggle the Fullscreen API on a container element (figma.md §7). Synced off the
 * browser's own `fullscreenchange` event — same single-source-of-truth pattern as
 * usePlayerState — so external exits (Esc key, browser chrome) stay in sync.
 */
export function useFullscreen(ref: React.RefObject<HTMLElement>): UseFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [ref]);

  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      ref.current?.requestFullscreen();
    }
  };

  return { isFullscreen, toggle };
}
