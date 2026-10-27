// Web Audio: synthesized groove, count-in voice, call sounds and hit sounds.
let ctx, master, noiseBuffer, counts = [], countLoad;
const voices = new Set();

export const audioTime = () => ctx?.currentTime ?? 0;
export const audioContext = () => ctx;

export async function initAudio(enabled = true) {
  ctx ??= new AudioContext({ latencyHint: 'interactive' });
  if (!master) {
    master = ctx.createGain(); master.gain.value = enabled ? .45 : 0; master.connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * .25, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  await ctx.resume();
  countLoad ??= Promise.all([1, 2, 3, 4].map(async n => {
    const response = await fetch(`./assets/audio/en-${n}.wav`);
    if (!response.ok) throw Error('cue unavailable');
    return ctx.decodeAudioData(await response.arrayBuffer());
  })).then(b => { counts = b; }).catch(() => { counts = []; });
  await countLoad;
}

export function setVolume(on) { if (master) master.gain.setTargetAtTime(on ? .45 : 0, ctx.currentTime, .03); }

function track(node, gain, end) { node.connect(gain).connect(master); voices.add(node); node.onended = () => voices.delete(node); node.stop(end); }
export function synth(freq, time, duration = .14, volume = .12, type = 'sine', endFreq) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, time);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, time + duration);
  g.gain.setValueAtTime(.001, time); g.gain.linearRampToValueAtTime(volume, time + .005); g.gain.exponentialRampToValueAtTime(.001, time + duration);
  o.start(time); track(o, g, time + duration);
}
export function noise(time, duration, volume, frequency) {
  const n = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), g = ctx.createGain();
  n.buffer = noiseBuffer; filter.type = 'highpass'; filter.frequency.value = frequency;
  n.connect(filter); filter.connect(g).connect(master);
  g.gain.setValueAtTime(volume, time); g.gain.exponentialRampToValueAtTime(.001, time + duration);
  voices.add(n); n.onended = () => voices.delete(n); n.start(time); n.stop(time + duration);
}
export function silence() { for (const v of voices) { try { v.stop(); } catch {} } voices.clear(); }

// Each track's groove: a chord root per phrase plus kick, snare, hat and bass patterns over eight eighths.
const GROOVES = {
  // Bouncy: kick on 1 and 3, snare on 2 and 4, a fifth answering the snare.
  bounce: { roots: [130.81, 146.83, 174.61, 155.56], kick: [0, 4], snare: [2, 6], bass: [0, 4], fifth: [2, 6], hat: 'eighths' },
  // Funk: syncopated kick, ghosted off-beat hats, bass that lands on the "and".
  funk: { roots: [110, 123.47, 98, 130.81], kick: [0, 3, 5], snare: [2, 6], bass: [0, 3, 7], fifth: [5], hat: 'offbeats' },
  // Drive: four on the floor, open hats on the off-beats, pumping octave bass.
  drive: { roots: [146.83, 174.61, 130.81, 164.81], kick: [0, 2, 4, 6], snare: [2, 6], bass: [1, 3, 5, 7], fifth: [], hat: 'open' }
};
// One eighth-note step of the backing groove. `step` counts eighths from song start.
export function grooveStep(at, step, phrase, style = 'bounce') {
  const g = GROOVES[style] || GROOVES.bounce, inBar = step % 8, root = g.roots[phrase % g.roots.length], off = inBar % 2 === 1;
  if (g.hat === 'eighths') noise(at, .025, off ? .01 : .018, 6500);
  else if (g.hat === 'offbeats') noise(at, off ? .05 : .02, off ? .022 : .008, 7000);
  else noise(at, off ? .09 : .02, off ? .026 : .01, 6000);
  if (g.kick.includes(inBar)) synth(110, at, .16, .26, 'sine', 42);
  if (g.snare.includes(inBar)) noise(at, .065, .1, 1400);
  if (g.bass.includes(inBar)) synth(style === 'drive' ? root * 2 : root, at, .2, .08, 'triangle');
  if (g.fifth.includes(inBar)) synth(root * 1.5, at, .12, .055);
}

// The voice counts 1-2-3-4 through the call bar and, softer, through the echo bar,
// so the numbers printed on the notes line up with what is heard.
export function countVoice(index, at, volume = 1) {
  if (counts[index]) {
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = counts[index]; g.gain.value = .6 * volume; s.start(at); track(s, g, at + s.buffer.duration + .01);
  }
  synth([520, 520, 520, 700][index], at, .06, .09 * volume, 'triangle', 300);
}

// Each move has its own voice. It plays in the CALL bar to teach the rhythm, and again exactly on
// the beat in the ECHO bar as the answer layer. Playing the answer on the grid (instead of when the
// camera finally sees the move, 100–200 ms later) keeps the sound in time with the count.
const VOICE = {
  grab: (at, v) => synth(620, at, .12, .1 * v, 'square', 300),
  reach: (at, v) => synth(880, at, .16, .08 * v, 'sine', 990),
  squeeze: (at, v) => { synth(330, at, .25, .08 * v, 'triangle'); synth(495, at, .25, .04 * v, 'triangle'); },
  clap: (at, v) => { noise(at, .08, .2 * v, 1800); noise(at + .012, .06, .12 * v, 2400); },
  flip: (at, v) => synth(300, at, .16, .08 * v, 'triangle', 1200),
  sweep: (at, v) => synth(520, at, .3, .06 * v, 'sine', 1040)
};
export function callVoice(type, at, volume = 1) { VOICE[type]?.(at, volume); }
export function answerVoice(type, at) { noise(at, .04, .1, 1500); synth(150, at, .1, .16, 'sine', 46); VOICE[type]?.(at, 1.1); }
export function releasePop(at) { synth(990, at, .08, .08, 'sine', 1320); }
export function tickAt(at) { synth(1040, at, .05, .06, 'triangle'); }

// Confirmation is a short, quiet shimmer with no attack, so a late camera detection does not
// sound like an off-beat hit.
export function confirmSound(grade) {
  const at = ctx.currentTime + .003;
  synth(grade === 'perfect' ? 1760 : 1320, at, .09, .025, 'sine');
}
export function holdPulse(at) { synth(440, at, .06, .07, 'triangle'); }
export function missSound() { synth(90, ctx.currentTime, .12, .04, 'triangle', 45); }
export function chime() { const at = ctx.currentTime + .003; synth(880, at, .12, .1); synth(1320, at + .06, .14, .08); }
