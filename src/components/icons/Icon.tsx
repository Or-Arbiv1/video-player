/**
 * Icon wrapper. Renders the SVGs exported from Figma (src/components/icons/*.svg)
 * inline via Vite's `?raw` import so they inherit `currentColor` (= --vp-fg white)
 * and hover states. We do not redraw them in JSX — these are the exact Figma assets.
 */
import playSvg from './play.svg?raw';
import volumeSvg from './volume.svg?raw';
import settingsSvg from './settings.svg?raw';
import fullscreenSvg from './fullscreen.svg?raw';

const SVGS = {
  play: playSvg,
  volume: volumeSvg,
  settings: settingsSvg,
  fullscreen: fullscreenSvg,
} as const;

export type IconName = keyof typeof SVGS;

interface IconProps {
  name: IconName;
  className?: string;
}

export function Icon({ name, className }: IconProps) {
  return (
    <span
      className={className}
      aria-hidden="true"
      // The raw string is a trusted, build-time-bundled asset (not user input).
      dangerouslySetInnerHTML={{ __html: SVGS[name] }}
    />
  );
}
