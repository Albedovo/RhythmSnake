# FEED THE BEAT

A camera-based call-and-response rhythm game you play with both hands. Listen to a rhythm after a 1-2-3-4 count-in, then repeat it with hand gestures in the next bar. Every note you hit feeds the Beat Mouth at the bottom of the screen.

The initial implementation with Codex did not turn out well, so I switched to Claude to continue refining it. All hail Claude!

UI/UX assignment — Week 6

## ▶ Play Now

**https://albedovo.github.io/RhythmSnake/**

- Use desktop Chrome or Safari, allow camera access, and wear headphones for the best experience.
- Video is processed locally in your browser. It is never recorded or uploaded.
- No camera? Under INPUT, select “Trackpad · mouse · touch + keys” to play with your mouse and keyboard.
- Start with **Guided tutorial** to learn each gesture step by step, with a demonstration before each lesson.

## How to Play

Each phrase has two bars: **CALL** (listen) and **ECHO** (repeat). The number on each note indicates its beat. Follow the spoken count to time your gestures. From FLOW difficulty onward, use your left hand for notes on the left side of the screen and your right hand for notes on the right.

| Gesture | Camera | Keyboard / Mouse |
|---|---|---|
| GRAB ● | Start with an open hand, then make a fist inside the outlined circle on the beat | Z or click |
| REACH ◎ | Move your hand into the circle on the beat | Move the pointer into the circle |
| SQUEEZE ■ | Make a fist inside the outlined circle, then open your hand on the OPEN beat | Hold Z, then release on the OPEN beat |
| CLAP ◆ | Clap both hands together anywhere in view | Space |
| FLIP ▲ | Swipe your open palm through the outlined circle in the arrow’s direction on the beat | Aim the pointer inside the circle, then press ← / → |
| SWEEP 〰 | Follow the path, passing through one point per beat | Move the pointer along the path |

The fixed circles show the actual hit areas for GRAB, REACH, SQUEEZE, and FLIP. SWEEP uses a separate outlined circle for each path point. CLAP works anywhere in camera view, including fast claps starting from opposite sides. For FLIP, the trajectory must cross the target on its numbered beat; you do not need to start inside.

In keyboard mode, X performs a GRAB with your “other hand” for sections where one hand must GRAB while the other holds a SQUEEZE.

REACH (touch) and SWEEP (slide) targets always award Perfect when touched within their active window; untouched targets still count as Miss. These gestures do not receive timing-based Good grades.

**Scoring:** Perfect 100 / Good 50 / Miss 0, multiplied by your GROOVE multiplier (10-note combo ×2, 25-note combo ×3, 50-note combo ×4). Grades: S ≥95%, A ≥88%, B ≥75%, C ≥60%. Clear a stage by finishing with energy remaining and at least 60% accuracy. The results screen suggests a latency calibration adjustment based on your average timing offset.

**Difficulty:** INTRO → FLOW → GROOVE → SYNC → BOUNCE → OVERDRIVE → POLYRHYTHM — seven levels in total.

## Run Locally

```bash
python3 -m http.server 8137
```

Then open http://localhost:8137. Camera access requires localhost or HTTPS.

- Add `?debug` to display each hand’s grip value, extension ratio, and bend angle for tuning fist-detection thresholds.
- Changes to `FTB.HAND` (fist-detection thresholds) in the console take effect immediately. Clap thresholds are defined in `CLAP` in `hand-input.mjs`.

## Files

| File | Description |
|---|---|
| `game.js` | Main loop, hit detection, input, and UI |
| `rhythm-chart.mjs` | Chart format, charts for all seven difficulty levels, and chart linting |
| `rhythm-core.mjs` | Gesture types, difficulty levels, timing windows, and hand features |
| `scoring.mjs` | Scoring, GROOVE, grades, and calibration suggestions |
| `tutorial.mjs` | Guided tutorial lessons |
| `audio.mjs` | Backing tracks, beat counts, and sound effects |
| `rhythm-renderer.mjs` | Canvas rendering |
| `hand-input.mjs` | Hand tracking and clap detection |
| `camera-controller.mjs`, `hand-worker*.js` | Camera management and MediaPipe inference |
| `DESIGN.md` | Design notes |

Hand tracking uses [MediaPipe Hands](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) (Apache 2.0). Its files are included in `vendor/`.

## Regression Checks

Run `node tests/gestures.mjs` to check clap recovery, Flip trajectory timing, circle boundaries, Touch/Slide scoring, tutorial demonstrations, and playfield spacing across screen sizes.
