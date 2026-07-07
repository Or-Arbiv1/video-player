# Yeda Labs — Video Player

A custom HLS video player built from scratch in React + TypeScript, matching the provided
Figma design. Chapters are rendered on the timeline; hovering shows the current time and the
hovered chapter name; clicking seeks; and the resolution can be changed from the settings menu.

> Built for the Yeda Labs developer assignment. The player UI and all controls are our own
> code — the only runtime dependency beyond React is **hls.js**, used purely as the HLS
> transport (explicitly allowed by the brief).

## Features

- **Built from scratch** — no third-party or open-source video player. Timeline, chapters,
  hover tooltip, scrubber, and settings menu are all custom React components.
- **HLS streaming** via `hls.js`, with a native-HLS fallback for Safari.
- **Resolution switching** — the settings (⚙) menu is built dynamically from the stream's
  actual quality levels (`hls.levels`) plus an **Auto** (ABR) option.
- **Chapters on the timeline** — YouTube-style segments with 4px gaps, sized to each
  chapter's share of the video.
- **Error handling** — every failure surface shows a message instead of failing silently:
  fatal HLS errors, native-Safari playback errors, a rejected `play()` or fullscreen call,
  and uncaught render errors (via an app-level error boundary). Streaming/playback
  failures block the frame with a "refresh the page" message; a denied fullscreen request
  (playback is unaffected) gets a small non-blocking toast instead. See `decisions.md` #13.
- **Timeline interaction**
  - **Hover** → tooltip showing the hovered time (`mm:ss`) and the chapter name at that point;
    the hovered chapter segment highlights in periwinkle blue.
  - **Click** → seeks the video to that time.

Every control is fully wired. **Play/pause** — the play button (and clicking the video)
toggles playback, swapping between the Figma play icon and a hand-drawn pause icon in the
same style. **Volume** — click the speaker to mute/unmute; hover (or focus) reveals a
vertical 0–100% slider; un-muting restores the last level rather than staying silent.
**Fullscreen** — toggles the Fullscreen API on the player container so the controls stay
usable; it keeps the single Figma fullscreen icon in both states (no good "exit" glyph to
swap to) and communicates state via `aria-label` instead. Fullscreen isn't supported on iOS
Safari (no arbitrary-container Fullscreen API there).

## Setup & run

Requires Node 18+.

```bash
npm install
npm run dev       # start the dev server → http://localhost:5173
```


```

The player reads its input (`hlsPlaylistUrl`, `videoLength`, `chapters`) from
[`test-input.json`](./test-input.json) — swap that file to try other content.

## Testing

```bash
npm test          # Vitest, run once
```

Unit tests (in [`tests/`](./tests)) cover the pure logic behind each requirement — one file
per requirement: the resolution menu (#3), chapter segments (#4), and hover/seek math (#5).

## Key decisions & challenges

- **"From scratch" scope.** React is a UI framework, not a player; hls.js is the transport.
  Everything a viewer sees and interacts with — the bar, timeline, chapter segments, tooltip,
  and quality menu — is hand-built.
- **The `<video>` element is the single source of truth.** A `usePlayerState` hook subscribes
  to its events (`timeupdate`, `durationchange`, `loadedmetadata`, `progress`, `seeking`,
  `seeked`) instead of keeping a parallel timer.
- **Chapters own `[start, nextStart)`.** The input has 1-second gaps between each chapter's
  `end` and the next `start`. Treating chapters as ending at the next chapter's start closes
  those gaps so the segments tile the bar and hover-lookup never lands on a blank title.
- **Timeline is layered, time↔x is linear.** Base chapter segments, the played overlay, the
  hover accent, and the knob are independent layers positioned by percentage of duration, so
  playback (time-driven) and hover (pointer-driven) stay decoupled and always align.
- **The quality menu is 100% dynamic.** Levels come from `hls.levels` — nothing is hardcoded.
  The menu itself is a **flat, quality-specific list** — we deliberately didn't build a generic
  settings-descriptor abstraction, since resolution is the only setting the brief needs (YAGNI;
  see `decisions.md #5`).
- **Icons are the exact Figma exports** (`src/components/icons/*.svg`), imported inline via
  Vite's `?raw` so they inherit `currentColor` for the white fill and hover states.
- **Every failure surfaces a message, sized to its severity.** Streaming/playback failures
  (fatal HLS errors, native-Safari `<video>` errors, a rejected `play()`) block the frame
  with a "refresh the page" banner, since the player is genuinely broken. A denied
  fullscreen request doesn't break playback, so it only gets a small non-blocking toast.
  An app-level error boundary catches uncaught render errors. See `decisions.md #13`.

### Challenge

The main challenge was reproducing the Figma *exactly* — the difficulty wasn't the player
logic but getting the precise design values (colors, spacing, type, timeline/chapter styling,
even the tooltip text) into the build without eyeballing the mockup and guessing. The solution
was to pull the data straight from the source: hit the **Figma REST API**
(`GET /v1/files/:key/nodes`) with a personal access token and extract all the design data —
exact fills, fonts, geometry, and text strings — rather than approximating by eye. Those
extracted values are recorded in [`figma.md`](./figma.md) and drive the CSS tokens.

## Design & decision records

- [`figma.md`](./figma.md) — the UI/behavior spec extracted from Figma (source of truth for look).
- [`decisions.md`](./decisions.md) — implementation decisions and build log.

## Browser notes

- Chromium/Firefox use `hls.js`; quality switching works.
- Safari plays via native HLS (`video.src`); Safari doesn't expose manual level control, so
  the settings menu is hidden on that path.

## Project structure

```
src/
├─ App.tsx                 loads test-input.json, renders <VideoPlayer/>
├─ types.ts                PlayerInput, Chapter, QualityLevel, PlayerState
├─ components/
│  ├─ VideoPlayer.tsx      owns <video> ref + state, wires hls, lays out UI
│  ├─ Timeline.tsx         3-layer track, chapter segments, hover tooltip, click-to-seek
│  ├─ Controls.tsx         play/pause · volume · time · … · settings · fullscreen
│  ├─ VolumeControl.tsx    mute toggle + hover-reveal 0–100% slider
│  ├─ SettingsMenu.tsx     flat resolution (quality) popover from hls.levels
│  ├─ ErrorBoundary.tsx    catches uncaught render errors app-wide (wraps <App/> in main.tsx)
│  └─ icons/               Figma SVG exports + inline Icon wrapper (+ hand-drawn pause/volume-muted)
├─ hooks/
│  ├─ useHls.ts            hls.js lifecycle + quality switching (level math → utils/levels.ts)
│  ├─ usePlayerState.ts    subscribes to <video> events → reactive state
│  └─ useFullscreen.ts     Fullscreen API on the player container + fullscreenchange sync
└─ utils/
   ├─ time.ts              timeToPct, formatTime, buildChapterSpans, chapterAt
   └─ levels.ts            AUTO_LEVEL, buildQualityLevels (resolution-menu math)
```
