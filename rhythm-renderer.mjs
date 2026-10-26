// Canvas drawing. Timing is read from the two-bar CALL / ECHO panel and from food shapes that
// fill up as their beat approaches; there are no approach rings or scan lines.
import { TYPES, clamp, toScreen, playField, targetRadius, sweepRadius, beatPanelRect } from './rhythm-core.mjs?v=23';
import { pathPoint, BAR } from './rhythm-chart.mjs?v=23';

const TAU = Math.PI * 2;
// Paper-and-ink palette shared with the portfolio: cream paper, dark ink outlines, hard offset shadows.
const INK = '#1b1530', PAPER = '#fff6ea', MUTED = '#5b5470', YELLOW = '#ffe14a', ORANGE = '#ff9f2e';
const FONT = '"DM Sans", Inter, "Helvetica Neue", Arial, sans-serif';
const GROOVE_COLORS = { 1: '#ff4f9a', 2: '#ff9f2e', 3: '#ffe14a', 4: '#31d7f0' };
const ease = f => 1 - (1 - f) ** 3;

function circle(c, x, y, r, color, stroke = false, width = 2) {
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU);
  if (stroke) { c.strokeStyle = color; c.lineWidth = width; c.stroke(); } else { c.fillStyle = color; c.fill(); }
}
function text(c, label, x, y, size = 13, color = INK, weight = 700) {
  c.font = `${weight} ${size}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = color; c.fillText(label, x, y);
}
// Flat food shapes, one per gesture. `fill` (0..1) is how ripe the note is.
function shapePath(c, type, x, y, r, dir) {
  c.beginPath();
  if (type === 'grab' || type === 'reach' || type === 'sweep') c.arc(x, y, r, 0, TAU);
  else if (type === 'squeeze') c.rect(x - r * .85, y - r * .85, r * 1.7, r * 1.7);
  else if (type === 'clap') { c.moveTo(x, y - r * 1.1); c.lineTo(x + r * 1.1, y); c.lineTo(x, y + r * 1.1); c.lineTo(x - r * 1.1, y); c.closePath(); }
  else if (type === 'flip') { const s = dir === 'left' ? -1 : 1; c.moveTo(x + s * r * 1.1, y); c.lineTo(x - s * r * .8, y - r); c.lineTo(x - s * r * .8, y + r); c.closePath(); }
}
function food(c, type, x, y, r, fill, { dir, alpha = 1, outline = INK } = {}) {
  const color = TYPES[type].color;
  c.save(); c.globalAlpha *= alpha;
  shapePath(c, type, x + 4, y + 4, r, dir); c.fillStyle = INK; c.fill(); // hard shadow
  shapePath(c, type, x, y, r, dir); c.fillStyle = '#ffffff'; c.fill();
  c.save(); shapePath(c, type, x, y, r, dir); c.clip();
  const top = y + r * 1.15 - r * 2.3 * fill;
  c.fillStyle = color; c.fillRect(x - r * 1.3, top, r * 2.6, r * 2.6);
  c.restore();
  shapePath(c, type, x, y, r, dir); c.strokeStyle = outline; c.lineWidth = fill >= 1 ? 4.5 : 3; c.stroke();
  c.restore();
}
// Solid colours get an ink outline; translucent ones (ghosts, misses) stay flat.
function glyph(c, type, x, y, r, color, dir) { c.save(); shapePath(c, type, x, y, r, dir); c.fillStyle = color; c.fill(); if (color.length === 7) { c.strokeStyle = INK; c.lineWidth = Math.max(1.5, r * .2); c.stroke(); } c.restore(); }
const beatName = b => Number.isInteger(b) ? String(b + 1) : `${Math.floor(b) + 1}&`;
// The beat this note is played on, matching the count voice. It lights up while its count is heard
// in the call bar and grows as its own beat arrives in the echo bar. Off-beats ("2 &") get an orange
// pill so they cannot be mistaken for the beat; notes that share a beat get bigger badges.
// kind 'release' marks the beat a squeeze must open on.
function beatBadge(c, b, x, y, s, n, kind = 'hit') {
  const at = kind === 'release' ? n.tail.time : n.time, callBeat = n.callAt + b * s.beat;
  const heard = n.repeat === 0 && s.time >= callBeat && s.time < callBeat + s.beat * .5;
  const until = (at - s.time) / s.beat, near = until < 1 && until > -.3, off = !Number.isInteger(b);
  const base = n.together ? 20 : 16, r = near ? base + 2 + (1 - Math.max(0, until)) * 4 : base;
  const lit = heard || near, release = kind === 'release';
  const fill = release ? (lit ? YELLOW : PAPER) : lit ? YELLOW : off ? ORANGE : '#ffffff';
  c.beginPath();
  if (off) roundRect(c, x - r * 1.4, y - r, r * 2.8, r * 2, r); else c.arc(x, y, r, 0, TAU);
  c.fillStyle = fill; c.fill(); c.strokeStyle = INK; c.lineWidth = release ? 3 : 2.5; c.stroke();
  const label = off ? `${Math.floor(b) + 1} &` : String(b + 1);
  text(c, label, x, y + 1, r * (off ? .95 : 1.1), INK, 900);
  if (release) text(c, 'OPEN', x, y + r + 10, 10, INK, 900);
  else if (off) text(c, 'OFF-BEAT', x, y + r + 9, 9, INK, 900);
}

// --- layout -----------------------------------------------------------------------------------

// --- background & zones -----------------------------------------------------------------------
function background(c, s) {
  const { w, h, now, videoReady } = s;
  c.clearRect(0, 0, w, h);
  // On camera the video shows through a paper wash, so ink outlines stay readable over any room.
  c.fillStyle = videoReady ? '#fff6ea99' : PAPER; c.fillRect(0, 0, w, h);
  if (!videoReady) for (let i = 0; i < 4; i++) circle(c, w * (.16 + i * .24), h * (.4 + Math.sin(now / 6000 + i) * .14), Math.min(w, h) * .26, ['#31d7f00c', '#ff4f9a0a', '#7a5cff09', '#ffe14a14'][i]);
}
function sideZones(c, s, upcoming) {
  if (!s.running || !s.sidesOn) return;
  const f = playField(s.w, s.h), mid = s.w / 2;
  for (const side of ['L', 'R']) {
    if (!upcoming.some(n => n.side === side)) continue;
    c.fillStyle = side === 'L' ? '#31d7f014' : '#ff4f9a12';
    c.fillRect(side === 'L' ? 0 : mid, f.top - 20, mid, f.bottom - f.top + 40);
  }
  c.save(); c.setLineDash([6, 10]); c.strokeStyle = INK + '40'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(mid, f.top - 10); c.lineTo(mid, f.bottom + 10); c.stroke(); c.restore();
  text(c, 'LEFT HAND', mid - 90, f.top - 8, 11, INK);
  text(c, 'RIGHT HAND', mid + 90, f.top - 8, 11, INK);
}

// --- notes ------------------------------------------------------------------------------------
function drawNote(c, n, s, r) {
  const { time, beat } = s, color = TYPES[n.type].color;
  const appear = clamp((time - n.callAt) / (beat * .5), 0, 1);
  if (appear <= 0) return;
  const ripe = clamp(1 - (n.time - time) / (BAR * beat), 0, 1);
  // During the call bar each note bounces when its own sound plays: you see and hear the rhythm first.
  const callBeat = n.callAt + n.beatInBar * beat, since = time - callBeat;
  const bounce = n.repeat === 0 && since >= 0 && since < beat ? Math.exp(-since / beat * 6) * .3 : 0;
  const due = Math.abs(time - n.time) < beat * .25 ? 1 : 0;
  c.save(); c.globalAlpha = ease(appear);
  if (n.type === 'sweep') drawSweep(c, n, s, r);
  else {
    const p = toScreen(n.pos, s.w, s.h), size = n.type === 'reach' ? r : r * .72 * (1 + bounce * .25);
    // This fixed ring is the actual hit boundary. The shape can pulse inside it. Gesture style has no boundary.
    if (n.type !== 'clap' && n.type !== 'reach' && !s.gestureStyle) {
      circle(c, p.x, p.y, r, color + '24');
      c.save(); c.setLineDash([7, 7]); circle(c, p.x, p.y, r, INK + 'b3', true, 2.5); c.restore();
    }
    if (n.type === 'reach') {
      circle(c, p.x, p.y, size * ripe, color + '55');
      c.save(); c.setLineDash(ripe < 1 ? [10, 8] : []); circle(c, p.x, p.y, size, ripe >= .99 ? INK : INK + 'aa', true, ripe >= .99 ? 4.5 : 3); c.restore();
    } else food(c, n.type, p.x, p.y, size, n.state === 'holding' ? 1 : ripe, { dir: n.dir });
    if (n.type === 'flip') { const s2 = n.dir === 'left' ? -1 : 1; c.strokeStyle = color; c.lineWidth = 4; c.lineCap = 'round'; for (let k = 1; k <= 3; k++) { const o = (k * 14 + (s.now / 25) % 14) * s2; c.globalAlpha = ease(appear) * (1 - k / 4); c.beginPath(); c.moveTo(p.x - s2 * size - o, p.y - 8); c.lineTo(p.x - s2 * size - o - s2 * 10, p.y - 8); c.moveTo(p.x - s2 * size - o, p.y + 8); c.lineTo(p.x - s2 * size - o - s2 * 10, p.y + 8); c.stroke(); } c.globalAlpha = ease(appear); }
    if (n.type === 'clap' && n.state === 'waiting') { const gap = (1 - ripe) * r * .7 + size * .15; glyph(c, 'flip', p.x - size - gap, p.y, size * .45, color + 'cc', 'right'); glyph(c, 'flip', p.x + size + gap, p.y, size * .45, color + 'cc', 'left'); }
    if (n.type === 'squeeze') drawSqueezeBar(c, n, s, p, size);
    const label = n.state === 'holding' ? `KEEP FIST · OPEN ON ${beatName(n.beatInBar + n.durBeats)}` : TYPES[n.type].label + (n.side === 'L' ? ' · LEFT' : n.side === 'R' ? ' · RIGHT' : '');
    text(c, label, p.x, p.y + r + 16, 12, due ? INK : MUTED, 800);
    if (n.state !== 'holding') {
      const label = beatName(n.beatInBar), fontSize = Math.max(18, Math.min(34, size * (label.length > 1 ? .68 : .95)));
      c.save();
      c.font = `900 ${fontSize}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.lineJoin = 'round'; c.strokeText(label, p.x, p.y);
      text(c, label, p.x, p.y, fontSize, INK, 900);
      c.restore();
    }
    if (n.type === 'squeeze' && n.tail.state === 'waiting') beatBadge(c, n.beatInBar + n.durBeats, p.x + r + 24, p.y - r + 8, s, n, 'release');
  }
  c.restore();
}

function drawSqueezeBar(c, n, s, p, size) {
  const segs = n.durBeats, bx = p.x + size + 16, bh = size * 2, by = p.y - size, segH = bh / segs - 3, color = TYPES.squeeze.color;
  const left = n.state === 'holding' ? clamp((n.tail.time - s.time) / s.beat, 0, segs) : segs;
  for (let k = 0; k < segs; k++) {
    const filled = segs - k <= left + 1e-6, partial = !filled && segs - k - 1 < left ? left % 1 : 0;
    c.fillStyle = INK + '22'; c.fillRect(bx, by + k * (segH + 3), 10, segH);
    if (filled || partial) { c.fillStyle = color; const hh = filled ? segH : segH * partial; c.fillRect(bx, by + k * (segH + 3) + segH - hh, 10, hh); }
  }
  if (n.state === 'holding') text(c, left > .05 ? Math.ceil(left) : 'OPEN!', p.x, p.y, left > .05 ? 26 : 16, INK, 900);
}

function drawSweep(c, n, s, r) {
  const color = TYPES.sweep.color, pts = n.path.points.map(p => toScreen(p, s.w, s.h));
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = color + '40'; c.lineWidth = r * .9; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke();
  c.strokeStyle = color + 'aa'; c.lineWidth = 3; c.setLineDash([2, 12]); c.stroke(); c.setLineDash([]);
  n.ticks.forEach((k, i) => {
    const p = toScreen(k.pos, s.w, s.h), next = n.ticks.find(t => t.state === 'waiting') === k;
    const fill = k.state === 'miss' ? INK + '26' : k.state !== 'waiting' ? color : next && Math.abs(s.time - k.time) < s.beat * .3 ? YELLOW : '#ffffff';
    const dotR = sweepRadius(s.w, s.h);
    circle(c, p.x, p.y, dotR, fill); circle(c, p.x, p.y, dotR, INK, true, 3);
    text(c, beatName(n.beatInBar + i), p.x, p.y + 1, Math.max(16, sweepRadius(s.w, s.h) * .85), INK, 800);
  });
  const u = clamp((s.time - n.time) / n.duration, 0, 1), head = toScreen(pathPoint(n.path, u), s.w, s.h);
  const pulse = s.time < n.time ? 1 + Math.sin(s.now / 120) * .12 : 1;
  circle(c, head.x, head.y, r * .45 * pulse, color + '55', true, 3);
  const start = toScreen(n.ticks[0].pos, s.w, s.h);
  if (s.time < n.time) text(c, `SWEEP · START HERE`, start.x, start.y - 30, 12, INK);
}

// Notes on the same beat are tied with a dashed line so a two-hand move reads as one event.
function togetherLinks(c, s, list, labels = false) {
  const groups = new Map();
  for (const n of list) if (n.together && n.state === 'waiting' && n.type !== 'sweep' && s.time >= n.callAt) groups.set(n.time, [...(groups.get(n.time) || []), n]);
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const pts = g.map(n => toScreen(n.pos, s.w, s.h)), soon = (g[0].time - s.time) / s.beat < 1;
    if (!labels) { c.save(); c.setLineDash([8, 8]); c.strokeStyle = soon ? INK : INK + '80'; c.lineWidth = soon ? 4 : 2.5;
      c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke(); c.restore(); continue; }
    const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length, my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    c.fillStyle = INK; roundRect(c, mx - 52, my - 13, 104, 26, 13); c.fill();
    text(c, `×${g.length} TOGETHER`, mx, my + 1, 12, soon ? YELLOW : PAPER, 900);
  }
}

// --- beat panel -------------------------------------------------------------------------------
function beatPanel(c, s, P) {
  const { time, beat, phrase: ph } = s;
  c.save();
  c.fillStyle = INK; roundRect(c, P.x + 5, P.y + 5, P.width, P.height, 16); c.fill(); // hard shadow
  c.fillStyle = '#ffffff'; c.strokeStyle = INK; c.lineWidth = 2.5;
  roundRect(c, P.x, P.y, P.width, P.height, 16); c.fill(); c.stroke();
  const half = P.width / 2, cw = (half - 24) / 4, cy = P.y + P.height * .56, ch = P.height * .44;
  let bar = -1, inBar = 0, rest = false, label = ['GET READY', ''];
  if (ph) {
    bar = Math.floor((time - ph.callAt) / (BAR * beat) + 1e-6); inBar = Math.floor(((time - ph.callAt) / beat) % BAR + 1e-6);
    rest = bar > ph.times;
    label = bar === 0 ? ['LISTEN', 'ECHO'] : rest ? ['', 'REST'] : bar === 1 ? ['LISTEN', 'YOUR TURN'] : ['AGAIN', 'YOUR TURN'];
  } else if (s.running) inBar = Math.floor(clamp(time / beat, 0, 3.99));
  for (let side = 0; side < 2; side++) {
    const x0 = P.x + side * half + 12, active = ph ? (side === 0 ? bar === 0 : bar >= 1 && !rest) : side === 0 && s.running;
    text(c, label[side], x0 + 2 * cw, P.y + 11, 10, active ? INK : INK + '66', 800);
    for (let k = 0; k < 4; k++) {
      const x = x0 + k * cw + 3, on = active && inBar === k;
      c.fillStyle = on ? (side ? YELLOW : '#31d7f0') : INK + '10';
      roundRect(c, x, cy - ch / 2, cw - 6, ch, 6); c.fill();
      if (side === 0) text(c, String(k + 1), x + (cw - 6) / 2, cy + 1, 13, on ? INK : INK + '99', 800);
      else text(c, String(k + 1), x + 9, cy - ch / 2 + 9, 9, on ? INK : INK + '80', 800);
    }
    if (!ph || rest) continue;
    // Both halves show where the notes are: the call bar as small marks, the echo bar as full glyphs.
    for (const n of ph.def) {
      const nx = x0 + n.beat * cw + cw / 2, small = side === 0;
      const hits = side === 1 ? ph.notes.filter(m => m.beatInBar === n.beat && m.type === n.type && m.side === n.side && m.repeat === Math.max(0, bar - 1)) : [];
      const done = hits.length && hits.every(m => m.state === 'hit'), missed = hits.some(m => m.state === 'miss');
      const stack = ph.def.filter(m => m.beat === n.beat), idx = stack.indexOf(n), off = (idx - (stack.length - 1) / 2) * (small ? 10 : 20);
      const color = missed ? INK + '40' : TYPES[n.type].color, gy = small ? cy - ch / 2 - 2 : cy;
      // A squeeze draws a hold line to its release beat, ending in a hollow square: open the hand there.
      if (n.type === 'squeeze') {
        const rx = x0 + (n.beat + n.dur) * cw + cw / 2;
        c.strokeStyle = color; c.lineWidth = small ? 2 : 4; c.beginPath(); c.moveTo(nx + off, gy); c.lineTo(rx, gy); c.stroke();
        c.strokeStyle = color; c.lineWidth = small ? 1.5 : 2.5; c.strokeRect(rx - (small ? 4 : 7), gy - (small ? 4 : 7), small ? 8 : 14, small ? 8 : 14);
        if (!small) text(c, 'OPEN', rx, cy + ch / 2 + 7, 9, color, 900);
      }
      if (small) glyph(c, n.type, nx + off, gy, stack.length > 1 ? 5 : 4, color, n.dir);
      else { glyph(c, n.type, nx + off, cy, 9, done ? INK : color, n.dir); if (done) glyph(c, n.type, nx + off, cy, 5, color, n.dir); }
      if (!small && idx === 0 && stack.length > 1) text(c, `×${stack.length}`, nx, cy - ch / 2 - 7, 11, INK, 900);
      if (!small && idx === 0 && !Number.isInteger(n.beat)) text(c, '&', nx, cy + ch / 2 + 8, 13, INK, 900);
    }
  }
  c.strokeStyle = INK + '33'; c.beginPath(); c.moveTo(P.x + half, P.y + 8); c.lineTo(P.x + half, P.y + P.height - 8); c.stroke();
  c.restore();
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

// --- the beat mouth ---------------------------------------------------------------------------
// The creature that is being fed. It bobs on the beat, watches the next note, opens wide when
// food is due, and chomps when a hit lands. Its color follows the GROOVE multiplier.
function mouthCreature(c, s, P, next, chomp, sad) {
  const R = s.h < 600 ? 18 : P.width < 420 ? 24 : 30, x = s.w / 2, phase = s.running ? ((s.time / s.beat) % 1 + 1) % 1 : 0;
  const bob = Math.exp(-phase * 7) * 5, y = P.y - R * .55 - bob;
  const color = GROOVE_COLORS[s.groove] || GROOVE_COLORS[1];
  const due = next ? clamp(1 - Math.abs(next.time - s.time) / (s.beat * .6), 0, 1) : 0;
  const open = sad ? 0 : Math.max(due, .15) * (1 - chomp);
  const squash = 1 + chomp * .12;
  c.save(); c.translate(x, y); c.scale(squash, 1 / squash);
  circle(c, 3, 3, R, INK); circle(c, 0, 0, R, color); circle(c, 0, 0, R, INK, true, 3);
  const look = next ? (() => { const p = next.type === 'sweep' ? toScreen(next.ticks[0].pos, s.w, s.h) : toScreen(next.pos, s.w, s.h); const a = Math.atan2(p.y - y, p.x - x); return { x: Math.cos(a) * 3, y: Math.sin(a) * 3 }; })() : { x: 0, y: -1 };
  for (const ex of [-R * .36, R * .36]) { circle(c, ex, -R * .3, R * .2, '#fff'); circle(c, ex, -R * .3, R * .2, INK, true, 2); circle(c, ex + look.x, -R * .3 + look.y, R * .1, INK); }
  c.fillStyle = INK;
  if (sad) { c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.arc(0, R * .45, R * .28, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
  else { c.beginPath(); c.ellipse(0, R * .3, R * .42, Math.max(2, R * .4 * open), 0, 0, TAU); c.fill(); }
  c.restore();
  if (s.groove > 1) text(c, `×${s.groove}`, x + R + 20, y - R * .4, 15, INK, 900);
  return { x, y: y + R * .3 };
}

// --- effects ----------------------------------------------------------------------------------
// Gesture style rewards every hit with a full-screen pulse: a shockwave, a burst of rays and a glow on the edges.
function drawPulse(c, s, e, f) {
  const color = TYPES[e.type].color, far = Math.hypot(s.w, s.h), k = ease(f), strong = e.grade === 'perfect' ? 1 : .6;
  c.save();
  const glow = c.createRadialGradient(s.w / 2, s.h / 2, Math.min(s.w, s.h) * .3, s.w / 2, s.h / 2, far * .6);
  glow.addColorStop(0, color + '00'); glow.addColorStop(1, color + '66');
  c.globalAlpha = (1 - f) * strong; c.fillStyle = glow; c.fillRect(0, 0, s.w, s.h);
  c.globalAlpha = (1 - f) * .55 * strong; circle(c, e.x, e.y, 40 + k * far * .55, color, true, 2 + 16 * (1 - f));
  c.globalAlpha = (1 - f) * .35 * strong; circle(c, e.x, e.y, 20 + ease(clamp(f * 1.5, 0, 1)) * far * .3, INK, true, 2 + 6 * (1 - f));
  c.strokeStyle = color; c.lineCap = 'round'; c.lineWidth = 4 * (1 - f) + 1; c.globalAlpha = (1 - f) * .8;
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2 + e.born / 700, r0 = 36 + k * 160, r1 = r0 + 50 * (1 - f) + 6;
    c.beginPath(); c.moveTo(e.x + Math.cos(a) * r0, e.y + Math.sin(a) * r0); c.lineTo(e.x + Math.cos(a) * r1, e.y + Math.sin(a) * r1); c.stroke();
  }
  c.restore();
}
function drawEffects(c, s, mouth, r) {
  if (s.motion) for (const e of s.effects) if (e.pulse) drawPulse(c, s, e, clamp((s.now - e.born) / 900, 0, 1));
  for (const e of s.effects) {
    const age = s.now - e.born, f = clamp(age / 900, 0, 1), color = TYPES[e.type].color;
    if (e.small) { if (e.grade !== 'miss') { circle(c, e.x, e.y, 15 + f * 22, color, true, 3 * (1 - f)); text(c, e.label, e.x, e.y - 24 - f * 20, 12, INK); } continue; }
    if (e.grade === 'miss') {
      const fall = f * f * 140;
      c.save(); c.globalAlpha = 1 - f; if (e.type !== 'sweep') glyph(c, e.type, e.x, e.y + fall, r * .4, INK + '40'); c.restore();
      text(c, e.label, e.x, e.y - r * .7 - f * 10, 15, '#d1245f');
      continue;
    }
    // Hits ring out where they happened, then the food flies into the mouth.
    if (s.motion) { c.save(); c.globalAlpha = (1 - f) * .8; circle(c, e.x, e.y, r * .5 + ease(f) * r * 1.2, color, true, 5 * (1 - f)); c.restore(); }
    const fly = clamp((age - 120) / 420, 0, 1);
    if (fly < 1 && e.type !== 'sweep' && e.type !== 'reach') {
      const k = ease(fly), cx = (e.x + mouth.x) / 2, cy = Math.min(e.y, mouth.y) - 120;
      const x = (1 - k) ** 2 * e.x + 2 * (1 - k) * k * cx + k * k * mouth.x, y = (1 - k) ** 2 * e.y + 2 * (1 - k) * k * cy + k * k * mouth.y;
      glyph(c, e.type, x, y, r * .45 * (1 - k * .7), color);
    }
    c.save(); c.globalAlpha = 1 - f * f;
    text(c, e.label, e.x, e.y - r * .75 - ease(f) * 26, e.grade === 'perfect' ? 18 : 15, e.grade === 'perfect' ? '#ff4f9a' : INK, 900);
    if (e.points) text(c, '+' + e.points, e.x, e.y - r * .75 - ease(f) * 26 + 18, 11, INK);
    c.restore();
  }
}

function drawHands(c, s) {
  for (const [i, p] of s.hands.entries()) {
    if (!p.visible) continue;
    const x = p.x * s.w, y = p.y * s.h;
    if (s.pointerMode) { circle(c, x, y, 10, INK, true, 2.5); circle(c, x, y, 3, INK); continue; }
    const color = p.x < .5 ? '#31d7f0' : '#ff4f9a';
    circle(c, x, y, p.fist ? 13 : 8, color); circle(c, x, y, p.fist ? 13 : 8, INK, true, 2.5); circle(c, x, y, p.fist ? 20 : 26, color, true, 4); circle(c, x, y, (p.fist ? 20 : 26) + 3, INK, true, 1.5);
    if (p.debug) {
      const d = p.debug, state = d.fist ? 'FIST' : d.open ? 'OPEN' : d.armed ? 'ARMED' : '·';
      const lines = [`${state}  closure ${d.closure.toFixed(2)}`, `reach ${d.reach.toFixed(2)}  bend ${Math.round(d.bend)}°`, `raw ${d.rawFist ? 'fist' : '-'} / ${d.open ? 'open' : '-'}`];
      c.fillStyle = '#121426cc'; c.fillRect(x + 30, y - 30, 170, 58);
      lines.forEach((l, i) => text(c, l, x + 115, y - 16 + i * 17, 12, i ? '#fff' : color, 700));
    }
  }
}

export function drawRhythm(c, s) {
  const r = targetRadius(s.w, s.h), P = beatPanelRect(s.w, s.h, s.pointerMode);
  background(c, s);
  const ph = s.phrase, list = [];
  if (s.running) {
    for (const n of s.notes) {
      const fresh = n.state === 'waiting' || n.state === 'holding' || (n.type === 'sweep' && s.time - (n.time + n.duration) < .5);
      if (fresh && (n.phrase === ph?.index || n.state === 'holding') && s.time >= n.callAt) list.push(n);
    }
  }
  sideZones(c, s, list);
  togetherLinks(c, s, list);
  for (const n of list) drawNote(c, n, s, r);
  togetherLinks(c, s, list, true); // tags on top so the shapes never hide them
  const next = list.filter(n => n.state === 'waiting').sort((a, b) => a.time - b.time)[0];
  const lastHit = s.effects.filter(e => !e.small && e.grade !== 'miss').at(-1), lastMiss = s.effects.filter(e => !e.small && e.grade === 'miss').at(-1);
  const landed = lastHit ? s.now - lastHit.born - 540 : -1, chomp = landed >= 0 && landed < 180 ? Math.sin(landed / 180 * Math.PI) : 0;
  const sad = lastMiss && s.now - lastMiss.born < 500 && (!lastHit || lastMiss.born > lastHit.born);
  if (s.running) beatPanel(c, s, P);
  if (!s.running) { drawHands(c, s); return; }
  const mouth = mouthCreature(c, s, P, next, chomp, sad);
  drawEffects(c, s, mouth, r);
  drawHands(c, s);
}
