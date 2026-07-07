import { useEffect, useState } from 'react';

interface UseFullscreenResult {
  isFullscreen: boolean;
  toggle: () => void;
  /** Set when requestFullscreen()/exitFullscreen() rejects (e.g. no user-gesture, iframe
   *  missing `allow="fullscreen"`) — otherwise the button silently does nothing. */
  error: string | null;
}

/**
 * Toggle the Fullscreen API on a container element (figma.md §7). Synced off the
 * browser's own `fullscreenchange` event — same single-source-of-truth pattern as
 * usePlayerState — so external exits (Esc key, browser chrome) stay in sync.
 */
export function useFullscreen(ref: React.RefObject<HTMLElement>): UseFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [ref]);

  const toggle = () => {
    setError(null);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => setError('Could not exit fullscreen.'));
    } else {
      ref.current?.requestFullscreen().catch(() => setError('Could not enter fullscreen.'));
    }
  };

  return { isFullscreen, toggle, error };
}
