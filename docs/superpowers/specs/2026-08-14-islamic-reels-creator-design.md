# Islamic Reels Creator — Design Spec

Date: 2026-08-14
Status: Approved (design)

## Overview

A single-page web app for creating short-form "reels": a landscape background
image overlaid with a Quran ayat (Arabic) and its translation, with subtle
motion and minimal editing controls. Users can preview the animated reel live
and export it as a WebM video or a PNG frame.

## Goals / Non-goals

Goals:

- Produce a reel from a background image + Quran ayat + matched translation.
- Provide an animated in-browser preview.
- Allow minimal editing: verse, translation language, background, text styling,
  layout, motion, overlay.
- Export the reel as WebM video and PNG frame.

Non-goals (v1):

- Audio/music, captions, multi-scene reels, timeline editor.
- MP4 export (WebM is browser-native; MP4 via ffmpeg.wasm deferred).
- User accounts, persistence across sessions (config stays in memory).
- WebGL shader effects.

## Platform

Vite + React + TypeScript, no backend. Single page, client-side only.

## Architecture

Three layers:

1. **Data layer** — fetches verses from `api.alquran.cloud/v1` (Arabic via
   `quran-uthmani`, translations via edition identifiers such as `en.sahih`,
   `ur.jalandhry`) and background images from LoremFlickr keyword URLs
   (`loremflickr.com`), which provides keyword-based stock photos without an API
   key. Verses are cached in memory keyed by `editionId+surah+ayat`.
2. **Rendering engine** (`reelRenderer`) — a pure module owning one `<canvas>`
   and a `requestAnimationFrame` loop. Consumes a `ReelConfig` and draws frames
   deterministically. Drives both the live preview and the export pipeline with
   the same code path.
3. **Editor UI** — two-panel layout: left = controls, right = live canvas
   preview + play/pause + Export buttons.

Single source of truth: `ReelConfig`, a plain serializable object edited by the
UI, consumed by the renderer, recorded by the exporter.

## Data model

```ts
interface Verse {
  surah: number;
  ayat: number;
  arabic: string;
  translation: string;
  editionId: string;
  editionName: string;
}

interface ReelConfig {
  verse: Verse;
  background: {
    url: string;
    fit: "cover-crop" | "blur-fill";
  };
  overlay: {
    color: string;      // hex
    opacity: number;    // 0..1
  };
  text: {
    arabicFont: string;
    arabicSize: number;
    translationFont: string;
    translationSize: number;
    textPosition: "center" | "lower-third";
    textColor: string;
    showGlow: boolean;
  };
  motion: {
    type: "kenburns-zoom" | "kenburns-pan" | "static";
    duration: number;   // seconds
  };
  aspectRatio: "9:16" | "1:1" | "16:9";
}
```

## Rendering engine

- Internal render resolution fixed per aspect ratio: 1080x1920 (9:16),
  1080x1080 (1:1), 1920x1080 (16:9); scaled to fit the preview canvas.
- Ken Burns: background image drawn with an eased zoom/pan transform over
  `motion.duration`.
- Text pipeline: Arabic drawn RTL with an Arabic-capable font; both Arabic and
  translation wrapped independently and centered; subtle drop shadow / glow.
  Surah + ayat reference (e.g. "Quran 2:255") rendered smaller below.
- Fade-in timing: background, then Arabic, then translation, then reference,
  eased across the first ~40% of the duration.
- `renderFrame(timeMs)` is deterministic: the same time always produces the same
  frame, which makes export consistent with preview.

## Editor UI

- **Verse panel**: surah + ayat inputs, translation language select, "Random
  verse" button, quick-pick suggestions.
- **Background panel**: image search by keyword (LoremFlickr), thumbnail grid,
  fit toggle (cover-crop vs blurred fill).
- **Style panel**: overlay tint color + opacity slider, Arabic font + size,
  translation font + size, text color, glow toggle.
- **Layout panel**: text position, aspect ratio.
- **Motion panel**: Ken Burns style + duration.
- **Preview**: live canvas, play/pause/restart.
- **Export**: "Download WebM" (MediaRecorder at real resolution, 30fps) and
  "Download PNG frame".

## Export pipeline

- MediaRecorder with `canvas.captureStream(30)`, timeslice 250ms, producing a
  WebM blob downloaded via object URL.
- PNG export via `canvas.toBlob`.
- Record mode runs at exact target resolution for the real duration (9-30s);
  a fast-mode render is a deferred enhancement.

## Error handling and edge cases

- Quran API failures: error banner + retry; cached verses still usable.
- LoremFlickr image load failure: blurred gradient placeholder.
- CORS taint: `crossOrigin="anonymous"` on image loads; warn before export if a
  specific image cannot be served CORS-clean (canvas would be tainted).
- Long verses: Arabic font auto-scales down if text overflows the canvas bounds.
- MediaRecorder unsupported: hide WebM button, keep PNG export.

## Testing and verification

- Vitest unit tests for: wrapping/RTL text layout, Ken Burns transform math,
  overlay color compositing, config serialization, overflow auto-shrink.
- Manual smoke checklist: API fetch, random verse, live preview, WebM + PNG
  export.
- Quality gates: `npm run lint`, `npm run typecheck`, `npm run build`.

## File layout (proposed)

```
src/
  types.ts                 # Verse, ReelConfig
  api/quran.ts             # alquran.cloud client + cache
  api/unsplash.ts          # image search/proxy helpers
  renderer/reelRenderer.ts # canvas render engine
  renderer/kenburns.ts     # motion math
  renderer/textLayout.ts   # wrapping / RTL layout
  components/              # UI panels + preview + export
  App.tsx
  main.tsx
```

## Out of scope (deferred)

- MP4 export via ffmpeg.wasm.
- Audio / background music.
- Multi-scene / multi-verse reels.
- User accounts and server persistence.
- Fast-mode (non-realtime) render.
