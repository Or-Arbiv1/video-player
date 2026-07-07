# Implementation Decisions

How we're building the video player. This complements [`figma.md`](./figma.md) (the *what*/
*how it looks*) — this file is the *how we build it*.

---

## Stack

| Area        | Choice | Why |
|-------------|--------|-----|
| Framework   | **React** (Vite `react-ts` template) | The brief says *"You may use any React-based web technologies."* React is the expected stack. |
| Build/tool  | **Vite** | Fast dev server + bundler; one `npm run dev` for reviewers; clean imports. |
| Language    | **TypeScript** | Type the input model, chapters, and HLS levels; catch bugs; signals quality. |
| UI          | **React components + hooks**, our own DOM/SVG | We build the player itself — components, timeline, controls. No pre-built player component. |
| Styling     | **CSS Modules** (`*.module.css`) + CSS custom properties for tokens | Scoped styles per component; tokens map to figma.md §10. No CSS framework. |
| Font        | **Rubik** (400) via Google Fonts `@import`/`<link>` | Figma uses Rubik for time text (18px/28) and tooltip (12px). |
| Streaming   | **hls.js** (npm dependency) | Explicitly allowed by the assignment. It's the transport, not the player UI. |

**"From scratch" rule of thumb:** the only non-React runtime dependency is **hls.js**. No
video-player library (no video.js, Plyr, react-player, Vidstack, etc.) — all controls,
timeline, chapters, tooltip, and menus are our own React code.

---

## Design tokens (from figma.md §10 — exact Figma values)

```css
:root {
  --vp-bg: #FFFFFF;          /* player frame fill; radius 10px; shadow 0 4 6 rgba(0,0,0,.09) */
  --vp-track: #8B8EA4;       /* unplayed timeline / chapter segments */
  --vp-played: #F6F9FF;      /* played fill overlay + 4x18 scrubber knob */
  --vp-accent: #76A4F9;      /* hovered chapter highlight (periwinkle) — NOT #3B82F6 */
  --vp-fg: #FFFFFF;          /* icons + time text */
  --vp-tooltip-bg: #1B1B1E;  /* tooltip box + pointer, radius 6px */
  --vp-tooltip-fg: #FFFFFF;
  --vp-scrim: linear-gradient(to top, rgba(0,0,0,.8) 0%, rgba(0,0,0,0) 100%); /* 156px tall */
  --vp-font: 'Rubik', sans-serif;
  --vp-radius: 10px;
  --vp-track-h: 4px;
  --vp-gap: 4px;             /* between chapter segments */
  --vp-knob: 4px 18px;       /* w h */
}
```

- Time text: `Rubik 400 18px/28px`, right-aligned. Tooltip text: `Rubik 400 12px/~14px`, centered.
- Icon buttons: 31×31 hit target, 24px glyph, `--vp-fg`. Control cluster padding: 14px sides,
  12px bottom, 12px gap between timeline row and button row. Button row = two clusters
  (left: play·volume·time · right: gear·fullscreen), each `gap 12px`, row itself
  `justify-content: space-between` so the right cluster pins to the edge.

---

## Architecture — modular React components

A top-level **`<VideoPlayer>`** owns the `<video>` ref and player state, and composes
small, single-responsibility child components.

```
<VideoPlayer>                  → owns <video> ref + state, wires hls, lays out the UI
├─ useHls(url)                 → hls.js setup, load, quality switching (level math → utils/levels.ts)
├─ usePlayerState(videoRef)    → subscribes to <video> events → {currentTime,duration,buffered,paused,volume,muted}
├─ useFullscreen(containerRef) → Fullscreen API + fullscreenchange sync
├─ <Controls>                  → play/pause, time display, bar layout
│  ├─ <VolumeControl>          → mute toggle + hover-reveal slider
│  └─ <SettingsMenu>           → resolution popover built from hls.levels
└─ <Timeline>                  → segments, played fill, hover accent, tooltip, seek (stacked layers, inline)
```

### State & data flow
1. **`<VideoPlayer>` owns the `<video>` ref** and is the single source of truth.
   `usePlayerState` subscribes to the element's events (`timeupdate`, `durationchange`,
   `loadedmetadata`, `progress`, `seeking`, `seeked`, `play`, `pause`, `volumechange`) and
   exposes reactive state (`currentTime`, `duration`, `buffered`, `paused`, `volume`, `muted`).
   No parallel timer.
2. **Children receive props down** (state + config like `chapters`, `duration`, `levels`).
3. **Children call callbacks up** (`onSeek(t)`, `onToggle`, `onSelectLevel(id)`); the parent
   performs the action on the `<video>` / hls instance. No child touches the video element
   or another child directly.
4. **Imperative bits** (hls.js, Fullscreen API, `video.currentTime`) live behind refs/hooks,
   not in render. Pure logic stays in `utils/` (testable, no React).

### Adding a new control (the repeatable pattern)
Play/pause, fullscreen, and volume (#6, #7, #8 below) were all built the same way:
1. **State** — if the `<video>` element already tracks it, add a field to `usePlayerState`,
   synced off the relevant native event (e.g. `volumechange`). If it's a browser API with no
   `<video>` equivalent, give it its own hook (like `useFullscreen`) exposing state + a
   setter/toggle, synced off that API's own event — never invented toggle state.
2. **Action** — the imperative call (`video.play()`, `element.requestFullscreen()`) is a
   plain function in `VideoPlayer.tsx`. Never in a child.
3. **UI** — a component under `src/components/` (or inline in `<Controls>` if trivial) that
   takes state as props and calls a callback prop on interaction — never touches the video
   element or ref itself.
4. **Wire it** — `VideoPlayer` passes state down and the callback down, same props-down/
   callbacks-up rule as everything else (state/data-flow #2, #3 above).
5. **Icon** — reuse a Figma export if one exists. Only hand-draw a new glyph if it's a
   universally unambiguous shape (pause bars, mute slash — see #9). If there's no single
   obvious shape (fullscreen exit), don't invent one — reuse the existing icon and let
   `aria-label` carry the state.
6. **Log it** here, in this same numbered format, with the *why*.

---

## Key technical decisions

1. **Duration:** use the input's `videoLength` (348s) for initial chapter layout so the UI
   renders before metadata loads; reconcile with `video.duration` once
   `loadedmetadata`/HLS `MANIFEST_PARSED` fires if they differ.

2. **Chapters own `[start, nextStart)`.** The input has 1s gaps (e.g. `end:14`, next
   `start:15`). Each chapter's effective span runs from its `start` to the **next chapter's
   start** (last chapter → `videoLength`) for both rendering and hover-lookup, so the track
   has no dead zones. *Worked example:* hover `t = 59` → `58 ≤ 59 < 117` → "Analytical vs
   Creative Thinking Explained".

3. **Timeline math is pure (`utils/time.ts`, no DOM deps):**
   - `timeToPct(t, duration) = clamp(t / duration, 0, 1)` — drives every layer's left/width.
   - hover time from pointer (inline in `<Timeline>`):
     `pct = clamp((e.clientX - rect.left) / rect.width, 0, 1)`, then `time = pct * duration`.
   - `buildChapterSpans(chapters, duration)` / `chapterAt(spans, t)` — the `[start, nextStart)`
     span model and hover lookup.
   - `formatTime(t, pad?)` → control-bar clock uses `m:ss` (`0:59`, `5:48`); tooltip uses
     zero-padded `mm:ss` (`00:59`) to match Figma's `01:45`.

4. **Timeline = 3 stacked layers** (figma.md §3): (1) base chapter segments `#8B8EA4`, 4px
   gaps, (2) played overlay `#F6F9FF` drawn `0 → currentTime`, (3) hover accent `#76A4F9`
   recoloring the single hovered segment; knob `4×18` `#F6F9FF` at `currentTime` above all.
   Played (time-driven) and hover (pointer-driven) are independent layers, positioned by
   percentage of duration so they always align.
   - **Tooltip** is absolutely positioned inside the player, `left` follows the pointer,
     clamped so it never overflows the player edges, `transform: translateX(-50%)` to
     center it on the cursor.
   - **Buffered indicator** (not in the Figma design) sits below the played overlay, a
     subtle `rgba(246, 249, 255, 0.35)` fill (35% of `--vp-played`) from `0 → buffered`,
     read off `video.buffered.end(...)` in `usePlayerState`. Added because real HLS playback
     benefits from showing network progress even though the mock doesn't call for it; kept
     subtle so it doesn't compete visually with played/hover.

5. **Quality switching:** menu built from `hls.levels` after `MANIFEST_PARSED`, labeled by
   `level.height` (`720p`, `480p`, …) plus an **Auto** entry; selecting sets
   `hls.currentLevel` (`-1` = Auto/ABR). Native-HLS (Safari) hides the menu — no manual level
   control there. The menu math is a pure function `buildQualityLevels(hls.levels)` in
   `utils/levels.ts` (`AUTO_LEVEL = -1`), so `useHls` stays a thin imperative wrapper and the
   level list is unit-testable without hls.js. Levels are 100% dynamic — never hardcoded.
   - **Settings menu is a flat, quality-specific popover** (`<SettingsMenu levels current
     onSelect />`), not a generic data-driven settings-descriptor abstraction — quality is
     the only setting the brief needs (YAGNI). Opens on the gear, closes on outside-click or
     re-click, active level checked.
   - **HLS error recovery is type-specific, not blanket retry-or-die.** On a fatal
     `Hls.Events.ERROR`: `NETWORK_ERROR` → `hls.startLoad()` (retry), `MEDIA_ERROR` →
     `hls.recoverMediaError()` (rebuild the media pipeline in place), anything else →
     surface a visible error message and `hls.destroy()`. Non-fatal errors are ignored.
     Network/media errors are usually transient (recoverable in place); other fatal errors
     aren't, so failing visibly beats retrying into a loop.

6. **Play/pause:** the play button (and clicking the video) toggles playback via
   `video.play()`/`video.pause()`; `usePlayerState`'s `paused` field (synced off the video's
   own `play`/`pause` events) picks the icon and `aria-label`.

7. **Fullscreen:** `useFullscreen(containerRef)` toggles the Fullscreen API on the **player
   container** (not the `<video>`, so the timeline/controls overlay stays usable in
   fullscreen); `isFullscreen` is synced off the browser's own `fullscreenchange` event, so
   Esc/browser-chrome exits stay in sync. `.player:fullscreen` overrides the normal
   `max-width: 960px` / fixed `aspect-ratio` to `100vw`/`100vh` so it actually fills the
   screen. The gear keeps rendering the single Figma `fullscreen.svg` in both states — no
   second glyph — with `aria-label` ("Fullscreen" / "Exit fullscreen") communicating state.
   Not supported on iOS Safari (no arbitrary-container Fullscreen API there).

8. **Volume:** `<VolumeControl>` — a button that toggles mute, plus a hover/focus-revealed
   vertical 0–100% slider (`<input type="range">` rotated -90°), popover-styled like
   `<SettingsMenu>`'s gear popover. `usePlayerState` carries `volume`/`muted`, synced off the
   video's own `volumechange` event.
   - `setVolume(level)` sets `video.muted = level === 0` in the same call that sets
     `video.volume`, so `muted` is the single source of truth for "silent" — the slider
     always reads `muted ? 0 : volume`.
   - Un-muting restores the last non-zero level, remembered in a `lastVolumeRef` (plain ref,
     write-only bookkeeping, never rendered).
   - The slider's hoverable box (`.sliderWrap`) sits flush against the button
     (`bottom: 100%`, no gap) with the visual gap moved inside as `padding-bottom`, so
     moving the cursor from the button to the slider never crosses dead space.

9. **Icons — Figma exports plus two hand-authored exceptions.** `src/components/icons/`:
   `play.svg`, `volume.svg`, `settings.svg`, `fullscreen.svg` are exact Figma exports,
   inlined via Vite's `?raw` import so they inherit `--vp-fg` through `currentColor`.
   - `pause.svg` and `volume-muted.svg` are hand-drawn (Figma never exported them), matching
     the real exports' style exactly: same `31×31` viewBox, `24×24`/`currentColor` contract.
     `volume-muted.svg` reuses `volume.svg`'s exact speaker-cone path plus a diagonal slash.
     Both are safe hand-draws because they're universally recognized shapes (pause bars,
     muted-speaker slash) — unlike a fullscreen "exit" icon, which has no single
     universally-recognized shape, so we deliberately did **not** hand-draw one (#6 above).
   - Naming is by function, not Figma layer name (the fullscreen ⛶ glyph lives in a frame
     named `settings`) — identify each icon by its node/shape.

10. **Accessibility baseline:** interactive controls are real `<button>`s with `aria-label`.
    The timeline track is a plain clickable region (click-to-seek only) — no `role="slider"`,
    since keyboard seeking isn't wired and advertising an interaction that isn't implemented
    is worse than not advertising it.
    - **`<VolumeControl>`'s slider isn't hover-only.** It also opens on `onFocus` and closes
      on `onBlur` (only if focus leaves the whole control, checked via
      `e.currentTarget.contains(e.relatedTarget)`), so tabbing to the mute button reveals
      the slider for keyboard users too, not just mouse hover.

11. **Config-driven:** `<VideoPlayer>` takes `{ hlsPlaylistUrl, videoLength, chapters }` as
    props; `App.tsx` imports them from [`test-input.json`](./test-input.json).

12. **Testing = pure-unit only, one file per requirement.** Vitest (`npm test`), tests live
    in top-level [`tests/`](./tests):
    - `req3-resolution.test.ts` → `buildQualityLevels` (Auto on top, tallest-first, id↔hls
      index, no hardcoded 1080p, bitrate fallback).
    - `req4-chapters.test.ts` → `buildChapterSpans` (gap-free spans, full `0→duration`
      coverage, last→duration, sorting) — against the real `test-input.json` chapters.
    - `req5-timeline-interaction.test.ts` → `chapterAt` hover lookup, `formatTime` for both
      the tooltip (`01:45`) and the `m:ss` clock, and the click-seek math (`pct*duration`,
      round-trip, clamp, div-by-zero).
    - Scope is deliberately the **pure logic** in `utils/` only — component rendering, real
      DOM pointer events, and the visual Figma match are verified manually.
