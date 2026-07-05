# Video Player — Figma & Functionality Spec

This document is the **source of truth** for the video player. Whenever we add a new
feature, we read the relevant section here to know how the player should look and behave
(instead of connecting to Figma directly). Values below were **extracted directly from the
Figma file** (`YedaLabs - Assignment`, file key `yNlCe9kJHSurVPVpD2Evjm`) — see §10 for the
exact tokens.

## Figma frames (reference)

The Figma file `YedaLabs - Assignment` has one page (`Page 1`) with two top-level frames:

- **`Video player`** (node `1:243`) — a `1620 × 890` presentation board wrapping the
  **canonical player** (`960 × 541`, inner node `1:247`) with the **full control bar**:
  `▶ · 🔊 · 0:00 / 2:05 · …(spacer)… · ⚙ · ⛶`. This is the design to implement exactly.
- **`Frame 1000002052`** (node `1:54`, the one the shared URL opens) — a `960 × 540`
  **reference for the timeline interaction**. It shows a **hovered chapter highlighted in
  periwinkle blue** (`#76A4F9`) with the **chapter hover tooltip** (`Corporate culture /
  01:45`) pointing down at it. It renders a reduced control bar (`▶ · 0:00 / 2:05 · … · ⚙`,
  no volume/fullscreen) because it's focused on the timeline — this is **not** a compact
  variant; the full player keeps all controls.

> **Build target = the full `Video player` frame (`1:243`)** — the complete control bar with
> **all icons** (play · volume · time · …spacer… · gear · fullscreen). **Do not build the
> reduced bar** from `Frame 1000002052`; that frame is **not** a smaller/compact variant —
> it's a *magnified spec for the timeline*, and it simply hides volume/fullscreen so the bar,
> hover highlight and tooltip are easier to read.
>
> Split of authority:
> - **Layout + full icon set** → `Video player` (`1:243`).
> - **Timeline / progress bar / chapter hover / tooltip** → `Frame 1000002052` (`1:54`).
>
> Both frames share identical timeline, scrim, tooltip and type styles — only the control set differs.

---

## 0. Assignment Requirements (the contract)

1. **Build the video player from scratch** — no third-party libraries or open-source
   players for the player UI/logic.
2. **Implement the design exactly** as it appears in Figma.
3. Support **HLS streaming** and let users **change resolution** (720p, 1080p, …).
   - `hls.js` **is allowed** for the streaming engine (explicit hint). The "from scratch"
     rule applies to the **player UI and controls**, not the HLS transport.
4. **Display chapters on the timeline** as shown in the Figma design.
5. **Timeline interaction:**
   - a. On **hover**, show the **hovered time** and the **name of the hovered chapter**.
   - b. **Clicking** the timeline **seeks** the video to that time.

Everything below describes how to satisfy these.

---

## 1. Overall Layout

- Rectangular **16:9-ish** video surface (reference `960 × 541`), control bar overlaid on the bottom.
- **Responsive**: scales to its container while keeping aspect ratio.
- Layer stack (bottom → top):
  1. `<video>` element (HLS source, fills frame).
  2. Bottom **gradient scrim** (transparent → dark) for legibility.
  3. **Timeline** (thin, full-width, just above the buttons).
  4. **Control bar** (buttons + time text).
  5. **Overlays**: chapter hover tooltip, resolution/settings menu.

---

## 2. Control Bar  (from the `Video player` frame)

Horizontal bar pinned to the bottom. Left → right:

| Order | Control            | Icon / Text   | Behavior |
|-------|--------------------|---------------|----------|
| 1     | Play / Pause       | ▶ / ⏸         | Toggles playback; icon swaps with state. |
| 2     | Volume / Mute      | 🔊 speaker    | **Display-only** (render to match Figma; wiring optional). |
| 3     | Time display       | `0:00 / 2:05` | `currentTime / duration` in `m:ss`, live. |
| 4     | *(flex spacer)*    | —             | Pushes right-side controls to the far edge. |
| 5     | Settings / Quality | ⚙ gear        | Opens the **resolution menu** (720p / 1080p / Auto). See §5. |
| 6     | Fullscreen         | ⛶             | **Display-only** (render to match Figma; wiring optional). |

- Controls have a **hover state** (brighter/highlighted).
- All icons/text are **white** (`#FFFFFF`) over the dark scrim; each icon sits in a **31×31**
  hit target (24px glyph). Time text is **Rubik 18px/28, right-aligned**.
- **What Figma actually draws:** the icons only — play (▶), volume (🔊, `volume_up` glyph),
  gear (⚙), and a four-corner fullscreen (⛶). There is **no volume slider, no mute-state
  icon, and no auto-hide** shown in the design; those are inferred UX (§8) — keep them
  consistent with the extracted tokens.
- (Behavior, inferred) control bar + scrim **auto-hide** after inactivity during playback and
  **reappear** on mouse move / focus.

---

## 3. Timeline / Progress Bar  ⭐ (requirements #4 & #5, ref `Frame 1000002052`)

Thin horizontal track spanning the **full width** of the player (**4px tall**, corner
radius **1px**), just above the buttons. Figma geometry: track is `931px` wide inside the
`960px` frame (14px side padding), segments laid out horizontally with a **4px gap** between
them.

### Layer model — build as **3 stacked layers** (from `Frame 1000002052`)
The track is **not one element**. Figma stacks three independent layers, and we build it the
same way so **playback (time-driven)** and **hover (pointer-driven)** stay decoupled:
1. **Base — chapter segments row.** `#8B8EA4` segments (one per chapter, 4px gaps), widths
   proportional to each chapter's share of `videoLength`.
2. **Played overlay.** A `#F6F9FF` fill drawn on top from `0 → currentTime`. In the mock it's a
   *separate* bar pinned at the track start (~125px), **not** a recolored segment — proof that
   played position is independent of the hovered chapter.
3. **Hover accent.** The single segment under the cursor recolors to `#76A4F9`. In the mock
   this is the 5th segment (far right) while played sits at ~13% — different places on purpose.

The scrubber knob (`4×18`, `#F6F9FF`) rides at `currentTime` on top of all three layers.

### Visual segments (exact Figma colors — see §10)
- **Remaining / default chapter** track — **`#8B8EA4`** (muted gray-blue).
- **Played** portion — **`#F6F9FF`** (near-white), an overlay drawn from `0 → currentTime`
  on top of the chapter segments. (In the mock it covers ~125px of the first segment.)
- **Hovered chapter** — the whole segment under the cursor turns **`#76A4F9`** (periwinkle
  blue). This is the design's accent and appears **only on hover** (see `Frame 1000002052`,
  where the last segment is blue with the tooltip above it).
- **Scrubber handle** — a **`4 × 18`px** near-white (`#F6F9FF`) knob at the current position,
  extending above/below the 4px track; enlarges on hover.
- **Buffered** portion — not in the Figma design; if added for HLS, use a subtle fill between
  `#8B8EA4` and `#F6F9FF` so it doesn't compete with played/hover.

### Chapters on the timeline (#4)
- The timeline is **divided into chapter segments** rendered as **contiguous ranges with
  small (4px) gaps** between chapters (YouTube-style). The mock shows **5 equal segments**;
  the real segment count/widths come from the chapter data (`test-input.json` has 7).
- Chapter boundaries come from the **chapter data** (see model below). Because the input has
  1s gaps between `end` and the next `start` (see notes), render each segment from its
  **`start` to the next chapter's `start`** (last chapter → `videoLength`) so the segments
  tile the bar with no dead track. See [`decisions.md`](./decisions.md) #3.

### Interaction (#5)
- **Hover** anywhere on the bar → show the **chapter hover tooltip** (§4) with:
  - the **time at the hovered x-position** (`m:ss`), and
  - the **name of the chapter** whose range contains that time, using the half-open lookup
    `start ≤ t < nextStart` (last chapter runs to `videoLength`). This avoids blank titles in
    the 1s gaps between a chapter's `end` and the next chapter's `start`.
- **Move** along the bar → tooltip follows the cursor and updates time + chapter.
- **Click** on the bar → **seek** the video to the hovered time.
- (Nice-to-have) **drag** the scrubber to scrub continuously.

### Chapter data model
The player is fed an input object (see `test-input.json`):

```jsonc
{
  "hlsPlaylistUrl": "https://.../playlist.m3u8", // HLS source (§6)
  "videoLength": 348,                            // total seconds (5:48)
  "chapters": [
    { "title": "Introduction & Course Overview", "start": 0,   "end": 14  },
    { "title": "...",                             "start": 15,  "end": 57  }
    // ...7 chapters total, contiguous, covering 0 → 348s
  ]
}
```

Notes:
- Each chapter has an explicit **`start`/`end`** (seconds). The chapters are **not** perfectly
  contiguous — there's a **1s gap** between each `end` and the next `start` (e.g. `end:14`,
  next `start:15`). Don't treat them as tiling on `[start, end]`.
- Instead, each chapter effectively **owns `[start, nextStart)`** for both rendering and
  hover-lookup (last chapter → `videoLength`). This closes the gaps.
- The hovered chapter = the one where `start ≤ t < nextStart`.
- Render chapter **segments on the bar from `start` → next `start`** relative to `videoLength`
  (optionally draw thin visual gaps at boundaries for the YouTube look — but the *lookup*
  stays gap-free).
- Prefer `videoLength` (348) for the total; fall back to the video's real `duration` once
  HLS metadata loads if they differ.

---

## 4. Chapter Hover Tooltip  (ref `Frame 1000002052`)

When hovering the timeline, a floating tooltip appears above the cursor (exact Figma values):

- **Dark rounded box** — fill **`#1B1B1E`**, corner radius **6px**, **8px padding** all
  sides, **4px** gap between the two lines. Drop shadow `0 4 6 rgba(0,0,0,0.09)`.
- A small **downward pointer/arrow** (same `#1B1B1E`) centered under the box, aimed at the
  hovered position on the bar.
- **Two centered lines**, both **Rubik 400, 12px**, line-height ~14px, **white** `#FFFFFF`:
  - Line 1 — **chapter title** (the chapter containing the hovered time).
  - Line 2 — **timestamp** at the hovered position. Figma draws it **zero-padded** (`01:45` =
    `mm:ss`), unlike the control-bar clock which is `m:ss` (`0:00`). Match each as drawn.

**Worked example (test-input, hover at `t = 59s`):** `58 ≤ 59 < 117` → chapter #3, so the
tooltip reads **line 1 `Analytical vs Creative Thinking Explained`**, **line 2 `00:59`**. (The
control-bar clock renders that same 59s as `0:59` — no minute padding.) This is the behavior
`Frame 1000002052` illustrates.
- **Follows the horizontal cursor** along the bar; stays clamped inside the player edges.
- Title reflects the **chapter containing the hovered time**; that chapter's segment
  highlights in `#76A4F9` (§3).
- (Stretch, not in Figma) a **thumbnail** of the frame at that time above the text.

---

## 5. Resolution / Settings Menu (⚙)  (requirement #3)

Opened by the gear icon; popover anchored above/near the gear.

- Lists the **quality levels** exposed by HLS: **Auto**, **1080p**, **720p**, … built from
  `hls.levels`.
- Selecting a level sets `hls.currentLevel` (or `-1` for Auto/ABR).
- Current selection is **checked/highlighted**.
- Closes on outside click or re-click of the gear.

---

## 6. HLS Streaming (requirement #3)

- Load the stream via **`hls.js`**; attach to the `<video>` element.
- If the browser supports HLS natively (Safari), fall back to `video.src` directly.
- Populate the resolution menu from `hls.levels` after `MANIFEST_PARSED`.
- Handle basic HLS errors (network/media) gracefully.

---

## 7. Fullscreen (⛶)  — *display-only (optional functionality)*

> Per the design owner, the fullscreen button is **decorative** — render the four-corner icon
> to match Figma; wiring it up is optional. If implemented:

- Toggle the Fullscreen API on the **player container**.
- Icon reflects state (enter ⛶ / exit).
- All controls keep working in fullscreen.

---

## 8. Volume Control (🔊)  — *display-only (optional functionality)*

> Per the design owner, the volume button is **decorative** — render the `volume_up` icon to
> match Figma; wiring it up is optional. Figma shows **no slider and no mute-state icon**. If
> implemented:

- Click speaker → toggle **mute/unmute** (icon changes: waves vs. muted).
- Hover/click reveals a **volume slider** (0–100%).
- Muted state reflected in the icon.

---

## 9. States Summary

| State             | Visual |
|-------------------|--------|
| Idle / poster     | Poster frame, time `0:00 / 2:05`, controls visible. |
| Playing           | ⏸ icon, blue progress fills, controls auto-hide on inactivity. |
| Paused            | ▶ icon, controls stay visible. |
| Hover on timeline | Chapter tooltip (title + hovered time), scrubber enlarges. |
| Seeking (click)   | Playback jumps to hovered time. |
| Quality menu open | Resolution popover over the video. |
| Muted             | Speaker icon shows muted. |
| Fullscreen        | Player fills screen; exit icon shown. |

---

## 10. Visual Style Tokens (extracted from Figma — exact)

Pulled directly from the Figma nodes. Use these as the CSS custom properties in
`decisions.md` (Styling).

### Colors

| Token                          | Value                          | Where |
|--------------------------------|--------------------------------|-------|
| `--player-bg`                  | `#FFFFFF`                      | Player frame fill (radius **10px**, shadow `0 4 6 rgba(0,0,0,0.09)`). |
| `--track`  (chapter default)   | `#8B8EA4`                      | Unplayed timeline / chapter segments (radius 1px). |
| `--played` (progress + knob)   | `#F6F9FF`                      | Played fill overlay **and** the `4×18` scrubber knob. |
| `--accent` (hover highlight)   | `#76A4F9`                      | Hovered chapter segment (periwinkle blue). **This is the accent — not `#3B82F6`.** |
| `--fg` (icons + time text)     | `#FFFFFF`                      | All control-bar icons and the time text. |
| `--tooltip-bg`                 | `#1B1B1E`                      | Hover tooltip box + its pointer (radius **6px**). |
| `--tooltip-fg`                 | `#FFFFFF`                      | Tooltip text. |
| Scrim                          | `linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)` | Bottom gradient, **156px** tall, pinned to the bottom edge. |

### Typography — **Rubik** (must be loaded, e.g. Google Fonts)

| Style        | Family | Weight | Size | Line-height | Align  |
|--------------|--------|--------|------|-------------|--------|
| Time display | Rubik  | 400    | 18px | 28px        | right  |
| Tooltip text | Rubik  | 400    | 12px | ~14.2px     | center |

### Geometry / spacing

- **Frame:** `960 × 541`, corner radius **10px**, drop shadow `0 4 6 rgba(0,0,0,0.09)`.
- **Scrim:** 156px tall, bottom-anchored.
- **Timeline track:** 4px tall, radius 1px, **931px** wide (14px side padding), **4px** gaps
  between chapter segments. Scrubber knob **4×18** (`#F6F9FF`).
- **Control cluster** (`Frame 14`): vertical auto-layout, side padding **14px**, bottom
  padding **12px**, **12px** gap between the timeline row and the button row.
- **Button row** (`Frame 15`): horizontal auto-layout, **space-between** with two nested
  clusters — left (`Frame 14`, `gap 12`): play · volume · time; right (`Frame 15`, `gap 12`):
  gear · fullscreen. (The outer frame's `gap 8` never actually renders — it's space-between
  with only two children; the visible icon spacing is **12px** everywhere.) Each icon button
  is a **31×31** hit target around a 24px glyph; fullscreen is the four-corner "expand" mark,
  settings is a gear.
- **Duration reference:** the mock literally shows **`0:00 / 2:05`** (placeholder). Use the
  real `videoLength` (348s → `5:48`) / HLS duration at runtime.

---

## 11. Build Order (suggested)

1. Layout + `<video>` surface + poster.
2. **HLS via hls.js** + basic playback (play/pause, time display). (§6, §2)
3. **Timeline**: played/buffered fill + **click-to-seek**. (§3)
4. **Chapters on the timeline** (segments/markers). (§3, #4)
5. **Chapter hover tooltip** (time + chapter name). (§4, #5a) ⭐
6. **Resolution menu** from `hls.levels`. (§5, #3)
7. Volume/mute, fullscreen. (§7, §8)
8. Auto-hide controls + responsive polish.

> **Workflow reminder:** before implementing any item, re-read its section here and match
> the described look & behavior against the two Figma frames.
