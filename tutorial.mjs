// Interactive tutorial: each lesson loops one short phrase until the player lands it enough times.
// A rest bar follows every attempt so feedback can be read before the next call.
import { grab, reach, squeeze, clap, flip, sweep } from './rhythm-chart.mjs?v=18';

export const TUTORIAL_BPM = 90;

export const LESSONS = [
  { id: 'listen', title: 'Listen, then echo', demo: true, need: 1, phrase: [grab(0, 'L')],
    text: 'Every phrase has two bars. In the CALL bar the game counts 1-2-3-4 and plays the rhythm. In the ECHO bar you copy it. Watch once.' },
  { id: 'grab', title: 'GRAB', need: 3, phrase: [grab(0, 'L')],
    text: 'Open your hand wide during the call. On the first beat of the echo bar, snap it into a fist.' },
  { id: 'reach', title: 'REACH', need: 3, phrase: [reach(0, 'hiR')],
    text: 'Keep your hand outside the ring, then move into it ON the beat. Waiting inside early only scores Good.' },
  { id: 'clap', title: 'CLAP', need: 2, phrase: [clap(0), clap(2)],
    text: 'Hands apart, then clap on beats 1 and 3. Anywhere in view counts.' },
  { id: 'squeeze', title: 'SQUEEZE', need: 2, phrase: [squeeze(0, 'L', 2)],
    text: 'Fist on beat 1, keep it closed while the bar drains, open your hand on beat 3. The release is scored too.' },
  { id: 'flip', title: 'FLIP', need: 3, phrase: [flip(0, 'R')],
    text: 'Open palm. On the beat, swipe sideways the way the arrow points.' },
  { id: 'sweep', title: 'SWEEP', need: 2, phrase: [sweep(0, 'riseL', 2)],
    text: 'Put your hand on the first dot, then glide along the path, passing each dot on its beat.' },
  { id: 'sides', title: 'Two hands', need: 2, sides: true, cameraOnly: true, phrase: [grab(0, 'L'), grab(2, 'R')],
    text: 'From level FLOW up, moves on the left side need your left hand and moves on the right need your right.' }
];

const HINTS = {
  early: 'A bit early. Act on the beat after the count, not on "4".',
  late: 'A bit late. Start the move just before the beat — the camera needs a moment to see it.',
  side: 'Wrong hand. Use the hand on that side of the screen.',
  parked: 'Your hand was already waiting in the ring. Start outside and move in on the beat.',
  release: 'Open your hand right on the last beat of the squeeze.',
  none: {
    grab: 'No fist seen. Spread all fingers first, then close them tightly.',
    squeeze: 'No fist seen. Spread all fingers first, then close them tightly.',
    reach: 'Move your palm into the ring on the beat.',
    clap: 'Keep both hands in view, apart, then bring them together.',
    flip: 'Keep the palm open and swipe further, about a hand width.',
    sweep: 'Start on the first dot and keep your palm near the moving light.'
  }
};

export function hintFor(reason, type) {
  if (!reason) return null;
  return reason === 'none' ? HINTS.none[type] : HINTS[reason];
}

export class Tutorial {
  constructor({ camera }) {
    this.lessons = LESSONS.filter(l => camera || !l.cameraOnly);
    this.index = 0; this.passes = 0; this.fails = 0; this.finished = false;
  }
  get lesson() { return this.lessons[this.index]; }

  // Phrase source interface shared with songs.
  next() {
    const l = this.lesson;
    if (!l) return null;
    return { def: l.phrase, lesson: this.index, options: { sides: !!l.sides, demo: !!l.demo, restBeats: 4 } };
  }

  // Called once per finished attempt. Returns what the UI should say.
  report(lessonIndex, ok, reason, type) {
    if (lessonIndex !== this.index || this.finished) return null;
    if (ok) {
      this.passes++; this.fails = 0;
      if (this.passes >= this.lesson.need) return this.advance();
      return { kind: 'pass', text: `Nice! ${this.passes} / ${this.lesson.need}` };
    }
    this.fails++;
    return { kind: 'fail', text: hintFor(reason, type) || 'Try again on the next echo.', offerSkip: this.fails >= 3 };
  }
  advance() {
    this.index++; this.passes = 0; this.fails = 0;
    if (this.index >= this.lessons.length) { this.finished = true; return { kind: 'finish', text: 'Tutorial complete!' }; }
    return { kind: 'advance', text: `Next: ${this.lesson.title}` };
  }
}

const DONE_KEY = 'ftb.tutorialDone';
export const tutorialDone = () => { try { return localStorage.getItem(DONE_KEY) === '1'; } catch { return false; } };
export const markTutorialDone = () => { try { localStorage.setItem(DONE_KEY, '1'); } catch {} };
