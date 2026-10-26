// Interactive tutorial: each lesson loops one short phrase until the player lands it enough times.
// A rest bar follows every attempt so feedback can be read before the next call.
import { grab, reach, squeeze, clap, flip, sweep } from './rhythm-chart.mjs?v=23';

export const TUTORIAL_BPM = 90;

export const LESSONS = [
  { id: 'listen', title: 'Listen, then echo', demo: true, need: 1, phrase: [grab(0, 'L')],
    text: 'Watch this first example. The large number inside each note tells you which beat to play.',
    steps: ['LISTEN: count 1–2–3–4 with the voice. Do not play yet.', 'YOUR TURN: repeat the move on the numbered beat.', 'The note fills up as its beat approaches. A rest bar follows each attempt.'] },
  { id: 'aim', title: 'Find your cursor', need: 2, aim: true, phrase: [reach(0, 'C')],
    text: 'Your palm cursor is your point of contact. Only the area inside a note’s outline counts.',
    steps: ['Raise one open hand and watch its cursor follow you.', 'During YOUR TURN, move the cursor inside the orange ring.', 'Touching the active ring gives Perfect. Missing it repeats the lesson.'],
    keys: ['Move the mouse or drag on the canvas to move the white cursor.', 'During YOUR TURN, move the cursor into the orange ring.', 'No click is needed for Touch or Slide.'] },
  { id: 'grab', title: 'GRAB · close inside the circle', need: 3, phrase: [grab(0, 'L')],
    text: 'Open first, then make a fist inside the turquoise circle on beat 1.',
    steps: ['During LISTEN, spread your fingers to prepare the next grab.', 'Move your palm cursor inside the circle before beat 1.', 'Close your fist on beat 1. Open again before the next attempt.'],
    keys: ['Move the pointer inside the turquoise circle.', 'On beat 1, press Z or click.', 'Release before trying again. Pressing outside the circle does not count.'],
    gesture: { title: 'GRAB · open, then fist', text: 'Open your hand, then make a fist on beat 1. Anywhere in view, either hand.',
      steps: ['During LISTEN, spread your fingers.', 'Close your fist on beat 1. Where your hand is does not matter.', 'Open again before the next attempt.'],
      keys: ['On beat 1, press Z or click anywhere.', 'Release before trying again.', 'Where the pointer is does not matter.'] } },
  { id: 'reach', title: 'TOUCH / REACH · contact is Perfect', need: 2, aim: true, phrase: [reach(0, 'hiR')],
    text: 'Touch the orange ring while it is active. This move has no Good timing grade.',
    steps: ['Follow your palm cursor to the ring.', 'Move inside around its numbered beat; you can already be inside.', 'Any valid contact is Perfect. An untouched ring is Miss.'],
    keys: ['Move the pointer toward the orange ring.', 'Touch inside while the target is active. No click is needed.', 'Any valid contact is Perfect, including waiting inside.'] },
  { id: 'clap', title: 'CLAP · start wide, meet on the beat', need: 2, phrase: [clap(0)],
    text: 'Clap anywhere in the camera view. You do not need to aim at the pink note.',
    steps: ['Keep both hands visible and separate them during LISTEN.', 'Bring them together quickly on beat 1, even from opposite sides.', 'Separate again to prepare the next clap. Keep the movement in camera view.'],
    keys: ['The pink diamond means Clap.', 'Press Space on beat 1. Pointer position does not matter.', 'Release Space before the next attempt.'] },
  { id: 'clap-repeat', title: 'CLAP · two claps', need: 2, phrase: [clap(0), clap(2)],
    text: 'Now clap on beats 1 and 3 of YOUR TURN.',
    steps: ['Listen for both clap sounds in the call.', 'Clap on 1, separate on 2, clap again on 3.', 'Opening the gap between your hands re-arms the clap detector.'],
    keys: ['Listen for both clap sounds in the call.', 'Press Space on 1, release, then press again on 3.', 'Use the numbers inside the diamonds to follow the sequence.'] },
  { id: 'squeeze', title: 'SQUEEZE · hold, then open', need: 2, phrase: [squeeze(0, 'L', 2)],
    text: 'The square has two actions: close on beat 1, open on beat 3.',
    steps: ['Open your hand and move the cursor inside the yellow circle.', 'Make a fist on beat 1; keep it closed while the hold bar drains.', 'Open on the beat marked OPEN. Once holding, you can move your hand.'],
    keys: ['Move the pointer inside the yellow circle.', 'Press and hold Z on beat 1. Watch the draining hold bar.', 'Release Z on beat 3, shown by the OPEN badge.'],
    gesture: { text: 'The square has two actions: close on beat 1, open on beat 3. Anywhere in view.',
      steps: ['Open your hand during LISTEN.', 'Make a fist on beat 1 and keep it closed while the hold bar drains.', 'Open on the beat marked OPEN.'],
      keys: ['Press and hold Z on beat 1. Watch the draining hold bar.', 'Release Z on beat 3, shown by the OPEN badge.', 'Where the pointer is does not matter.'] } },
  { id: 'flip', title: 'FLIP → · swipe through the circle', need: 3, phrase: [flip(0, 'R')],
    text: 'Move through the purple circle in the arrow’s direction on beat 1.',
    steps: ['Start anywhere to the left of the target; no need to park inside.', 'With an open palm, swipe right through the outlined circle.', 'Time the crossing for beat 1. A stationary palm or a remote swipe does not count.'],
    keys: ['Move the pointer inside the purple circle.', 'Press → on beat 1, matching the arrow.', 'Keep the pointer inside the circle when pressing the key.'],
    gesture: { title: 'FLIP → · swipe right', text: 'Swipe an open palm to the right on beat 1, anywhere in view.',
      steps: ['Hold an open hand up during LISTEN.', 'Swipe it quickly to the right on beat 1.', 'Follow the arrow; the hand you use does not matter.'],
      keys: ['Press → on beat 1, matching the arrow.', 'Where the pointer is does not matter.', 'Release before the next attempt.'] } },
  { id: 'flip-left', title: 'FLIP ← · reverse direction', need: 2, phrase: [flip(0, 'L')],
    text: 'Try the same motion in the other direction.',
    steps: ['Start to the right of the purple circle.', 'Swipe left through the circle with your palm open.', 'Cross on beat 1. Follow the arrow, not the hand you used.'],
    keys: ['Move the pointer inside the purple circle.', 'Press ← on beat 1.', 'The direction must match the arrow inside the target.'],
    gesture: { title: 'FLIP ← · swipe left', text: 'Now swipe to the left on beat 1.',
      steps: ['Hold an open hand up during LISTEN.', 'Swipe it quickly to the left on beat 1.', 'Follow the arrow, not the hand you used.'],
      keys: ['Press ← on beat 1.', 'The direction must match the arrow.', 'Where the pointer is does not matter.'] } },
  { id: 'sweep', title: 'SLIDE / SWEEP · follow the circles', need: 2, aim: true, phrase: [sweep(0, 'riseL', 2)],
    text: 'Trace the orange path. Each numbered circle is its own target.',
    steps: ['Find circle 1 at the start of the path.', 'Move your cursor through circles 1, 2 and 3 as their beats arrive.', 'Each touched circle gives Perfect; untouched circles are Miss. No fist is needed.'],
    keys: ['Move the pointer to the first numbered circle.', 'Follow the path through circles 1, 2 and 3. No click is needed.', 'Stay inside each visible circle to earn Perfect.'] },
  { id: 'sides', title: 'Two hands · left and right', need: 2, sides: true, cameraOnly: true, phrase: [grab(0, 'L'), grab(2, 'R')],
    text: 'From FLOW onward, use the hand on the same side as the note.',
    steps: ['Keep both palm cursors visible and open your hands.', 'Close your left hand inside the left circle on beat 1.', 'Close your right hand inside the right circle on beat 3.'],
    gesture: { title: 'Two moves · keep the beat', text: 'Two grabs in one bar. Use one hand or both, whatever feels natural.',
      steps: ['Keep your hands open during LISTEN.', 'Make a fist on beat 1, then open.', 'Make a fist again on beat 3.'] } }
];

// Gesture style never judges position, so its hints only talk about the move and the beat.
const GESTURE_HINTS = {
  grab: 'Open your fingers first, then make a fist on the numbered beat.',
  squeeze: 'Open first, close on the beat, and hold until the OPEN beat.',
  clap: 'Keep both hands in view, apart, then bring them together.',
  flip: 'Swipe an open palm quickly in the arrow’s direction on its beat.'
};

const HINTS = {
  early: 'A bit early. Act on the beat after the count, not on "4".',
  late: 'A bit late. Start the move just before the beat — the camera needs a moment to see it.',
  side: 'Wrong hand. Use the hand on that side of the screen.',
  position: 'Move your cursor inside the outlined circle before acting. Flip must cross it in the arrow’s direction.',
  release: 'Open your hand right on the last beat of the squeeze.',
  none: {
    grab: 'Open your fingers first, move inside the circle, then make a fist on its numbered beat.',
    squeeze: 'Open first, then close inside the square’s circle. Hold until the OPEN beat.',
    reach: 'Move your palm into the ring on the beat.',
    clap: 'Keep both hands in view, apart, then bring them together.',
    flip: 'Swipe an open palm through the purple circle in the arrow’s direction on its beat.',
    sweep: 'Start on the first dot and keep your palm near the moving light.'
  }
};

export function hintFor(reason, type, gesture = false) {
  if (!reason) return null;
  if (gesture && reason === 'none') return GESTURE_HINTS[type];
  return reason === 'none' ? HINTS.none[type] : HINTS[reason];
}

export class Tutorial {
  constructor({ camera, gesture = false }) {
    this.camera = camera; this.gesture = gesture;
    // Gesture style skips the aiming lessons and swaps in copy that never mentions circles.
    this.lessons = LESSONS.filter(l => (camera || !l.cameraOnly) && !(gesture && l.aim)).map(l => gesture && l.gesture ? { ...l, ...l.gesture } : l);
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
    if (demo && !this.lesson.demo) { this.demonstrated = true; return { kind: 'pass', text: 'Now you try. Listen once more, then play in YOUR TURN.' }; }
    if (ok) {
      this.passes++; this.fails = 0;
      if (this.passes >= this.lesson.need) return this.advance();
      return { kind: 'pass', text: `Nice! ${this.passes} / ${this.lesson.need}` };
    }
    this.fails++;
    const keys = this.gesture ? { grab: 'Press Z or click on its beat. Where the pointer is does not matter.', squeeze: 'Hold Z on the first beat, then release on OPEN.', clap: 'Press Space on the numbered beat.', flip: 'Press the matching arrow key on its beat.' } : { grab: 'Aim inside the circle, then press Z or click on its beat.', squeeze: 'Aim inside the circle, hold Z on the first beat, then release on OPEN.', clap: 'Press Space on the numbered beat.', flip: 'Aim inside the purple circle, then press the matching arrow key on its beat.', reach: 'Move your pointer inside the orange ring while it is active.', sweep: 'Move your pointer through each numbered circle as it becomes active.' };
    return { kind: 'fail', text: (!this.camera && (reason === 'none' || reason === 'position') ? keys[type] : hintFor(reason, type, this.gesture)) || 'Try again on the next echo.', offerSkip: this.fails >= 3 };
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
