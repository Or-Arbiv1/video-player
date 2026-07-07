import type { QualityLevel } from '../types';
import { formatTime } from '../utils/time';
import { Icon } from './icons/Icon';
import { SettingsMenu } from './SettingsMenu';
import { VolumeControl } from './VolumeControl';
import styles from './Controls.module.css';

interface ControlsProps {
  currentTime: number;
  duration: number;
  paused: boolean;
  volume: number;
  muted: boolean;
  onSetVolume: (v: number) => void;
  onToggleMute: () => void;
  qualityLevels: QualityLevel[];
  currentLevel: number;
  onSelectLevel: (id: number) => void;
  onToggle: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function Controls({
  currentTime,
  duration,
  paused,
  volume,
  muted,
  onSetVolume,
  onToggleMute,
  qualityLevels,
  currentLevel,
  onSelectLevel,
  onToggle,
  isFullscreen,
  onToggleFullscreen,
}: ControlsProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.cluster}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={onToggle}
          aria-label={paused ? 'Play' : 'Pause'}
        >
          <Icon name={paused ? 'play' : 'pause'} className={styles.icon} />
        </button>

        <VolumeControl
          volume={volume}
          muted={muted}
          onSetVolume={onSetVolume}
          onToggleMute={onToggleMute}
        />

        <span className={styles.time}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className={styles.cluster}>
        {qualityLevels.length > 0 && (
          <SettingsMenu levels={qualityLevels} current={currentLevel} onSelect={onSelectLevel} />
        )}

        <button
          type="button"
          className={styles.iconBtn}
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          <Icon name="fullscreen" className={styles.icon} />
        </button>
      </div>
    </div>
  );
}
