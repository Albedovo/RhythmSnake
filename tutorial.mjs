// Interactive tutorial: each lesson loops one short phrase until the player lands it enough times.
// A rest bar follows every attempt so feedback can be read before the next call.
import { grab, reach, squeeze, clap, flip, sweep } from './rhythm-chart.mjs?v=25';

export const TUTORIAL_BPM = 90;

// Each lesson teaches with an animated icon and one short cue, so the play field stays visible.
// `icon` picks the animation, `cue` is the camera line and `keyCue` the trackpad/keyboard line.
export const LESSONS = [
  { id: 'listen', title: 'Listen, then echo', icon: 'listen', demo: true, need: 1, phrase: [grab(0, 'L')],
    cue: 'Hear 1-2-3-4, then copy it', keyCue: 'Hear 1-2-3-4, then copy it' },
  { id: 'aim', title: 'Your cursor', icon: 'aim', need: 2, phrase: [reach(0, 'C')],
    cue: 'Your palm is the cursor', keyCue: 'Move the mouse into the ring' },
  { id: 'grab', title: 'GRAB', icon: 'grab', need: 3, phrase: [grab(0, 'L')],
    cue: 'Open, then fist in the circle', keyCue: 'In the circle, press Z' },
  { id: 'reach', title: 'REACH', icon: 'reach', need: 2, phrase: [reach(0, 'hiR')],
    cue: 'Touch the ring on the beat', keyCue: 'Move into the ring' },
  { id: 'clap', title: 'CLAP', icon: 'clap', need: 2, phrase: [clap(0)],
    cue: 'Hands apart, then clap', keyCue: 'Press Space on the beat' },
  { id: 'clap-repeat', title: 'CLAP ×2', icon: 'clap', need: 2, phrase: [clap(0), clap(2)],
    cue: 'Clap on 1 and 3', keyCue: 'Space on 1 and 3' },
  { id: 'squeeze', title: 'SQUEEZE', icon: 'squeeze', need: 2, phrase: [squeeze(0, 'L', 2)],
    cue: 'Fist on 1, open on 3', keyCue: 'Hold Z, let go on 3' },
  { id: 'flip', title: 'FLIP →', icon: 'flip', need: 3, phrase: [flip(0, 'R')],
    cue: 'Swipe right through the circle', keyCue: 'In the circle, press →' },
  { id: 'flip-left', title: 'FLIP ←', icon: 'flip-left', need: 2, phrase: [flip(0, 'L')],
    cue: 'Swipe left through the circle', keyCue: 'In the circle, press ←' },
  { id: 'sweep', title: 'SWEEP', icon: 'sweep', need: 2, phrase: [sweep(0, 'riseL', 2)],
    cue: 'Follow the dots, one per beat', keyCue: 'Move through each dot' },
  { id: 'sides', title: 'Two hands', icon: 'sides', need: 2, sides: true, cameraOnly: true, phrase: [grab(0, 'L'), grab(2, 'R')],
    cue: 'Left side = left hand' }
];

// Hints are a few words, shown next to an icon; the move's own cue covers the rest.
const HINTS = {
  early: 'Too early — wait for the beat',
  late: 'Too late — start a bit sooner',
  side: 'Use the other hand',
  position: 'Move into the circle first',
  release: 'Open on the OPEN beat',
  none: { grab: 'Open first, then fist', squeeze: 'Fist, hold, then open', reach: 'Move into the ring', clap: 'Hands apart, then clap', flip: 'Swipe through the circle', sweep: 'Follow the dots' }
};
const KEY_HINTS = { grab: 'Pointer in the circle, then Z', squeeze: 'Hold Z, let go on OPEN', clap: 'Space on the beat', flip: 'Pointer in the circle, then arrow', reach: 'Move into the ring', sweep: 'Move through each dot' };

export function hintFor(reason, type) {
  if (!reason) return null;
  return reason === 'none' ? HINTS.none[type] : HINTS[reason];
}

export class Tutorial {
  constructor({ camera }) {
    this.camera = camera;
    this.lessons = LESSONS.filter(l => camera || !l.cameraOnly);
    this.demonstrated = false; this.index = 0; this.passes = 0; this.fails = 0; this.finished = false;
  }
  get lesson() { return this.lessons[this.index]; }

  // Phrase source interface shared with songs.
  next() {
    const l = this.lesson;
    if (!l) return null;
    return { def: l.phrase, lesson: this.index, options: { sides: !!l.sides, demo: !!l.demo || !this.demonstrated, restBeats: 4 } };
  }

  // Called once per finished attempt. Returns what the UI should say.
  report(lessonIndex, ok, reason, type, demo = false) {
    if (lessonIndex !== this.index || this.finished) return null;
    if (demo && !this.lesson.demo) { this.demonstrated = true; return { kind: 'pass', text: 'Your turn next' }; }
    if (ok) {
      this.passes++; this.fails = 0;
      if (this.passes >= this.lesson.need) return this.advance();
      return { kind: 'pass', text: `Nice! ${this.passes} / ${this.lesson.need}` };
    }
    this.fails++;
    const text = (!this.camera && (reason === 'none' || reason === 'position') ? KEY_HINTS[type] : hintFor(reason, type)) || 'Try again';
    return { kind: 'fail', reason: reason || 'none', text, offerSkip: this.fails >= 3 };
  }
  advance() {
    this.demonstrated = false; this.index++; this.passes = 0; this.fails = 0;
    if (this.index >= this.lessons.length) { this.finished = true; return { kind: 'finish', text: 'Tutorial complete!' }; }
    return { kind: 'advance', text: `Next: ${this.lesson.title}` };
  }
}

const DONE_KEY = 'ftb.tutorialDone';
export const tutorialDone = () => { try { return localStorage.getItem(DONE_KEY) === '1'; } catch { return false; } };
export const markTutorialDone = () => { try { localStorage.setItem(DONE_KEY, '1'); } catch {} };
