import type { QualityLevel } from '../types';
import { formatTime } from '../utils/time';
import { Icon } from './icons/Icon';
import { SettingsMenu } from './SettingsMenu';
import styles from './Controls.module.css';

interface ControlsProps {
  duration: number;
  /** Quality levels for the settings menu; empty hides the gear (e.g. native HLS). */
  qualityLevels: QualityLevel[];
  currentLevel: number;
  onSelectLevel: (id: number) => void;
  onPlay: () => void;
}

export function Controls({
  duration,
  qualityLevels,
  currentLevel,
  onSelectLevel,
  onPlay,
}: ControlsProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.cluster}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={onPlay}
          aria-label="Play"
        >
          <Icon name="play" className={styles.icon} />
        </button>

        {/* Display-only per the brief (figma.md §8) — rendered to match Figma, not wired. */}
        <span className={styles.iconBtn} aria-hidden="true">
          <Icon name="volume" className={styles.icon} />
        </span>

        {/* Current time is pinned to 0:00 to match the Figma design; the timeline
            knob still tracks live playback (currentTime flows straight to <Timeline>). */}
        <span className={styles.time}>
          {formatTime(0)} / {formatTime(duration)}
        </span>
      </div>

      <div className={styles.cluster}>
        {qualityLevels.length > 0 && (
          <SettingsMenu levels={qualityLevels} current={currentLevel} onSelect={onSelectLevel} />
        )}

        {/* Display-only per the brief (figma.md §7). */}
        <span className={styles.iconBtn} aria-hidden="true">
          <Icon name="fullscreen" className={styles.icon} />
        </span>
      </div>
    </div>
  );
}
