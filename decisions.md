# Implementation Decisions

How we're building the video player. This complements [`figma.md`](./figma.md) (the *what*/
*how it looks*) — this file is the *how we build it*. Decisions are numbered so we can
reference and revise them.

---

## Stack

| Area        | Choice | Why |
|-------------|--------|-----|
| Framework   | **React** (Vite `react-ts` template) | The brief says *"You may use any React-based web technologies."* React is the expected stack. |
| Build/tool  | **Vite** | Fast dev server + bundler; one `npm run dev` for reviewers; clean imports. |
| Language    | **TypeScript** | Type the input model, chapters, and HLS levels; catch bugs; signals quality. |
| UI          | **React components + hooks**, our own DOM/SVG | We build the player itself — components, timeline, controls. No pre-built player component. |
| Styling     | **CSS Modules** (`*.module.css`) + CSS custom properties for tokens | Scoped styles per component; tokens map to figma.md §10 (extracted values below). No CSS framework. |
| Font        | **Rubik** (400) via Google Fonts `@import`/`<link>` | Figma uses Rubik for time text (18px/28) and tooltip (12px). Must be loaded or type won't match. |
| Streaming   | **hls.js** (npm dependency) | Explicitly allowed by the assignment. It's the transport, not the player UI. |

**Rule of thumb for "from scratch":** the only non-React runtime dependency is **hls.js**.
We use **no video-player library** (no video.js, Plyr, react-player, Vidstack, etc.) — all
controls, timeline, chapters, tooltip, menus, and fullscreen are our own React code. This
is what requirement #1 ("no third-party libraries or open-source players") means; React
itself is a UI framework, not a player, and is explicitly permitted.

---

## Design tokens (from figma.md §10 — exact Figma values)

Define once as CSS custom properties (e.g. `:root` / the player root) and reference
everywhere. These are extracted, not guessed:

```css
:root {
  /* colors */
  --vp-bg: #FFFFFF;          /* player frame fill; radius 10px; shadow 0 4 6 rgba(0,0,0,.09) */
  --vp-track: #8B8EA4;       /* unplayed timeline / chapter segments */
  --vp-played: #F6F9FF;      /* played fill overlay + 4x18 scrubber knob */
  --vp-accent: #76A4F9;      /* hovered chapter highlight (periwinkle) — NOT #3B82F6 */
  --vp-fg: #FFFFFF;          /* icons + time text */
  --vp-tooltip-bg: #1B1B1E;  /* tooltip box + pointer, radius 6px */
  --vp-tooltip-fg: #FFFFFF;
  --vp-scrim: linear-gradient(to top, rgba(0,0,0,.8) 0%, rgba(0,0,0,0) 100%); /* 156px tall */
  /* type */
  --vp-font: 'Rubik', sans-serif;
  /* geometry */
  --vp-radius: 10px;
  --vp-track-h: 4px;
  --vp-gap: 4px;             /* between chapter segments */
  --vp-knob: 4px 18px;       /* w h */
}
```

- Time text: `Rubik 400 18px/28px`, right-aligned. Tooltip text: `Rubik 400 12px/~14px`, centered.
- Icon buttons: 31×31 hit target, 24px glyph, `--vp-fg`. Control cluster padding: 14px sides,
  12px bottom, 12px gap between timeline row and button row. **Button row = two clusters**
  (left: play·volume·time · right: gear·fullscreen), each `gap 12px`, with the row itself
  `justify-content: space-between` so the right cluster pins to the edge. (Figma's outer
  `gap 8` never renders — space-between with two children; visible icon spacing is 12px.)

---

## Architecture — modular React components

A top-level **`<VideoPlayer>`** component owns the `<video>` ref and player state, and
composes small, single-responsibility child components. Each maps 1:1 to a `figma.md` section.

```
<VideoPlayer>                → owns <video> ref + state, wires hls, lays out the UI
├─ useHls(url)               → hook: hls.js setup, load, quality switching (level math → utils/levels.ts) (figma §6,§5)
├─ usePlayerState(videoRef)  → hook: subscribes to <video> events → {currentTime,duration,buffered}
├─ <Controls>                → play button, time display, bar layout                 (figma §2)
│  └─ <SettingsMenu>         → resolution popover built from hls.levels               (figma §5,#3)
└─ <Timeline>                → segments, played fill, hover accent, tooltip, seek     (figma §3,§4,#4,#5)
```

**As-built note:** chapter segments and the hover tooltip are rendered **inline inside
`<Timeline>`** (as stacked layers), not as separate `<ChapterBar>`/`<HoverTooltip>`
components — the layers are tightly coupled to the track geometry, so splitting them added
indirection without benefit. Volume and fullscreen are **display-only `<span>`s inside
`<Controls>`** (per the brief), so there are no `<VolumeControl>`/`<FullscreenControl>`
components or a `useFullscreen` hook. The quality picker is `<SettingsMenu>`, rendered by
`<Controls>`.

### State & data flow (React)
1. **`<VideoPlayer>` owns the `<video>` ref** and is the single source of truth.
   `usePlayerState` subscribes to the element's events (`timeupdate`, `durationchange`,
   `loadedmetadata`, `progress`, `seeking`, `seeked`) and exposes reactive state
   (`currentTime`, `duration`, `buffered`).
2. **Children receive props down** (state + config like `chapters`, `duration`, `levels`).
3. **Children call callbacks up** (`onSeek(t)`, `onPlay`, `onSelectLevel(id)`); the parent
   performs the action on the `<video>` / hls instance. No child touches the video element
   or another child directly.
4. **Imperative bits** (hls.js, Fullscreen API, `video.currentTime`) live behind refs/hooks,
   not in render. Pure logic stays in `utils/` (testable, no React).

This keeps each piece isolated and lets us build features in the figma.md build order
without rework.

---

## Key technical decisions

1. **Single source of time = the `<video>` element.** We read `video.currentTime` /
   `video.duration` / `video.buffered` and listen to `timeupdate`, `durationchange`,
   `loadedmetadata`, `progress`, `seeking`, `seeked`. We do **not** keep a parallel timer.
   (Playback state like `paused`/`muted`/`volume` isn't tracked — the UI is play-only and
   volume is display-only, so those fields were dropped from `usePlayerState`.)

2. **Duration:** use the input's `videoLength` (348s) for initial chapter layout so the UI
   renders before metadata loads; reconcile with `video.duration` once
   `loadedmetadata`/HLS `MANIFEST_PARSED` fires if they differ.

3. **Chapters own `[start, nextStart)`.** The input has 1s gaps (e.g. `end:14`, next
   `start:15`). To avoid "holes," each chapter effectively spans from its `start` to the
   **next chapter's start** for both rendering and hover-lookup. Lookup: find chapter where
   `start ≤ t < nextStart` (last chapter runs to `videoLength`). *Worked example:* hover
   `t = 59` → `58 ≤ 59 < 117` → "Analytical vs Creative Thinking Explained".

4. **Timeline math (pure functions in `utils/time.ts`, no DOM deps):**
   - `timeToPct(t, duration) = clamp(t / duration, 0, 1)` — drives every layer's left/width.
   - hover time from pointer, computed inline in `<Timeline>`:
     `pct = clamp((e.clientX - rect.left) / rect.width, 0, 1)`, then `time = pct * duration`.
     (An earlier `pctToTime` helper was removed — the one call site inlines the multiply.)
   - `clamp(n, min, max)` — shared by the above and the tooltip edge-clamping.
   - `buildChapterSpans(chapters, duration)` / `chapterAt(spans, t)` — the `[start, nextStart)`
     span model and hover lookup (Decision #3).
   - `formatTime(t, pad?)` → **control-bar clock** uses `m:ss` (`0:59`, `5:48`); **tooltip**
     uses zero-padded `mm:ss` (`00:59`) to match Figma's `01:45`. One helper, a `pad` flag.

4b. **Chapter colors (from Figma):** default segment `#8B8EA4`; played overlay + knob
    `#F6F9FF`; the **hovered** chapter's whole segment turns `#76A4F9`. The accent only shows
    on hover — there's no persistent blue "played" color.

4c. **Timeline = 3 stacked layers** (spec: figma.md §3): (1) base chapter-segments row
    `#8B8EA4`, (2) played overlay `#F6F9FF` drawn `0 → currentTime`, (3) hover accent
    `#76A4F9` recoloring the **single** hovered segment; knob `4×18` at `currentTime` above
    all. Played (time-driven) and hover (pointer-driven) are **independent** — the mock draws
    them at different positions on purpose, so don't couple them. Timeline/progress/hover/
    tooltip specs come from `Frame 1000002052`; overall layout + full icon set from `Video player`.

5. **Quality switching:** build the menu from `hls.levels` after `MANIFEST_PARSED`; label by
   `level.height` (`720p`, `480p`, …) plus an **Auto** entry. Select → set
   `hls.currentLevel` (`-1` = Auto/ABR). Native-HLS (Safari) path: hide the menu or expose
   whatever the browser gives (Safari doesn't allow manual level control).
   - **As built:** the menu math is a **pure function** `buildQualityLevels(hls.levels)` in
     `utils/levels.ts` (with `AUTO_LEVEL = -1`), so `useHls` stays a thin imperative wrapper
     and the level list is unit-testable without hls.js (see Decision #11 / `tests/req3-*`).
     `useHls` re-exports `AUTO_LEVEL` for back-compat.
   - **Levels are 100% dynamic** — never hardcode `1080p`/`720p`. The assignment text lists
     `720p, 1080p` only as *examples*; the real test stream tops out at 720p (see Learnings).
     Whatever `hls.levels` reports is what we render. Check the hls.js API for the exact shape
     (`level.height`, `level.bitrate`, `hls.currentLevel`, `hls.autoLevelEnabled`).

5b. **Settings menu = flat quality popover (as built).** We considered a generic,
    data-driven `<SettingsMenu settings={[...]} />` (descriptor per setting, auto flat-vs-
    submenu rendering) to make adding "playback speed"/"captions" a one-line change. **We did
    not build that abstraction** — quality is the only setting the brief requires, so the
    generic version would have been speculative complexity (YAGNI). The shipped component is
    quality-specific: `<SettingsMenu levels current onSelect />`, rendering a **flat** list of
    levels with the active one checked; opens on the gear, closes on outside-click or re-click.
    - If a second setting is ever needed, revisit the descriptor idea then — the flat list is
      cheap to generalize and there's no nesting to unwind.

6. **Seeking:** click on the timeline sets `video.currentTime`. Optional drag: `pointerdown`
   on the track → track `pointermove` on `window` → `pointerup` to commit; update the fill
   live while dragging.

7. **Tooltip positioning:** absolutely positioned inside the player, `left` follows the
   pointer, **clamped** so it never overflows the player edges; `transform: translateX(-50%)`
   to center it on the cursor.

8. **No icon library** — icons come from the **Figma export** (SVG, `fill="currentColor"`)
   in `src/components/icons/`: `play.svg`, `volume.svg`, `settings.svg` (gear),
   `fullscreen.svg` (four-corner). `Icon.tsx` inlines each via Vite's `?raw` import so they
   inherit `--vp-fg`. We derive **no** extra glyphs: the design has a single play icon and the
   player is **play-only** (no `pause`), and volume is display-only (no `mute` glyph) — so the
   four Figma exports are the complete set.
   - **Naming is our call, by function.** Figma is the UI reference, not our filenames. Note
     the fullscreen ⛶ glyph lives in a frame *named* `settings` (the second one) — identify
     each icon by its **node/shape, not its layer name**, and export as
     `play/volume/settings/fullscreen.svg`.
   - **Display-only icons:** per the design owner, **volume** and **fullscreen** are shown to
     match Figma but are **not required to be functional** — rendered as non-interactive
     `<span aria-hidden>` in `<Controls>`, not wired. **play**, **timeline**, and
     **settings/quality** are fully functional.

9. **Accessibility (baseline):** interactive controls are real `<button>`s with `aria-label`.
   The timeline track is a **plain clickable region** — click-to-seek only. We initially gave
   it `role="slider"` + `aria-valuemin/max/now/text` + `tabIndex=0`, then **removed them**: the
   `slider` role is a contract that promises arrow-key operability, and we don't wire keyboard
   seeking (out of scope). Advertising an interaction we don't implement is worse than not
   advertising it, so the honest choice for a brief with no a11y requirement is to drop the
   role rather than half-implement it. (If keyboard seek is ever wanted, restore the role *and*
   wire the arrow keys together.)

10. **Config-driven:** `<VideoPlayer>` takes the input object
    (`{ hlsPlaylistUrl, videoLength, chapters }`) as **props**. `App.tsx` imports it from
    [`test-input.json`](./test-input.json) and renders `<VideoPlayer {...input} />`.

11. **Testing = pure-unit only, organized by requirement.** Vitest, run with `npm test`
    (`vitest run`). Tests live in a top-level [`tests/`](./tests) folder, **one file per
    requirement** so the suite reads as a coverage checklist:
    - `req3-resolution.test.ts` → `buildQualityLevels` (Auto on top, tallest-first, id↔hls
      index, no hardcoded 1080p, bitrate fallback) — uses the real stream's levels.
    - `req4-chapters.test.ts` → `buildChapterSpans` (gap-free spans, full `0→duration`
      coverage, last→duration, sorting) — uses the real `test-input.json` chapters.
    - `req5-timeline-interaction.test.ts` → `chapterAt` hover lookup (incl. the in-gap `t=14.5`
      case and the `t=59` worked example), `formatTime` for both the tooltip (`01:45`) and the
      `m:ss` clock, and the click-seek math (`pct*duration`, round-trip, clamp, div-by-zero).
    - **Scope (deliberate):** these cover the **pure logic** in `utils/` only. Component
      rendering, real DOM pointer events, and the visual Figma match are **verified manually**,
      not with jsdom/Testing-Library — that machinery is more than this brief warrants, and the
      pure functions are where the bug-prone math lives. This is the reason the seek/level math
      was kept as pure functions in `utils/` in the first place (Decisions #4, #5).

---

## Project structure (planned)

```
video_player/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ README.md           # setup/run instructions + key decisions (submission)
├─ figma.md            # UI/behavior spec
├─ decisions.md        # this file
├─ test-input.json     # sample input (HLS url, length, chapters)
└─ src/
   ├─ main.tsx         # React entry
   ├─ App.tsx          # loads test-input.json, renders <VideoPlayer {...input} />
   ├─ index.css        # page shell + Rubik font, centers the player
   ├─ types.ts         # PlayerInput, Chapter, QualityLevel, PlayerState
   ├─ components/
   │  ├─ VideoPlayer.tsx     # top-level: <video> ref, state, layout
   │  ├─ Controls.tsx        # bar: play + (display-only) volume + time + gear + fullscreen
   │  ├─ Timeline.tsx        # segments + played fill + hover accent + tooltip + seek (inline layers)
   │  ├─ SettingsMenu.tsx    # flat quality popover from hls.levels
   │  ├─ icons/              # Icon.tsx + play, volume, settings, fullscreen (SVG, ?raw)
   │  └─ *.module.css        # scoped styles per component
   ├─ hooks/
   │  ├─ useHls.ts           # hls.js lifecycle + levels + quality switch
   │  └─ usePlayerState.ts   # subscribe to <video> events → { currentTime, duration, buffered }
   └─ utils/
      ├─ time.ts             # clamp, timeToPct, formatTime, buildChapterSpans, chapterAt
      └─ levels.ts           # AUTO_LEVEL, buildQualityLevels (pure resolution-menu math)
tests/                       # Vitest, pure-unit, one file per requirement (npm test)
├─ req3-resolution.test.ts   # buildQualityLevels
├─ req4-chapters.test.ts     # buildChapterSpans (real test-input.json chapters)
└─ req5-timeline-interaction.test.ts  # chapterAt, formatTime, seek/clamp math
```


## Build order (from figma.md §11)

1. Vite `react-ts` scaffold; `App.tsx` renders `<VideoPlayer>` with `test-input.json`.
2. **useHls** + `<video>` + basic playback (play on click, time display).
3. **Timeline** (played fill + click-to-seek).
4. Chapter **segments** on the track (inline in `<Timeline>`).
5. Hover **tooltip** (chapter name + hovered time), inline in `<Timeline>`. ⭐
6. **SettingsMenu** from `hls.levels`.
7. Volume + fullscreen icons (display-only, per the brief).
8. Responsive polish, a11y baseline.
9. **Unit tests** (Vitest) over the pure `utils/` logic, one file per requirement (Decision #11).
10. **README** (setup/run + key decisions) and push to a public GitHub repo.

---

## Submission (from the brief's guidelines)

- **Public GitHub repo** — `git init`, push to a public repo.
- **README.md** with:
  - one-line what-it-is, screenshot/gif optional,
  - **setup & run**: `npm install` → `npm run dev` (and `npm run build` / `npm run preview`),
  - which browsers tested, note on Safari native-HLS behavior,
  - **key decisions / challenges** — short writeup (React + hls.js, "from scratch" scope,
    chapter `[start, nextStart)` handling, timeline hover/seek math).
- Keep `figma.md` + `decisions.md` in the repo as design/decision records.

---

## Learnings (discovered while building)

> **Convention:** anything we discover *during* the build — from the HLS stream, hls.js, the
> browser, or testing — gets recorded here (dated), not just fixed silently. This is the
> running log so the README write-up and future decisions have a paper trail.

- **2026-07-05 — Real HLS levels of the test stream.** Fetched the master playlist
  (`.../b87ac5f4-…/playlist.m3u8`). Variants exposed: **240p (426×240), 360p (640×360),
  480p (854×480), 720p (1280×720)** — **no 1080p**. So:
  - The quality menu must be built from `hls.levels`; a hardcoded `1080p` entry would be a
    dead option for this input. (See decision #5 / #5b.)
  - Order the menu by height descending + an **Auto** entry on top.
- **hls.js API (confirmed while building §5):** levels come from `hls.levels[i].height` /
  `.bitrate` after `Hls.Events.MANIFEST_PARSED`; selecting a level = `hls.currentLevel = id`
  (`-1` = Auto/ABR). Menu is built there and sorted by height descending with an Auto entry on
  top. Native-HLS (Safari) is detected via `Hls.isSupported()` + `canPlayType('application/
  vnd.apple.mpegurl')`; there we set `video.src` directly and hide the gear (no manual levels).
- **2026-07-05 — "Auto" wasn't staying selected.** We initially listened to
  `Hls.Events.LEVEL_SWITCHED` and, while `hls.autoLevelEnabled`, wrote the ABR-resolved level
  index back into `currentLevel` (intending to *show* the active height). But `currentLevel`
  also drives the menu checkmark, so picking **Auto** immediately re-checked whatever rendition
  ABR resolved to (e.g. 720p). **Fix:** removed the `LEVEL_SWITCHED` handler — `currentLevel`
  now reflects the **user's** choice only. Lesson: don't overload one value for "what the user
  picked" and "what's playing." Showing the live ABR height would need a separate state.

## Resolved from Figma (extracted 2026-07-05)

- ✅ **Build target = the full `Video player` frame (`1:243`)** with **all icons** (play,
  volume, time, gear, fullscreen). `Frame 1000002052` (`1:54`) is **not** a smaller variant to
  build — it's the *magnified timeline spec* (it hides volume/fullscreen to focus on the bar).
  Layout + icons ← `Video player`; timeline/progress/hover/tooltip ← `Frame 1000002052`.
- ✅ **Accent** = `#76A4F9` (hover highlight), **not** `#3B82F6`. Track `#8B8EA4`, played/knob
  `#F6F9FF`. Tooltip bg `#1B1B1E`, radius `6px`, 8px padding, white 12px Rubik text + pointer.
- ✅ Chapters are **segments-with-4px-gaps** (YouTube-style), not tick markers. 4px track,
  1px radius; knob 4×18.
- ✅ Tooltip is **text-only** (no thumbnail) in the design — thumbnail stays a stretch goal.
- ✅ Font is **Rubik** (must be loaded); time text 18px/28 right-aligned.

