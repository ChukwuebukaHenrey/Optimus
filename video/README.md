# Optimus demo video (Remotion)

The hackathon demo video. The brief, storyboard and approved facts are in
`docs/video/DEMO_VIDEO_BRIEF.md` (kept locally); this project implements it.

## Commands (run in `video/`)

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (once). |
| `npm run assets` | Copy fonts, pixel art and evidence stills from the repo into `public/`; list which recordings and audio stems are present. |
| `npm run derive` | Pre-render the R1 speed-ups and the freeze frames listed in `DERIVED` / `FREEZES` (system FFmpeg). Re-run after changing them. |
| `npm run audio` | Build the three stems in `public/audio/`: `music.wav` (the reference track edited on its bar grid, `MUSIC_EDIT`), `vo.wav` (the ElevenLabs take cut into blocks and placed per scene, `VO_TAKE`) and `sfx.wav` (three synthesised cues). Re-run after a re-cut. |
| `python scripts/vo-captions.py` | Align the take to the script and write `out/optimus-demo.srt` (one cue per sentence, two lines ≤ 42 characters). Run after `npm run audio`. |
| `npm run check` | Validate `src/config.ts` and print the timeline. |
| `npm run qa` | Render stills at the start, middle, peak and end of every scene into `out/qa/contact-sheet-*.png` (`npm run qa -- 4b 4c` for some scenes). |
| `npm run dev` | Open Remotion Studio (runs `assets` first). |
| `npm run still -- out/f.png --frame=330` | Render one frame to check it. |
| `npm run render` | Check the config, render `out/optimus-demo.raw.mp4`, master the audio to −14 LUFS / ≤ −1.5 dBTP (`npm run master`) into `out/optimus-demo.mp4`, then probe it. Close Chrome first: it needs the memory. |
| `npm run render:novo` | The same film without the voiceover (brief §2 deliverable): `out/optimus-demo-no-vo.mp4`. |
| `npm run probe` | Verify the rendered file with ffprobe: 1920×1080, 60 fps, H.264, ≤ 172 s, AAC. Add `-- <file> --no-audio` for the silent version. |

`probe` uses the system FFmpeg at `TOOLING.ffmpegDir` in the config (override with
`OPTIMUS_FFMPEG_DIR`). Remotion renders with its own bundled FFmpeg.

## Where things are

- **`src/config.ts`: the single config.** Canvas, the `FOOTAGE` switch (`live` | `archived`),
  approved `FACTS` with their sources, `SCENES` (durations in frames; start frames are derived),
  on-screen lines, the voiceover script, motion tokens, layout, pixel-art scales, colours, fonts,
  recordings, audio cues and levels. Changing a number or a scene length is a change in this file only.
- `src/validate.ts`: the rules `npm run check` enforces, also run when the Studio loads:
  total length ≤ 2:52, unique ids, each on-screen line readable ≥ 1.5 s, **every on-screen number
  traceable to a fact**, whole-number pixel-art scales, known recordings, voiceover and scene references.
- `src/OptimusDemo.tsx`: the master composition; `src/scenes/Scene*.tsx` build each scene from
  `SHOTS` in the config (which recording, trims, framing, punch-in target and glow rectangle, in
  source pixels). `src/components/kit.tsx` holds the shared pieces.
- `src/fonts.ts`: preloads the three brand fonts and stops the render if any is unavailable.
- `public/recordings/`: put the owner's clips here, named as in `RECORDINGS` (R1–R10).
  `public/audio/`: `vo.wav`, `music.wav`, `sfx.wav`. Both folders are gitignored.
