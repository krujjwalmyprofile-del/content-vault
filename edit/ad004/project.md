# Ad 004: split-screen process explainer

**Output:** `final-ad004-split.mp4`, 1080×1920, 30 fps, 45.4 s (1,362 frames). The master is at -14.0 LUFS integrated with a -1.0 dBFS true peak.
**Source:** `Ad_004.mp4`, 576×1024, 48.5 s. The cut keeps source 2.5 s to 47.9 s, which drops the silent start and the dead tail.

## Transcript (local Whisper small)
> I have gone through every Clay video out there and still I am unable to build a video that generates results. This is the complaint of every lead gen agency owner I have met. I mean I can understand. You build a Clay table but you don't know which integrations or features to use and the table is unused. You don't know which credits to utilize and how to utilize them so that you build a pipeline. This is where you need a mentor to help you out. Join my cohort so that a mentor helps with you to build you through the complete workflow, integrate the right tech stack and help you at each and every step. Apply for Sandbox GTM now.

## Design
- **Palette, muted only:**
  - warm stone backdrop: #E3DCD1 to #C7BDAE
  - charcoal panel: #1C1D20
  - cards: #25272B
  - text: #EEE9E1
  - one dusty-clay accent: #C49A7C

  There are no bright colours and no hard white flashes.
- **New background:** the presenter is matted with Robust Video Matting (`matte_rvm.py`, alpha WebM). She is composited onto a soft studio backdrop with:
  - an out-of-focus arch and panel lines
  - a key light behind her head
  - drifting bokeh
  - a parallax depth effect (the backdrop zooms less than she does)
  - a soft drop shadow

  Her appearance, voice and performance are unchanged.
- **Split screen:** presenter at 0–1110 px, process explainer below. Captions sit on the split, and words light up in the accent colour as they are spoken.
- **Process panel, following the narration:**
  1. **Where it starts** (2.5–9.3 s): every Clay video watched; results flat.
  2. **The common complaint** (9.4–16.6 s): her complaint as a quote card, attributed to every lead gen agency owner.
  3. **The problem** (16.7–31.2 s): the workflow builds step by step as 01 Clay table (UNUSED), 02 Integrations (WHICH ONES?), 03 Credits (HOW TO USE?) and 04 Pipeline (NOT BUILT), joined by dashed connectors.
  4. **The fix** (31.3–44.9 s): a mentor joins. The connectors turn solid, each step switches to its solved state (IN USE, RIGHT STACK, USED WELL, BUILT), and a check pops on each word of "each and every step". A progress bar runs 0/4 to 4/4.
  5. **Next step** (45–47.9 s): "Sandbox GTM · Apply now", her own spoken CTA.

## Premium effects
- Letter-by-letter animated text on the panel headlines: the quote, "Still flat.", the mentor line and the "Sandbox GTM" wordmark.
- Edge-only lens distortion plus a subtle RGB split on the presenter at the four section changes. The face stays undistorted.
- Muted peach light leaks on section changes.
- A soft mask wipe as each panel scene comes in.
- The background slowly goes out of focus on "This is where you need a mentor".
- A gentle push-in and handheld micro-float on the presenter.
- Glass shine sweeps on cards as they appear and when they are solved, plus a travelling clay edge light on the step being solved.
- Glowing light pulses along the solved connectors and a shimmer on the progress bar.
- The split line draws in from the centre at the start.
- Light film grain and a vignette.

## Audio
- Her voice is untouched except for a high-pass and light compression.
- Music: an original soft bed synthesised in code (84 BPM, Dm9–Bbmaj9–Gm9–Am7), ducked under her voice. It breaks down under the mentor line and swells softly into "Apply".
- SFX: soft whooshes on section changes, quiet ticks for steps and checks, a sub swell on the mentor line and a riser into the CTA.

## To verify
- **Brand spelling:** "Sandbox GTM" here vs. "Sandbox GTME" in Ad 002.
- **Unclear word:** Whisper heard "build a **video** that generates results" twice, so the captions show it as heard. If she meant "table" or "workflow", the caption needs a fix.
- **Problem tags:** "UNUSED", "WHICH ONES?", "HOW TO USE?" and "NOT BUILT" paraphrase her lines.
- **Fixed-state tags:** "IN USE", "RIGHT STACK", "USED WELL" and "BUILT" mirror those problems. Only "right tech stack" is said word for word.

---
# Version 2 (`final-ad004-v2.mp4`): no split screen, tight cut and floating 3D elements
**Output:** 1080×1920, 30 fps, 35.6 s. The master is at -14.0 LUFS integrated with a -0.9 dBFS true peak.

## Cut
- 15 segments taken from the audio (`segments.json`): 45.4 s cut down to 35.6 s.
- Segment edges were checked against the waveform, and they all fall in silence.
- The pauses between phrases are tightened.
- The filler "I mean I can understand" is removed.
- Each cut alternates the punch-in level (×1.00 / ×1.10 / ×1.12 and so on), with a 4-frame push and blur on the cut itself.

## Look
- **Presenter:** full frame, matted, on the stone backdrop. The backdrop has parallax and bokeh, and goes out of focus on "you need a mentor".
- **3D elements, two depth layers:**
  - back cards sit behind her, so her hair overlaps them
  - front cards sit in the lower third
  - they enter with perspective, float on idle, follow the camera punch-ins, and fly out with blur
  - each card gets a glass shine as it enters
- **Beats:**
  1. Video thumbnails orbit her and get checked off; then a "Results: Still flat." card.
  2. Floating avatar heads (generic, not real people) for "every lead gen agency owner", with a quote card.
  3. Clay table card, then floating integration chips marked "?" and a "WHICH FEATURES?" pill; "UNUSED" stamps onto the table.
  4. Credits card and a "HOW TO USE?" pill; a broken pipeline card.
  5. Big "YOU NEED A MENTOR" headline above her head, with the backdrop out of focus, plus a mentor card.
  6. "THE COHORT" pill; four workflow step cards fan in; integration chips fly in and snap into "Integrations"; checks land on each word of "each and every step".
  7. "Sandbox GTM · Apply now" card with a travelling edge light; avatar heads return.
- **Finishing:**
  - muted light leaks on beats
  - edge lens and RGB split on 3 key transitions
  - captions in a charcoal pill, with the clay accent on highlighted words
  - vignette and film grain

## Audio
- Her voice comes from the same 15 cuts, with 12 ms crossfades.
- New synthesised bed (92 BPM), ducked under her voice.
- SFX:
  - whooshes on beats and cuts
  - soft ticks on card entrances and checks
  - a sub swell under the mentor line
  - a riser into the CTA
