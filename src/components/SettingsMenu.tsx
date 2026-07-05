import { useEffect, useRef, useState } from 'react';
import type { QualityLevel } from '../types';
import { Icon } from './icons/Icon';
import styles from './SettingsMenu.module.css';

interface SettingsMenuProps {
  /** Quality levels (Auto first, then heights descending). */
  levels: QualityLevel[];
  /** Currently selected level id (-1 = Auto). */
  current: number;
  /** Select a level by id (-1 = Auto). */
  onSelect: (id: number) => void;
}

/**
 * Quality (resolution) picker popover. The gear opens/closes it; outside-click or
 * re-click closes. The active level is checked.
 */
export function SettingsMenu({ levels, current, onSelect }: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      {open && (
        <div className={styles.popover} role="menu">
          {levels.map((level) => {
            const selected = level.id === current;
            return (
              <button
                key={level.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`${styles.row} ${selected ? styles.rowSelected : ''}`}
                onClick={() => {
                  onSelect(level.id);
                  setOpen(false);
                }}
              >
                <span className={styles.check}>{selected ? '✓' : ''}</span>
                <span>{level.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className={styles.gear}
        aria-label="Quality"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="settings" className={styles.icon} />
      </button>
    </div>
  );
}
