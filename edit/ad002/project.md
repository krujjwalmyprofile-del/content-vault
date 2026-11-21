# Ad 002: layered creator edit

**Source:** `Ad_002.mp4`, 576×1024, 30 fps, 48.77 s, stereo 44.1 kHz. Female presenter, close-up, talking head. The first ~4.1 s are a silent reaction shot; speech starts at 4.1 s.
**Output:** `final.mp4`, 1080×1920, 30 fps, 48.77 s (full original timeline, nothing cut), H.264 + AAC 256k, `+faststart`.

## Transcript (local Whisper small, word-timed; spelling fixes applied in captions)
> I have priced my GTME cohort at the fractional price of all of the GTME cohorts out there. But why is that? One. It's for a limited time. Two. You get all of the tech stack that you need as a GTME. Three. You build a pipeline that is helpful for you, built for you and is in the industry that you want. 50+ hours of watch videos, 40+ playbooks, accountability sessions, two live expert sessions every week and so much more. Plus all of the tech stack in-house at your own account. That's everything that you get at Sandbox GTME. But apart from that, there are a lot more surprises. Apply right now to learn what we can offer you and how you can build your GTME career like tomorrow.

Fixes the recogniser needed: "gtme" → GTME, "text tank" → tech stack, "sandbox gtme" → Sandbox GTME.

## Layers
1. **Presenter:** the original footage, full screen and untouched (no regeneration or retouching). Digital punch-ins between ×1.00 and ×1.10, hard cuts on the spoken beats, scaled around a point just below the eyes.
2. **Info panel** (wall area above the head, y 236–540): card 1 "WHY THIS PRICE?" holds 1 Limited time (10.42), 2 Full GTME tech stack (11.96) and 3 Pipeline built for you (15.40). Card 2 "WHAT YOU GET" holds 4 50+ hrs of video (21.14), 5 40+ playbooks (23.88), 6 Accountability (25.14) and 7 2 live sessions/week (26.46). Items stay on screen once revealed, and the panel wipes out at 34.72.
3. **Demo window** (lower middle, below the captions). Four sessions:
   - price check: bars with no numbers, 4.3–9.15
   - limited time, tech-stack tiles, pipeline, 10.45–20.95
   - a wide "inside the cohort" window: 50+ hours, 40+ playbooks, accountability, 2 live sessions every week, stack in your own account, 21.14–34.4
   - "more surprises" in black-and-white glow, 38.02–40.95

   Every demo is a motion graphic built from the spoken words. The edit contains no stock footage, invented numbers or third-party logos.

## Typography
- Level 1 headlines (Inter Tight 900):
  - GTME COHORT / AT A FRACTION OF THE PRICE (hook, 0–9.2)
  - BUT WHY? (9.28)
  - THAT'S EVERYTHING (34.9)
  - SANDBOX GTME (36.18)
  - A LOT MORE SURPRISES (38–40.9)
  - APPLY RIGHT NOW (41.06)
  - BUILD YOUR GTME CAREER (45.06 to end)
- Level 2: word-synced sentence-case captions in Inter 800, 54 px, on a dark pill. Upcoming words show at 42% opacity and key words turn yellow (#FFD43B). Captions are hidden only during "BUT WHY?", because the headline already carries it.
- Level 3: small uppercase panel and window labels.

## Effects used (selectively)
- White flash: 9.28, 34.9, 41.06. Lighter flash cut: 21.14.
- Inverted frames, 5 frames at 37.72 ("But apart from that").
- Low-shutter trails, two short windows: 3.82–4.22 and 15.36–15.76.
- Lens-bump punch-ins: 9.28 and 30.28. This is a scale overshoot plus blur, a stand-in for real optical distortion.
- Mask reveals on panel items and labels.
- Object pops on numbers and keywords.
- Directional blur on window entrances and exits.
- B&W glow on the "surprises" insert.
- Match cut: the tech-stack tiles from 11.96 return inside "your account" at 31.24.
- Not used: rotoscope and silhouette (they would add nothing here) and detail shots (there is no product footage).

## Audio
- Original voice: high-pass at 80 Hz plus light compression. The voice is not edited or replaced.
- Music: an original bed synthesised in code (96 BPM, Am9–Fmaj7–Cmaj7–G6). No licence needed. It ducks under the voice by sidechain and breaks down under 37.7–41.
- SFX, also synthesised: impacts on the flashes, whooshes on window entrances, clicks on panel items. They sit about 12–15 dB under voice peaks.
- Master: two-pass loudnorm, -13.7 LUFS integrated, true peak -1.0 dBFS.

## Version 2: 44.7 s premium cut (`final-44s-premium.mp4`)
- **Cut:** the silent 4.0 s reaction intro is removed, so the video opens on her first word. That gives 1,342 frames, 44.73 s. All graphics, captions and sound stay synced: the code keeps source timestamps and applies `OFF = 4.0`.
- **Hook:** the headline reveals within the first frames while she says "I have priced my GTME cohort". There is a punch-in on "fractional price".
- **Finishing passes added (After Effects-style):**
  - per-character kinetic headlines: glyphs rise out of a mask and go from blur to sharp
  - a gold shine sweep across accent words
  - viewfinder brackets that close in on "BUT WHY?" and "APPLY RIGHT NOW"
  - letter-tracking drift and a yellow rule drawing in on the end card
  - edge-only lens distortion plus RGB split on the four section transitions, from a displacement map that is neutral over the face
  - warm light leaks on section changes, with the white flashes softened to suit them
  - film grain (8-frame cycle), a soft vignette, and a light contrast and saturation grade
  - glass shine sweeps on panel cards and demo scenes
  - a rotating gold edge light on the demo window
  - word-by-word rise animation in the captions
- **Audio:** music and SFX are re-synthesised for the new timeline. There is now a riser into "Apply" and swooshes ahead of the light leaks. The master is at -14.0 LUFS integrated with a -1.0 dBFS true peak.
- **Source:** `remotion-44s/` and `synth-44s.py`.

## Open items / to verify
- **Brand spelling:** check "Sandbox GTME" (heard as "sandbox gtme") and "GTME".
- **Offer details:** everything on screen comes from the narration (50+ hours, 40+ playbooks, 2 live sessions a week). Confirm before publishing.
- **Silent opening:** resolved in v2. The 44.7 s cut drops it, and v1 (`final.mp4`, 48.6 s) keeps it.
- **Bottom-UI overlap:** the demo window sits partly inside the bottom ~420 px that platform UI can cover. The close framing leaves no other place for it below the face.

## Rebuild
The Remotion source is in `remotion/` (`src/Ad002.tsx`, `src/captions.json`) and the audio synth is `synth.py`. Render with any Chromium:
`npx remotion render src/index.ts Ad002 out/video.mp4 --muted`
Then mux in the mastered audio.
