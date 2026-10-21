// Note types, timing rules and hand features shared by the game, the chart and the tests.

export const TYPES = {
  grab:    { label: 'GRAB',    hint: 'Open hand, then fist on the beat', color: '#5be7df', glyph: '●', key: 'Z' },
  reach:   { label: 'REACH',   hint: 'Touch inside the ring for Perfect', color: '#ffb96e', glyph: '◎', key: 'MOVE' },
  squeeze: { label: 'SQUEEZE', hint: 'Fist on the beat, open on the last beat', color: '#e5f57c', glyph: '■', key: 'HOLD Z' },
  clap:    { label: 'CLAP',    hint: 'Bring both hands together, anywhere', color: '#ff93c7', glyph: '◆', key: 'SPACE' },
  flip:    { label: 'FLIP',    hint: 'Swipe an open palm the arrow way', color: '#b9a5ff', glyph: '▲', key: '← →' },
  sweep:   { label: 'SWEEP',   hint: 'Touch each numbered circle for Perfect', color: '#ff8a65', glyph: '〰', key: 'MOVE' }
};

export const LEVELS = {
  easy:   { name: 'INTRO',      bpm: 96,  sides: false, guide: true,  description: '96 BPM · one move per bar · any hand' },
  normal: { name: 'FLOW',       bpm: 108, sides: true,  guide: false, description: '108 BPM · two moves per bar · left side = left hand' },
  groove: { name: 'GROOVE',     bpm: 112, sides: true,  guide: false, description: '112 BPM · three moves per bar · first doubles with both hands' },
  hard:   { name: 'SYNC',       bpm: 120, sides: true,  guide: false, description: '120 BPM · both hands · squeeze with one, play with the other' },
  bounce: { name: 'BOUNCE',     bpm: 120, sides: true,  guide: false, description: '120 BPM · one off-beat per bar · a few echo-twice bars' },
  expert: { name: 'OVERDRIVE',  bpm: 126, sides: true,  guide: false, description: '126 BPM · off-beats · echo twice without a new call' },
  master: { name: 'POLYRHYTHM', bpm: 126, sides: true,  guide: false, description: '126 BPM · 3-against-2 between hands · long sweeps' }
};

// Seconds. Camera play gets wider windows because detection adds frame jitter.
export const WINDOWS = { camera: { perfect: .11, good: .24 }, pointer: { perfect: .07, good: .16 } };

// Detection lag of each camera gesture: a fist is recognised after the fingers have mostly closed,
// a swipe after the palm has already travelled. Subtracted from the event time before judging.
export const GESTURE_LAG = { grab: .07, squeeze: .07, flip: .05, clap: .04, reach: .03, sweep: .03 };

export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function timingGrade(delta, camera = false) {
  const w = camera ? WINDOWS.camera : WINDOWS.pointer, d = Math.abs(delta);
  return d <= w.perfect ? 'perfect' : d <= w.good ? 'good' : null;
}

// Screen halves stand in for hands: the camera is mirrored, so the player's left hand is on the left.
export const SIDE_OVERLAP = .15;
export function onSide(side, x) {
  if (side === 'L') return x <= .5 + SIDE_OVERLAP;
  if (side === 'R') return x >= .5 - SIDE_OVERLAP;
  return true;
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
function angle(a, b, c) {
  const u = [a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0)], v = [c.x - b.x, c.y - b.y, (c.z || 0) - (b.z || 0)];
  return Math.acos(clamp(u.reduce((s, n, i) => s + n * v[i], 0) / (Math.hypot(...u) * Math.hypot(...v) || 1), -1, 1)) * 180 / Math.PI;
}

// Hand closure from two cues, measured on 3D world landmarks so the view angle matters less:
//  · reach: wrist→fingertip ÷ wrist→knuckle, ~1.9 straight, ~1.0–1.2 in a fist
//  · bend: angle knuckle→middle joint→tip, ~170° straight, <100° curled
// When the fingers curl toward the camera the tips are hidden and the model often under-reports
// the bend, so a fist only needs one of the two cues. Tune with ?debug, which prints these values.
export const HAND = {
  reach: { open: 1.75, closed: 1.15 }, bend: { open: 160, closed: 90 },
  fistAt: .55,     // closure needed to count as a fist
  openAt: .25,     // closure below this arms the next grab
  releaseAt: .35   // closure below this ends a squeeze
};
export function handFeatures(image, world = image, aspect = 4 / 3) {
  const ids = [0, 5, 9, 13, 17], tips = [8, 12, 16, 20];
  const bends = [6, 10, 14, 18].map(i => angle(world[i - 1], world[i], world[i + 2]));
  const reaches = tips.map(t => distance(world[t], world[0]) / Math.max(1e-6, distance(world[t - 3], world[0])));
  const bend = bends.reduce((s, a) => s + a, 0) / 4, reach = reaches.reduce((s, r) => s + r, 0) / 4;
  const k = HAND, closure = Math.max(
    clamp((k.reach.open - reach) / (k.reach.open - k.reach.closed), 0, 1),
    clamp((k.bend.open - bend) / (k.bend.open - k.bend.closed), 0, 1));
  return {
    x: 1 - ids.reduce((s, i) => s + image[i].x, 0) / 5,
    y: ids.reduce((s, i) => s + image[i].y, 0) / 5,
    bend, reach, closure,
    fist: closure >= k.fistAt,
    open: closure <= k.openAt,
    palmWidth: Math.max(.035, Math.hypot(image[5].x - image[17].x, image[5].y - image[17].y)),
    // Wrist → middle knuckle stays visible when the palm turns edge-on to clap, unlike palm width.
    handSize: Math.max(.03, Math.hypot((image[0].x - image[9].x) * aspect, image[0].y - image[9].y), Math.hypot((image[5].x - image[17].x) * aspect, image[5].y - image[17].y)),
    aspect
  };
}

// Distance between the two palms, in hand lengths (~0.5 when clapped, 2+ when apart).
export function clapFeatures(a, b) {
  const scale = (a.handSize + b.handSize) / 2;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, visible: true, ratio: Math.hypot((a.x - b.x) * a.aspect, a.y - b.y) / scale };
}

// Image-space palm centers are already mirrored by handFeatures. Match CSS object-fit: cover.
export function cameraPoint(point, width, height, sourceWidth = 640, sourceHeight = 480) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight), rw = sourceWidth * scale, rh = sourceHeight * scale;
  const x = (point.x * rw - (rw - width) / 2) / width, y = (point.y * rh - (rh - height) / 2) / height;
  return { x: clamp(x, 0, 1), y: clamp(y, 0, 1), visible: x >= 0 && x <= 1 && y >= 0 && y <= 1 };
}

// Shared layout and hit geometry: drawing and judging use exactly the same circles.
let uiBounds = { top: 140, toolbarTop: null };
export function setPlayLayout(bounds) { uiBounds = { ...uiBounds, ...bounds }; }
export function beatPanelRect(w, h, pointerMode = false) {
  const width = Math.min(620, w - 32), height = h < 600 ? 46 : w < 560 ? 58 : 68;
  const footer = uiBounds.toolbarTop ?? h - (pointerMode ? 88 : 54);
  return { x: (w - width) / 2, y: footer - 14 - height, width, height };
}
export function targetRadius(w, h) {
  const room = beatPanelRect(w, h).y - 58 - uiBounds.top - 42;
  return Math.max(22, Math.min(62, w * .078, h * .078, room / 3));
}
export const sweepRadius = (w, h) => targetRadius(w, h) * .65;
export function playField(w, h) {
  const r = targetRadius(w, h), top = uiBounds.top + r + 22;
  const bottom = Math.max(top, beatPanelRect(w, h).y - 58 - r - 24);
  const pad = Math.max(r + 10, w * .06);
  return { left: pad, right: w - pad, top, bottom };
}
export function toScreen(p, w, h) {
  const f = playField(w, h);
  return { x: f.left + p.x * (f.right - f.left), y: f.top + p.y * (f.bottom - f.top) };
}
export function fromScreen(x, y, w, h) {
  const f = playField(w, h);
  return { x: (x - f.left) / (f.right - f.left), y: (y - f.top) / (f.bottom - f.top) };
}
// Fraction of a motion segment inside a circle, including fast crossings between camera frames.
export function segmentCircleInterval(a, b, center, radius) {
  const dx = b.x - a.x, dy = b.y - a.y, ox = a.x - center.x, oy = a.y - center.y;
  const aa = dx * dx + dy * dy, cc = ox * ox + oy * oy - radius * radius;
  if (aa < 1e-9) return cc <= 0 ? [0, 1] : null;
  const bb = 2 * (ox * dx + oy * dy), disc = bb * bb - 4 * aa * cc;
  if (disc < 0) return null;
  const root = Math.sqrt(disc), lo = Math.max(0, (-bb - root) / (2 * aa)), hi = Math.min(1, (-bb + root) / (2 * aa));
  return lo <= hi ? [lo, hi] : null;
}
