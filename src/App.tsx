import { VideoPlayer } from './components/VideoPlayer';
import type { PlayerInput } from './types';
import input from '../test-input.json';

/**
 * Loads the assignment input and renders the player (decisions.md #11 — config-driven).
 */
export function App() {
  return (
    <main className="app">
      <VideoPlayer {...(input as PlayerInput)} />
    </main>
  );
}
