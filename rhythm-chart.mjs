// Charts are written as call-and-response phrases on a 4/4 grid.
// A phrase is two bars: the CALL bar counts 1-2-3-4 and plays the rhythm you are about to echo,
// then the ECHO bar is where the player answers it. Notes always land on beats or half-beats of the
// echo bar, so every action lines up with the music and the bar line.

export const BAR = 4;
export const LEAD_IN = 4; // one bar of groove before the first call

// Chart positions (0..1 inside the play field). L/R are the player's own left/right (camera is mirrored).
export const SPOTS = {
  L: { x: .22, y: .5 }, R: { x: .78, y: .5 }, C: { x: .5, y: .38 },
  hiL: { x: .2, y: .12 }, hiR: { x: .8, y: .12 }, top: { x: .5, y: .04 },
  wideL: { x: .02, y: .45 }, wideR: { x: .98, y: .45 },
  midL: { x: .34, y: .45 }, midR: { x: .66, y: .45 },
  loL: { x: .2, y: .9 }, loR: { x: .8, y: .9 }
};

// Sweep paths are smooth curves through these spots. `side` says which hand is expected.
export const PATHS = {
  riseL: { side: 'L', via: ['loL', 'L', 'hiL'] },
  riseR: { side: 'R', via: ['loR', 'R', 'hiR'] },
  dropL: { side: 'L', via: ['hiL', 'midL', 'loL'] },
  dropR: { side: 'R', via: ['hiR', 'midR', 'loR'] },
  rainbow: { side: 'B', via: ['wideL', 'hiL', 'top', 'hiR', 'wideR'] },
  rainbowBack: { side: 'B', via: ['wideR', 'hiR', 'top', 'hiL', 'wideL'] },
  scoopL: { side: 'L', via: ['wideL', 'loL', 'midL', 'hiL'] },
  scoopR: { side: 'R', via: ['wideR', 'loR', 'midR', 'hiR'] }
};

// Pattern helpers: beat is the position inside the echo bar (0, 0.5, 1 … 3.5).
const sideOf = at => at.endsWith('L') ? 'L' : at.endsWith('R') ? 'R' : 'B';
export const grab = (beat, side = 'L') => ({ beat, type: 'grab', side });
export const reach = (beat, at) => ({ beat, type: 'reach', at, side: sideOf(at) });
export const squeeze = (beat, side, dur) => ({ beat, type: 'squeeze', side, dur });
export const clap = beat => ({ beat, type: 'clap', side: 'B' });
export const flip = (beat, side, dir = side === 'L' ? 'left' : 'right') => ({ beat, type: 'flip', side, dir });
export const sweep = (beat, path, dur) => ({ beat, type: 'sweep', path, dur, side: PATHS[path].side });
// Echo the same bar `times` times back to back, without a new call in between.
export const again = (notes, times = 2) => ({ notes, times });

// The same phrase played by the other hand: sides, spots, paths and flip directions swap.
const SWAP = { L: 'R', R: 'L', hiL: 'hiR', hiR: 'hiL', wideL: 'wideR', wideR: 'wideL', midL: 'midR', midR: 'midL', loL: 'loR', loR: 'loL',
  riseL: 'riseR', riseR: 'riseL', dropL: 'dropR', dropR: 'dropL', scoopL: 'scoopR', scoopR: 'scoopL', rainbow: 'rainbowBack', rainbowBack: 'rainbow', left: 'right', right: 'left' };
const sw = v => SWAP[v] ?? v;
export function mirror(def) {
  const flipNote = n => ({ ...n, side: sw(n.side), ...(n.at && { at: sw(n.at) }), ...(n.path && { path: sw(n.path) }), ...(n.dir && { dir: sw(n.dir) }) });
  return Array.isArray(def) ? def.map(flipNote) : { ...def, notes: def.notes.map(flipNote) };
}

// Difficulty tiers shared by every track. EASY lets either hand play anything; from NORMAL up,
// notes on the left half belong to the left hand. Long sweeps (rainbow, scoop) only appear in HARD and EXPERT.
export const DIFFICULTIES = {
  easy:   { name: 'EASY',   sides: false, hints: true },
  normal: { name: 'NORMAL', sides: true },
  hard:   { name: 'HARD',   sides: true },
  expert: { name: 'EXPERT', sides: true }
};

// Each track has its own groove, tempo and character; its four charts are written as a song:
// intro, verse (a motif and its mirror), chorus, bridge and a busier finale.
export const TRACKS = {
  snack: {
    title: 'SNACK ATTACK', bpm: 100, groove: 'bounce', blurb: 'Bouncy warm-up · on-beat moves',
    charts: {
      easy: { lv: 1, defs: [
        [grab(0, 'L')], [grab(2, 'R')],
        [grab(0, 'L'), grab(2, 'R')], [clap(0)], [reach(0, 'hiL')], [reach(0, 'hiR')],
        [clap(0), clap(2)], [grab(0, 'L'), clap(2)], [squeeze(0, 'L', 2)], [flip(0, 'R')],
        [sweep(0, 'riseL', 2)], [flip(0, 'L')],
        [grab(0, 'L'), grab(2, 'R')], [clap(0), clap(1), clap(2)]
      ] },
      normal: { lv: 4, defs: [
        [grab(0, 'L'), grab(2, 'R')], mirror([grab(0, 'L'), grab(2, 'R')]),
        [grab(0, 'L'), grab(1, 'R'), clap(2)], mirror([grab(0, 'L'), grab(1, 'R'), clap(2)]),
        [reach(0, 'hiL'), reach(1, 'hiR'), clap(3)], [reach(0, 'wideR'), reach(1, 'wideL'), clap(3)],
        [clap(0), grab(1, 'L'), grab(2, 'R'), clap(3)], [flip(0, 'L'), flip(2, 'R')],
        [squeeze(0, 'L', 2), grab(1, 'R')], mirror([squeeze(0, 'L', 2), grab(1, 'R')]),
        [sweep(0, 'riseL', 2), grab(3, 'R')], mirror([sweep(0, 'riseL', 2), grab(3, 'R')]),
        [grab(0, 'L'), grab(0, 'R'), clap(2)], [clap(0), clap(1), flip(2, 'L'), flip(3, 'R')]
      ] },
      hard: { lv: 7, defs: [
        [grab(0, 'L'), grab(1, 'R'), grab(2, 'L'), grab(3, 'R')],
        [grab(0, 'L'), grab(1.5, 'R'), clap(3)], mirror([grab(0, 'L'), grab(1.5, 'R'), clap(3)]),
        [squeeze(0, 'L', 3), grab(1, 'R'), grab(2, 'R')], mirror([squeeze(0, 'L', 3), grab(1, 'R'), grab(2, 'R')]),
        again([clap(0), grab(1, 'L'), grab(1, 'R'), clap(2)]),
        [reach(0, 'hiL'), reach(.5, 'hiR'), reach(2, 'wideL'), reach(2.5, 'wideR')],
        [flip(0, 'L'), flip(1, 'R'), flip(2, 'L'), clap(3)],
        [sweep(0, 'scoopL', 3), grab(1, 'R'), grab(2, 'R')], mirror([sweep(0, 'scoopL', 3), grab(1, 'R'), grab(2, 'R')]),
        [grab(0, 'L'), grab(0, 'R'), clap(1.5), grab(3, 'L'), grab(3, 'R')],
        again([flip(0, 'R'), clap(2)]), [sweep(0, 'rainbow', 3)]
      ] },
      expert: { lv: 10, defs: [
        [grab(0, 'L'), grab(.5, 'R'), grab(1.5, 'L'), grab(2, 'R'), clap(3)],
        again([reach(0, 'hiL'), reach(1, 'hiR'), clap(2)]),
        [flip(0, 'L'), flip(1.5, 'R'), grab(3, 'L')],
        [squeeze(0, 'L', 3), grab(.5, 'R'), grab(1.5, 'R'), grab(2.5, 'R')], mirror([squeeze(0, 'L', 3), grab(.5, 'R'), grab(1.5, 'R'), grab(2.5, 'R')]),
        again([clap(0), clap(1), clap(2)]),
        [grab(0, 'L'), grab(1.5, 'L'), grab(3, 'L'), grab(0, 'R'), grab(2, 'R')],
        [reach(0, 'hiL'), reach(1.5, 'loL'), reach(3, 'hiL'), reach(0, 'hiR'), reach(2, 'loR')],
        [sweep(0, 'riseL', 2), grab(.5, 'R'), grab(2, 'R')], mirror([sweep(0, 'riseL', 2), grab(.5, 'R'), grab(2, 'R')]),
        again([grab(0, 'L'), grab(0, 'R'), clap(1.5), flip(3, 'L')]),
        [sweep(0, 'rainbow', 3)], [sweep(0, 'rainbowBack', 3)]
      ] }
    }
  },
  kitchen: {
    title: 'GROOVE KITCHEN', bpm: 116, groove: 'funk', blurb: 'Funky off-beats · stir with sweeps',
    charts: {
      easy: { lv: 2, defs: [
        [grab(0, 'L')], [clap(0), clap(2)], [reach(0, 'hiR'), reach(2, 'hiL')], [squeeze(0, 'L', 3)],
        [grab(0, 'R'), grab(2, 'L')], [flip(0, 'L'), flip(2, 'R')], [sweep(0, 'riseL', 2)], [clap(0), grab(2, 'R')],
        [sweep(0, 'riseR', 2)], [reach(0, 'wideL'), reach(2, 'wideR')], [squeeze(0, 'R', 2), clap(3)], [clap(0), clap(1), clap(2), clap(3)]
      ] },
      normal: { lv: 5, defs: [
        [grab(0, 'L'), grab(1.5, 'R')], mirror([grab(0, 'L'), grab(1.5, 'R')]),
        [clap(0), grab(1, 'L'), grab(2.5, 'R')], mirror([clap(0), grab(1, 'L'), grab(2.5, 'R')]),
        [sweep(0, 'dropL', 2), grab(2, 'R')], mirror([sweep(0, 'dropL', 2), grab(2, 'R')]),
        again([clap(0), clap(1.5)]),
        [squeeze(0, 'L', 2), flip(1, 'R'), flip(3, 'R')], mirror([squeeze(0, 'L', 2), flip(1, 'R'), flip(3, 'R')]),
        [reach(0, 'hiL'), reach(1, 'midR'), reach(2, 'hiR'), reach(3, 'midL')],
        [grab(0, 'L'), grab(0, 'R'), clap(2)], [clap(0), grab(1.5, 'L'), grab(1.5, 'R'), clap(3)]
      ] },
      hard: { lv: 8, defs: [
        [grab(0, 'L'), grab(.5, 'R'), clap(2)], mirror([grab(0, 'L'), grab(.5, 'R'), clap(2)]),
        again([clap(0), grab(1.5, 'L'), clap(3)]),
        [squeeze(0, 'L', 3), grab(.5, 'R'), grab(1.5, 'R'), grab(2.5, 'R')], mirror([squeeze(0, 'L', 3), grab(.5, 'R'), grab(1.5, 'R'), grab(2.5, 'R')]),
        [sweep(0, 'scoopL', 3), flip(1.5, 'R')], mirror([sweep(0, 'scoopL', 3), flip(1.5, 'R')]),
        [reach(0, 'wideL'), reach(.5, 'wideR'), reach(1.5, 'hiL'), reach(2, 'hiR'), clap(3)],
        [flip(0, 'L'), flip(0, 'R'), clap(1.5), grab(3, 'L'), grab(3, 'R')],
        again([grab(0, 'L'), grab(1, 'R'), grab(1.5, 'L'), clap(3)]),
        [squeeze(0, 'R', 3), reach(.5, 'hiL'), reach(2, 'loL')], [sweep(0, 'rainbowBack', 3)]
      ] },
      expert: { lv: 11, defs: [
        [grab(0, 'L'), grab(.5, 'R'), grab(1, 'L'), grab(1.5, 'R'), clap(3)], mirror([grab(0, 'L'), grab(.5, 'R'), grab(1, 'L'), grab(1.5, 'R'), clap(3)]),
        again([clap(0), clap(1), grab(2, 'L'), grab(2.5, 'R')]),
        [squeeze(0, 'L', 3), flip(.5, 'R'), flip(1.5, 'R'), flip(2.5, 'R')], mirror([squeeze(0, 'L', 3), flip(.5, 'R'), flip(1.5, 'R'), flip(2.5, 'R')]),
        [sweep(0, 'scoopL', 3), grab(.5, 'R'), grab(1.5, 'R'), grab(2.5, 'R')], mirror([sweep(0, 'scoopL', 3), grab(.5, 'R'), grab(1.5, 'R'), grab(2.5, 'R')]),
        again([reach(0, 'hiL'), reach(.5, 'hiR'), reach(1, 'midL'), reach(1.5, 'midR'), clap(3)]),
        [grab(0, 'L'), grab(1.5, 'L'), grab(3, 'L'), grab(.5, 'R'), grab(2, 'R')],
        [flip(0, 'L'), flip(0, 'R'), clap(1), flip(2, 'L'), flip(2.5, 'R')],
        [sweep(0, 'rainbowBack', 3)]
      ] }
    }
  },
  rush: {
    title: 'SUGAR RUSH', bpm: 128, groove: 'drive', blurb: 'Four-on-the-floor · fast and busy',
    charts: {
      easy: { lv: 3, defs: [
        [grab(0, 'L'), grab(2, 'R')], [clap(0), clap(2)], [reach(0, 'hiL'), reach(1, 'hiR')], [flip(0, 'R'), flip(2, 'L')],
        [squeeze(0, 'L', 2), clap(3)], [grab(0, 'R'), grab(1, 'L'), grab(2, 'R')], [sweep(0, 'riseL', 2), clap(3)], [sweep(0, 'riseR', 2), clap(3)],
        [clap(0), clap(1), clap(2), clap(3)], [reach(0, 'wideL'), reach(1, 'wideR'), reach(2, 'hiL'), reach(3, 'hiR')], [squeeze(0, 'R', 3)], [grab(0, 'L'), grab(0, 'R'), clap(2)]
      ] },
      normal: { lv: 6, defs: [
        [grab(0, 'L'), grab(1, 'R'), grab(2, 'L'), grab(3, 'R')], mirror([grab(0, 'L'), grab(1, 'R'), grab(2, 'L'), grab(3, 'R')]),
        [clap(0), flip(1, 'L'), flip(2, 'R'), clap(3)], [reach(0, 'hiL'), reach(0, 'hiR'), clap(2)],
        [squeeze(0, 'L', 3), grab(1, 'R'), grab(2, 'R')], mirror([squeeze(0, 'L', 3), grab(1, 'R'), grab(2, 'R')]),
        again([clap(0), clap(1), clap(2)]),
        [sweep(0, 'riseL', 2), grab(1, 'R'), grab(2, 'R')], mirror([sweep(0, 'riseL', 2), grab(1, 'R'), grab(2, 'R')]),
        [grab(0, 'L'), grab(1.5, 'R'), grab(3, 'L')], [flip(0, 'L'), flip(0, 'R'), clap(2)]
      ] },
      hard: { lv: 9, defs: [
        [grab(0, 'L'), grab(.5, 'R'), grab(1.5, 'L'), grab(2, 'R'), clap(3)], mirror([grab(0, 'L'), grab(.5, 'R'), grab(1.5, 'L'), grab(2, 'R'), clap(3)]),
        again([flip(0, 'L'), flip(1, 'R'), clap(2)]),
        [squeeze(0, 'L', 3), reach(.5, 'hiR'), reach(1.5, 'wideR'), reach(2.5, 'hiR')], mirror([squeeze(0, 'L', 3), reach(.5, 'hiR'), reach(1.5, 'wideR'), reach(2.5, 'hiR')]),
        [sweep(0, 'dropL', 2), grab(.5, 'R'), grab(1.5, 'R'), clap(3)], mirror([sweep(0, 'dropL', 2), grab(.5, 'R'), grab(1.5, 'R'), clap(3)]),
        [reach(0, 'wideL'), reach(.5, 'wideR'), reach(1, 'hiL'), reach(1.5, 'hiR'), clap(3)],
        again([clap(0), clap(1), grab(2, 'L'), grab(2, 'R')]),
        [grab(0, 'L'), grab(1.5, 'L'), grab(3, 'L'), grab(0, 'R'), grab(2, 'R')], [sweep(0, 'rainbow', 3)]
      ] },
      expert: { lv: 12, defs: [
        again([grab(0, 'L'), grab(.5, 'R'), grab(1, 'L'), grab(1.5, 'R'), clap(3)]),
        [flip(0, 'L'), flip(.5, 'R'), flip(1.5, 'L'), flip(2, 'R'), clap(3)],
        [squeeze(0, 'L', 3), grab(.5, 'R'), grab(1.5, 'R'), grab(2.5, 'R')], mirror([squeeze(0, 'L', 3), grab(.5, 'R'), grab(1.5, 'R'), grab(2.5, 'R')]),
        again([clap(0), clap(1), clap(2), clap(3)]),
        [sweep(0, 'scoopL', 3), grab(.5, 'R'), grab(1.5, 'R'), grab(2.5, 'R')], mirror([sweep(0, 'scoopL', 3), grab(.5, 'R'), grab(1.5, 'R'), grab(2.5, 'R')]),
        [reach(0, 'hiL'), reach(.5, 'hiR'), reach(1, 'midL'), reach(1.5, 'midR'), reach(2, 'loL'), reach(2.5, 'loR')],
        again([grab(0, 'L'), grab(0, 'R'), clap(1), flip(2, 'L'), flip(2.5, 'R')]),
        [grab(0, 'L'), grab(1.5, 'L'), grab(3, 'L'), grab(.5, 'R'), grab(2, 'R')],
        [sweep(0, 'rainbow', 3)], [sweep(0, 'rainbowBack', 3)]
      ] }
    }
  }
};

// Every chart by "track/difficulty" key, for linting and tests.
export const SONGS = Object.fromEntries(Object.entries(TRACKS).flatMap(([t, track]) => Object.entries(track.charts).map(([d, c]) => [`${t}/${d}`, c.defs])));
export const chartFor = (track, diff) => TRACKS[track]?.charts[diff] ?? TRACKS.snack.charts.normal;

// --- geometry ---------------------------------------------------------------------------------

function catmullRom(points, samples = 14) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < samples; s++) {
      const t = s / samples, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push(points.at(-1));
  return out;
}

// Constant-speed point along a sampled path (u in 0..1 by arc length).
export function pathPoint(path, u) {
  const total = path.length.at(-1), target = Math.max(0, Math.min(1, u)) * total;
  let i = 1;
  while (i < path.points.length - 1 && path.length[i] < target) i++;
  const a = path.points[i - 1], b = path.points[i], span = path.length[i] - path.length[i - 1] || 1, f = (target - path.length[i - 1]) / span;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

export function samplePath(name) {
  const points = catmullRom(PATHS[name].via.map(k => SPOTS[k]));
  const length = [0];
  for (let i = 1; i < points.length; i++) length.push(length[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  return { points, length };
}

// --- building ---------------------------------------------------------------------------------

// Gesture notes on the same side would share a spot; lay them out in a zigzag down that side
// (in beat order) so a bar with two or three left-hand moves stays readable and nothing overlaps.
const ZIGZAG = [{ x: 0, y: 0 }, { x: .17, y: .27 }, { x: 0, y: .54 }, { x: .17, y: .81 }];
function placeGesture(note, index) {
  if (note.side === 'B') return { x: index % 2 ? .62 : .38, y: .12 + index * .25 };
  const z = ZIGZAG[index % ZIGZAG.length], inward = note.side === 'L' ? 1 : -1;
  return { x: (note.side === 'L' ? .2 : .8) + inward * z.x, y: .18 + z.y };
}

let nextId = 0;
// Turn one phrase definition into timed notes. `start` is the beat where the CALL bar begins.
export function buildPhrase(def, start, beat, phraseIndex, options = {}) {
  const { notes, times } = Array.isArray(def) ? { notes: def, times: 1 } : def;
  const echoes = [], events = [];
  for (let r = 0; r < times; r++) echoes.push(start + BAR * (r + 1));
  const sideCount = { L: 0, R: 0, B: 0 };
  const placed = [...notes].sort((a, b) => a.beat - b.beat).map(n => {
    const p = n.type === 'reach' ? SPOTS[n.at] : n.type === 'sweep' ? null : placeGesture(n, sideCount[n.side]++);
    return { ...n, pos: p };
  });
  const together = b => placed.filter(m => m.beat === b).length > 1;
  echoes.forEach((echo, r) => {
    for (const n of placed) {
      const at = echo + n.beat, durBeats = n.dur || 0;
      const e = {
        id: nextId++, phrase: phraseIndex, repeat: r, type: n.type, side: options.sides === false && n.type !== 'clap' && n.type !== 'reach' && n.type !== 'sweep' ? 'A' : n.side,
        beatInBar: n.beat, callAt: start * beat, echoAt: echo * beat, at, time: at * beat, durBeats, duration: durBeats * beat,
        pos: n.pos, dir: n.dir, state: 'waiting', demo: !!options.demo, together: together(n.beat)
      };
      if (n.type === 'sweep') {
        e.path = samplePath(n.path);
        e.ticks = Array.from({ length: durBeats + 1 }, (_, k) => ({ time: (at + k) * beat, pos: pathPoint(e.path, k / durBeats), state: 'waiting' }));
      }
      if (n.type === 'squeeze') e.tail = { time: (at + durBeats) * beat, state: 'waiting' };
      events.push(e);
    }
  });
  const end = echoes.at(-1) + BAR + (options.restBeats || 0);
  return { index: phraseIndex, start, callAt: start * beat, echoes: echoes.map(b => b * beat), end, endTime: end * beat, notes: events, def: placed, times };
}

// Same-hand moves closer than this are not physically comfortable through a camera.
export const MIN_SAME_HAND_GAP = .4;
export function lintSong(key, bpm) {
  const beat = 60 / bpm, problems = [];
  SONGS[key].forEach((def, i) => {
    const notes = Array.isArray(def) ? def : def.notes, where = `${key} phrase ${i + 1}`;
    // Both-hand moves (clap, centre reaches, overhead sweeps) occupy both hands.
    for (const side of ['L', 'R']) {
      const own = notes.filter(n => n.side === side || n.side === 'B').sort((a, b) => a.beat - b.beat);
      for (let k = 1; k < own.length; k++) {
        const prevEnd = own[k - 1].beat + (own[k - 1].dur || 0);
        if ((own[k].beat - prevEnd) * beat < MIN_SAME_HAND_GAP) problems.push(`${where}: ${side} hand ${own[k - 1].type}@${own[k - 1].beat} → ${own[k].type}@${own[k].beat}`);
      }
    }
    // A clap needs the beat to itself: nothing starts, ends or is held on it.
    for (const c of notes.filter(n => n.type === 'clap'))
      for (const n of notes) if (n !== c && c.beat >= n.beat && c.beat <= n.beat + (n.dur || 0)) problems.push(`${where}: clap@${c.beat} shares the beat with ${n.type}@${n.beat}`);
    for (const n of notes) if (n.beat + (n.dur || 0) > 3) problems.push(`${where}: ${n.type} ends after beat 4 of the echo bar`);
  });
  return problems;
}

// A song is a fixed list of phrases; the tutorial supplies phrases one at a time instead.
export function songSource(track, diff, options = {}) {
  const defs = chartFor(track, diff).defs;
  let i = 0;
  return { total: defs.length, next: () => i < defs.length ? { def: defs[i++], options } : null };
}
