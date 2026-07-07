import { useState } from 'react';
import { Icon } from './icons/Icon';
import styles from './VolumeControl.module.css';

interface VolumeControlProps {
  volume: number;
  muted: boolean;
  onSetVolume: (v: number) => void;
  onToggleMute: () => void;
}

/**
 * Volume button + hover/focus-reveal vertical slider (figma.md §8's "if implemented" path —
 * no Figma spec for the slider itself, so styling here just follows the tooltip/popover
 * tokens already used by SettingsMenu, not a pixel value from figma.md).
 * Click toggles mute; dragging the slider sets an exact 0–100% level (see VideoPlayer's
 * setVolume, which keeps `muted` in sync so there's one source of truth for "silent").
 */
export function VolumeControl({ volume, muted, onSetVolume, onToggleMute }: VolumeControlProps) {
  const [open, setOpen] = useState(false);
  const level = muted ? 0 : volume;

  return (
    <div
      className={styles.root}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      {open && (
        // .sliderWrap's own box reaches all the way down to the button (bottom: 100%,
        // no gap) with the visual gap moved inside it as invisible padding — otherwise
        // that gap is dead space belonging to neither element, and crossing it while
        // moving the cursor from the button to the slider fires mouseleave on .root
        // before the slider is ever reached.
        <div className={styles.sliderWrap}>
          <div className={styles.sliderPopover}>
            <input
              type="range"
              className={styles.slider}
              min={0}
              max={1}
              step={0.01}
              value={level}
              onChange={(e) => onSetVolume(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, var(--vp-accent) ${level * 100}%, var(--vp-track) ${level * 100}%)`,
              }}
              aria-label="Volume"
            />
          </div>
        </div>
      )}

      <button
        type="button"
        className={styles.iconBtn}
        onClick={onToggleMute}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        <Icon name={muted ? 'volumeMuted' : 'volume'} className={styles.icon} />
      </button>
    </div>
  );
}
