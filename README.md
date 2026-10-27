# FEED THE BEAT

A camera-based call-and-response rhythm game you play with both hands. Listen to a rhythm after a 1-2-3-4 count-in, then repeat it with hand gestures in the next bar. Every note you hit feeds the Beat Mouth at the bottom of the screen.

The initial implementation with Codex did not turn out well, so I switched to Claude to continue refining it. All hail Claude!

UI/UX assignment — Week 6

[Portfolio case study](https://portfolio.xiwenyan.top/feed-the-beat.html)

## ▶ Play Now

**https://albedovo.github.io/RhythmSnake/**

- Use desktop Chrome or Safari, allow camera access, and wear headphones for the best experience.
- Video is processed locally in your browser. It is never recorded or uploaded.
- No camera? Under INPUT, select “Trackpad · mouse · touch + keys” to play with your mouse and keyboard.
- Start with **Guided tutorial** to learn each gesture step by step, with a demonstration before each lesson.

## How to Play

Each phrase has two bars: **CALL** (listen) and **ECHO** (repeat). The number on each note indicates its beat. Follow the spoken count to time your gestures. From NORMAL difficulty onward, use your left hand for notes on the left side of the screen and your right hand for notes on the right.

| Gesture | Camera | Keyboard / Mouse |
|---|---|---|
| GRAB ● | Start with an open hand, then make a fist inside the outlined circle on the beat | Z or click |
| REACH ◎ | Move your hand into the circle on the beat | Move the pointer into the circle |
| SQUEEZE ■ | Make a fist inside the outlined circle, then open your hand on the OPEN beat | Hold Z, then release on the OPEN beat |
| CLAP ◆ | Clap both hands together anywhere in view | Space |
| FLIP ▲ | Swipe your open palm through the outlined circle in the arrow’s direction on the beat | Aim the pointer inside the circle, then press ← / → |
| SWEEP 〰 | Follow the path, passing through one point per beat | Move the pointer along the path |

The fixed circles show the actual hit areas for GRAB, REACH, SQUEEZE, and FLIP. SWEEP uses a separate outlined circle for each path point. CLAP works anywhere in camera view, including fast claps starting from opposite sides. For FLIP, the trajectory must cross the target on its numbered beat; you do not need to start inside.

**Hit effects:** every hit sets off a full-screen pulse — a shockwave, rays and confetti in the move colours. It grows with your GROOVE multiplier, adds glowing edges from ×3 and a flash at ×4, and each new multiplier gets a banner. Turn it off under Settings → Color motion.

In keyboard mode, X performs a GRAB with your “other hand” for sections where one hand must GRAB while the other holds a SQUEEZE.

REACH (touch) and SWEEP (slide) targets always award Perfect when touched within their active window; untouched targets still count as Miss. These gestures do not receive timing-based Good grades.

**Scoring:** Perfect 100 / Good 50 / Miss 0, multiplied by your GROOVE multiplier (10-note combo ×2, 25-note combo ×3, 50-note combo ×4). Grades: S ≥95%, A ≥88%, B ≥75%, C ≥60%. Every run plays to the end and is settled on its final score; a clear needs at least 60% accuracy. The results screen suggests a latency calibration adjustment based on your average timing offset.

**Tracks:** three songs, each with its own groove and four charts — SNACK ATTACK (100 BPM, Lv 1/4/7/10), GROOVE KITCHEN (116 BPM, Lv 2/5/8/11) and SUGAR RUSH (128 BPM, Lv 3/6/9/12). EASY lets either hand play anything; from NORMAL up each side belongs to its hand; off-beats (notes on the “&” between counts) and long sweeps only appear in HARD and EXPERT. The tutorial's last lesson teaches off-beats and is marked HARD+ ONLY.

## Design Case Study

[Read the full case study on my portfolio](https://portfolio.xiwenyan.top/feed-the-beat.html), including gameplay video, interactive rhythm and latency demos, development prompts, and player feedback.

![Current start screen with the paper-and-ink visual style and track selection](https://portfolio.xiwenyan.top/assets/beat/launch.jpg)

**Designer:** Xiwen (Echo) Yan  
**Role:** Solo designer and developer, using AI coding agents for implementation  
**Timeline:** October 2026, two weeks and more than 20 versions  
**Playtesting:** 15 players, through chats and in-person sessions  
**Tools:** MediaPipe Hands, Web Audio, Codex, and Claude

### Between the Phone and the Arcade

I wanted the convenience of playing at home with the larger movements I enjoy in arcade rhythm games. Feed the Beat uses a laptop webcam to turn hand movement into rhythm input, without a dedicated controller or console.

The project began as a class assignment to redesign Snake for hands and bodies. I designed the rules, game feel, charts, and tutorial. AI coding agents implemented my prompts, which I wrote in Chinese. I removed the snake when it no longer added to the gameplay, keeping the idea of feeding the beat.

### Designing Around Camera Delay

Camera recognition arrives after the physical action. The design separates musical timing from detection feedback:

- **Sound on the beat:** note sounds follow the music clock. A detected hit adds a soft confirmation tick, so detection delay does not make every musical hit sound late.
- **Compensation per gesture:** the game subtracts a gesture-specific delay before judging and uses wider timing windows for camera input.
- **Visible calibration:** the results screen measures timing offsets and offers a calibration adjustment.

![Camera-run results showing accuracy and a suggested latency calibration](https://portfolio.xiwenyan.top/assets/beat/my-run-result.jpg)

### From Prototype to Playable Rules

The early Codex prototype could recognise the basic actions, but its feedback and rules did not always agree: an early Touch could receive Perfect without movement, Hold did not judge the promised release, and difficulty levels reused the same chart.

After switching to Claude, I specified call-and-response phrases, sound scheduled on the beat, and clearer gesture feedback. Playtesting then led to fixed hit circles, a Flip judged when its trajectory crosses the target on the beat, clap-detection fixes, and tutorial layouts that leave the notes visible.

The later round introduced a paper-and-ink visual style, three tracks with four charts each, and a compact tutorial with animated icons. I used a debug overlay, chart linting, a fake-camera test harness, and regression checks to verify changes alongside my own camera playtests.

### What 15 Players Changed

Most testers were students new to rhythm games, with one experienced rhythm-game player giving detailed judging feedback.

| Feedback | Design response |
|---|---|
| Tutorial guidance was weak, text was small, and the palm dot suggested exact alignment | Rebuilt the tutorial as one line with an animated icon; a hand-outline guide remains a next step |
| Performing a gesture and placing the hand correctly at the same time was too difficult | EASY accepts either hand and keeps actions on the beat |
| Long sweeps were difficult to follow accurately | Reserved long sweeps for HARD and EXPERT |
| Calibration made the game feel much better | Kept timing feedback and a one-click calibration adjustment in the results |

My own rhythm-game experience hid part of the difficulty. For newcomers, the challenge was often doing the right gesture **and** putting the hand in the right place at once.

![Compact tutorial with an animated action icon above a Grab note](https://portfolio.xiwenyan.top/assets/beat/tutorial.jpg)

### A Gesture-Only Mode I Cut

One tester suggested judging only the gesture and timing. I built a prototype, but converted charts became mostly Grabs, and their left/right positions no longer served a clear purpose. Making the mode work needed its own charts and layout, effectively another game to design and balance.

I cut that mode. Its full-screen pulse survived as the hit shockwave and confetti that grow with the GROOVE multiplier.

![GROOVE multiplier banner with confetti and a hit shockwave](https://portfolio.xiwenyan.top/assets/beat/groove-banner.jpg)

### Levels That Climb

The current game has three tracks and twelve charts in total. Charts develop through an introduction, a motif and its mirror, a chorus, and a busier finale.

| Tier | Levels | Main challenge |
|---|---|---|
| EASY | 1–3 | Either hand, on-beat actions |
| NORMAL | 4–6 | Left and right hand assignments |
| HARD | 7–9 | Off-beats and long sweeps |
| EXPERT | 10–12 | Repeated echoes and independent two-hand rhythms |

Every run continues to the end and receives a final rank, without an energy bar or a separate practice mode.

### What’s Next

- Judge claps through the hands moving together.
- Explore REACH-led charts, with GRAB on strong beats.
- Add a hand-outline guide to the tutorial.
- Run another playtest round with more rhythm-game fans.

The main lessons: design around latency, keep displayed rules consistent with judgement, and test with people whose movements and experience differ from mine.

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
| `rhythm-chart.mjs` | Chart format, the three tracks and their difficulty tiers, and chart linting |
| `rhythm-core.mjs` | Gesture types, timing windows, and hand features |
| `scoring.mjs` | Scoring, GROOVE, grades, and calibration suggestions |
| `lesson-icons.mjs` | Animated icons for the tutorial bar |
| `tutorial.mjs` | Guided tutorial lessons |
| `audio.mjs` | Backing tracks, beat counts, and sound effects |
| `rhythm-renderer.mjs` | Canvas rendering |
| `hand-input.mjs` | Hand tracking and clap detection |
| `camera-controller.mjs`, `hand-worker*.js` | Camera management and MediaPipe inference |
| `DESIGN.md` | Design notes |

Hand tracking uses [MediaPipe Hands](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) (Apache 2.0). Its files are included in `vendor/`.

## Regression Checks

Run `node tests/gestures.mjs` to check clap recovery, Flip trajectory timing, circle boundaries, Touch/Slide scoring, tutorial demonstrations, and playfield spacing across screen sizes.
