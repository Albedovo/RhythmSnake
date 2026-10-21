import { TYPES, LEVELS, WINDOWS, GESTURE_LAG, HAND, timingGrade, onSide, handFeatures, clapFeatures, cameraPoint, toScreen, targetRadius, sweepRadius, setPlayLayout, segmentCircleInterval } from './rhythm-core.mjs?v=20';
import { buildPhrase, songSource, lintSong, BAR, LEAD_IN } from './rhythm-chart.mjs?v=20';
import { Score, bestFor, saveBest, MAX_ENERGY, GROOVE } from './scoring.mjs?v=20';
import { Tutorial, TUTORIAL_BPM, hintFor, tutorialDone, markTutorialDone } from './tutorial.mjs?v=20';
import * as sound from './audio.mjs?v=20';
import { HandTracks, ClapGesture, responsiveCursor } from './hand-input.mjs?v=20';
import { CameraController } from './camera-controller.mjs?v=20';
import { WorkerHandTracker } from './hand-worker-client.mjs?v=20';
import { drawRhythm } from './rhythm-renderer.mjs?v=20';

const DEBUG = new URLSearchParams(location.search).has('debug');
const $ = id => document.getElementById(id), canvas = $('game'), ctx = canvas.getContext('2d');
let w = 1, h = 1;
function resize() { const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 1.5); w = r.width; h = r.height; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
new ResizeObserver(resize).observe(canvas);
function syncLayout() {
  const rect = canvas.getBoundingClientRect();
  const lesson = $('lesson'), lessonBottom = lesson.hidden ? 0 : lesson.getBoundingClientRect().bottom - rect.top;
  const feedbackBottom = $('feedback').getBoundingClientRect().bottom - rect.top;
  setPlayLayout({ top: Math.max(feedbackBottom, lessonBottom), toolbarTop: document.querySelector('.play-toolbar').getBoundingClientRect().top - rect.top });
}
const layoutObserver = new ResizeObserver(syncLayout);
for (const el of [$('lesson'), document.querySelector('.play-toolbar')]) layoutObserver.observe(el);

// --- run state --------------------------------------------------------------------------------
let running = false, paused = false, pauseAt = 0, startTime = 0, beat = .5, nextStep = 0, scheduler = 0;
let mode = 'song', levelKey = 'normal', level = LEVELS.normal, practice = false;
let source = null, sourceDone = false, phrases = [], notes = [], totalBeats = 0, songPhrases = 0;
let score = new Score(), tutorial = null, effects = [], lessonMessage = null;
let cameraMode = false, cameraBusy = false, inputMode = 'camera', detector = null, cameraHands = [];
let pointer = { x: .5, y: .5, visible: false, handId: 'pad' };
const handTracks = new HandTracks(), clapGesture = new ClapGesture();

// Clocks. `virtual` is only set by the ?debug test harness (FTB.step), so tests can run frame by frame.
let virtual = null;
const audioNow = () => virtual ? virtual.audio : sound.audioTime();
const nowMs = () => virtual ? virtual.ms : performance.now();
const songTime = () => running ? (paused ? pauseAt : audioNow()) - startTime : 0;
const outLatency = () => virtual ? 0 : sound.audioContext()?.outputLatency || 0;
const offset = () => Number($('offset').value) / 1000;
// Clocks: the visual clock follows what is heard; the judge clock also removes the player's calibration.
const visualTime = () => songTime() - outLatency();
const judgeTime = (t = songTime()) => t - outLatency() - offset();
const win = () => cameraMode ? WINDOWS.camera : WINDOWS.pointer;
const lag = type => cameraMode ? GESTURE_LAG[type] || 0 : 0;
const motion = () => $('motion').checked;

// --- phrases ------------------------------------------------------------------------------------
function appendPhrase() {
  const item = source.next();
  if (!item) { sourceDone = true; return false; }
  const start = phrases.length ? phrases.at(-1).end : LEAD_IN;
  const sides = mode === 'tutorial' ? item.options.sides : level.sides;
  const ph = buildPhrase(item.def, start, beat, phrases.length, { ...item.options, sides: cameraMode && sides });
  ph.lesson = item.lesson; ph.demo = !!item.options.demo;
  phrases.push(ph); notes.push(...ph.notes); totalBeats = ph.end;
  return true;
}
// Songs are built up front; the tutorial asks for its next phrase only after the last attempt was scored.
function fillPhrases() {
  if (sourceDone || !running) return;
  if (mode === 'song') { while (appendPhrase()); return; }
  if (!phrases.length || songTime() > phrases.at(-1).endTime - beat * 1.5) appendPhrase();
}
const phraseAt = t => phrases.findLast(p => p.callAt <= t) || null;

// --- music ------------------------------------------------------------------------------------
function scheduleMusic() {
  if (!running || paused) return;
  fillPhrases();
  if (virtual) return;
  const now = sound.audioTime(), half = beat / 2;
  while (startTime + nextStep * half < now + .14) {
    const at = startTime + nextStep * half, t = nextStep * half, step = nextStep;
    nextStep++;
    if (at < now - .02 || step >= totalBeats * 2 + 2) continue;
    const ph = phraseAt(t + 1e-6);
    sound.grooveStep(at, step, ph?.index ?? 0);
    if (!ph) continue;
    const local = Math.round((t - ph.callAt) / half); // eighths since the call bar started
    if (local >= 0 && local < BAR * 2 * (1 + ph.times)) { // call bar + every echo bar, not the rest bar
      if (local % 2 === 0) sound.countVoice((local / 2) % BAR, at, local < BAR * 2 ? 1 : .45);
      if (local < BAR * 2) for (const n of ph.def) if (Math.round(n.beat * 2) === local) sound.callVoice(n.type, at, .8);
      if (local < BAR * 2) for (const n of ph.def) if (n.type === 'squeeze' && Math.round((n.beat + n.dur) * 2) === local) sound.releasePop(at);
    }
    for (const n of ph.notes) {
      if (Math.abs(n.time - t) < 1e-4) sound.answerVoice(n.type, at);
      if (n.tail && Math.abs(n.tail.time - t) < 1e-4) sound.releasePop(at);
      if (n.ticks) for (const k of n.ticks) if (k !== n.ticks[0] && Math.abs(k.time - t) < 1e-4) sound.tickAt(at);
      if (n.state === 'holding' && t > n.time && t < n.tail.time && local % 2 === 0) sound.holdPulse(at);
    }
  }
}
function stopMusic() { clearInterval(scheduler); sound.silence(); }

// --- judgement --------------------------------------------------------------------------------
function feedback(text, tone = 'neutral') { $('feedback').textContent = text; $('feedback').dataset.tone = tone; $('feedback').dataset.until = performance.now() + 900; }
const timingWord = d => Math.abs(d) <= win().perfect ? '' : d < 0 ? ' · EARLY' : ' · LATE';
function notePixel(n, time) {
  const p = n.type === 'sweep' ? (n.ticks.find(k => k.state === 'waiting') || n.ticks.at(-1)).pos : n.pos;
  const s = toScreen(p, w, h); return { x: s.x, y: s.y };
}
function burst(n, grade, label, points = 0, at = null) {
  const p = at || notePixel(n);
  effects.push({ type: n.type, grade, label, points, x: p.x, y: p.y, born: performance.now() });
  effects = effects.slice(-14);
}
function award(n, grade, delta, label = null) {
  const gained = n.demo ? 0 : score.add(grade, n.type, grade === 'miss' ? null : delta);
  if (grade === 'miss') { if (!n.demo) sound.missSound(); }
  else if (!n.demo) sound.confirmSound(grade);
  // The judgement is drawn on the note itself, next to the beat it belongs to.
  burst(n, grade, (label || (grade === 'miss' ? 'MISS' : grade.toUpperCase())) + (grade === 'good' && delta != null ? timingWord(delta) : ''), gained);
  updateHud();
}
function fail(n, reason) {
  n.state = 'miss'; n.reason = reason;
  award(n, 'miss', null, n.type === 'squeeze' && n.tail ? 'MISS' : 'MISS');
  if (n.demo) return;
  if (score.drain() <= 0 && !practice) end('failed');
  const hint = hintFor(reason, n.type);
  if (hint && mode === 'song' && level === LEVELS.easy) feedback('MISS · ' + hint, 'miss');
}

const KIND = { fist: ['grab', 'squeeze'], clap: ['clap'], flip: ['flip'] };
const holdingBy = handId => notes.find(n => n.state === 'holding' && n.owner === handId);
// A discrete gesture from a hand (or the keyboard). Gestures outside any window are ignored, never punished.
function act(kind, point, eventTime, dir = null) {
  if (!running || paused) return false;
  const types = KIND[kind];
  if (kind === 'fist' && holdingBy(point.handId)) return false;
  const base = judgeTime(eventTime), wnd = win().good, radius = targetRadius(w, h);
  const near = notes.filter(n => n.state === 'waiting' && !n.demo && types.includes(n.type) && Math.abs(base - n.time) < .8);
  const events = near.map(n => {
    if (n.type === 'flip' && point.path) return { n, event: flipContact(n, point.path, point.handId) };
    const spatial = n.type === 'clap' || (point.visible && distPx(point, n.pos) <= radius);
    return { n, event: spatial ? { delta: base - lag(n.type) - n.time, point } : null };
  });
  const sideOk = (n, p) => !cameraMode || n.side === 'A' || n.side === 'B' || onSide(n.side, p.x);
  const match = events.filter(({ n, event }) => event && Math.abs(event.delta) <= wnd && sideOk(n, event.point) && (n.type !== 'flip' || n.dir === dir))
    .sort((a, b) => Math.abs(a.event.delta) - Math.abs(b.event.delta))[0];
  if (!match) {
    const n = near.sort((a,b) => Math.abs(base-a.time)-Math.abs(base-b.time))[0];
    if (n) {
      const d = base - lag(n.type) - n.time;
      n.reason = Math.abs(d) > wnd ? (d < 0 ? 'early' : 'late') : !sideOk(n, point) ? 'side' : n.type === 'clap' ? 'none' : 'position';
      if (n.reason === 'position') feedback('MOVE INSIDE THE CIRCLE', 'neutral');
      else if (n.reason === 'side') feedback('OTHER HAND', 'miss');
      else if (n.reason !== 'none') feedback(n.reason.toUpperCase(), 'neutral');
    }
    return false;
  }
  const { n: hit, event } = match, delta = event.delta, grade = timingGrade(delta, cameraMode);
  if (hit.type === 'squeeze') {
    hit.state = 'holding'; hit.owner = point.handId; hit.breakAt = null;
    award(hit, grade, delta, grade === 'perfect' ? 'SQUEEZE!' : 'SQUEEZE');
  } else {
    hit.state = 'hit'; award(hit, grade, delta);
    // A key press only covers additional notes whose circles also contain the pointer.
    if (!cameraMode) for (const n of near) if (n !== hit && n.type === hit.type && Math.abs(n.time - hit.time) < 1e-3 && point.visible && distPx(point, n.pos) <= radius) { n.state = 'hit'; award(n, grade, delta); }
  }
  return true;
}
// Judge the time the moving palm crosses the Flip circle, rather than its starting position.
function flipContact(n, path, handId) {
  const center = toScreen(n.pos, w, h), r = targetRadius(w, h), sign = n.dir === 'left' ? -1 : 1;
  let best = null;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], dt = b.time - a.time;
    if (dt <= 0 || dt > .15 || !a.visible || !b.visible) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    if (dx * sign <= 0 || Math.abs(dx) / dt < .25 || Math.abs(dx * w) < Math.abs(dy * h) * .8) continue;
    const span = segmentCircleInterval({ x:a.x*w, y:a.y*h }, { x:b.x*w, y:b.y*h }, center, r);
    if (!span) continue;
    const t0 = judgeTime(a.time + dt * span[0]), t1 = judgeTime(a.time + dt * span[1]);
    const at = Math.max(t0, Math.min(t1, n.time)), u = (at - judgeTime(a.time)) / dt;
    const event = { delta: at - n.time, point: { x:a.x+dx*u, y:a.y+dy*u, handId, visible:true } };
    if (!best || Math.abs(event.delta) < Math.abs(best.delta)) best = event;
  }
  return best;
}
// Opening the hand ends a squeeze; the release is judged against the squeeze's last beat.
function release(handId, eventTime) {
  const n = holdingBy(handId);
  if (!n || !running) return;
  const d = judgeTime(eventTime) - lag('squeeze') - n.tail.time;
  if (d < -win().good) { n.tail.state = 'miss'; n.state = 'hit'; n.reason = 'release'; n.owner = null; award(n, 'miss', null, 'TOO SOON'); if (score.drain() <= 0 && !practice) end('failed'); return; }
  finishSqueeze(n, timingGrade(d, cameraMode) || 'good', d);
}
function finishSqueeze(n, grade, delta) { n.tail.state = grade; n.state = 'hit'; n.owner = null; n.releasedAt = performance.now(); award(n, grade, delta, grade === 'perfect' ? 'RELEASE!' : 'RELEASE'); }

function livePoints(now) {
  if (!cameraMode) return pointer.visible ? [{ ...pointer, age: 0 }] : [];
  return cameraHands.filter(hd => hd.visible && now - hd.seen < 350).map(hd => ({ ...handPoint(hd), age: (now - hd.seen) / 1000 }));
}
const distPx = (p, pos) => { const s = toScreen(pos, w, h); return Math.hypot(p.x * w - s.x, p.y * h - s.y); };

// Position notes (reach, sweep dots) are judged from where the hands are, every frame.
function gameTick() {
  const jt = judgeTime(), now = nowMs(), pts = livePoints(now), wnd = win(), r = targetRadius(w, h);
  for (const n of notes) {
    if (!running) return;
    if (n.demo) { autoplay(n, jt); continue; }
    if (n.type === 'reach' && n.state === 'waiting') tickReach(n, jt, pts, r, wnd);
    if (n.type === 'sweep' && n.state === 'waiting') tickSweep(n, jt, pts, r, wnd);
    if (n.state === 'waiting' && (n.type === 'grab' || n.type === 'squeeze' || n.type === 'clap' || n.type === 'flip') && jt > n.time + wnd.good) fail(n, n.reason || 'none');
    if (n.state === 'holding') {
      const owner = cameraMode ? cameraHands.find(hd => hd.id === n.owner && now - hd.seen < 350) : null;
      const valid = cameraMode ? !!owner?.fist : !!padHeld[n.owner];
      if (!valid) { n.breakAt ??= now; if (now - n.breakAt > (cameraMode ? 400 : 80)) { if (jt >= n.tail.time - wnd.good) finishSqueeze(n, 'good', null); else release(n.owner, songTime()); } }
      else n.breakAt = null;
      if (n.state === 'holding' && jt > n.tail.time + wnd.good) finishSqueeze(n, 'good', null); // held past the end: still counts
    }
  }
  settlePhrases();
  if (running && sourceDone && songTime() > totalBeats * beat + .3) end(mode === 'tutorial' ? 'tutorial' : 'finished');
}

function tickReach(n, jt, pts, r, wnd) {
  if (jt < n.time - wnd.good - .6) return;
  for (const p of pts) {
    const st = jt - p.age - lag('reach');
    if (!p.visible) continue;
    if (distPx(p, n.pos) > r || st < n.time - wnd.good) continue;
    n.state = 'hit';
    award(n, 'perfect', null);
    return;
  }
  if (jt > n.time + wnd.good) fail(n, n.reason || 'none');
}

function tickSweep(n, jt, pts, r, wnd) {
  const eligible = pts.filter(p => !cameraMode || n.side === 'B' || n.side === 'A' || onSide(n.side, p.x));
  for (const k of n.ticks) {
    if (k.state !== 'waiting' || jt < k.time - wnd.good) continue;
    for (const p of eligible) {
      const st = jt - p.age - lag('sweep');
      if (!p.visible || distPx(p, k.pos) > sweepRadius(w, h)) continue;
      if (st >= k.time - wnd.good) { k.state = 'perfect'; break; }
    }
    if (k.state === 'waiting' && jt > k.time + wnd.good) k.state = 'miss';
    if (k.state !== 'waiting') {
      const gained = score.add(k.state, 'sweep', null);
      if (k.state !== 'miss') sound.confirmSound(k.state);
      effects.push({ type: 'sweep', grade: k.state, label: k.state === 'miss' ? '' : '+' + gained, points: gained, ...pxOf(k.pos), born: performance.now(), small: true });
      updateHud();
    }
  }
  if (n.ticks.every(k => k.state !== 'waiting')) {
    const ok = n.ticks.filter(k => k.state !== 'miss').length / n.ticks.length;
    if (ok >= .5) { n.state = 'hit'; burst(n, 'perfect', ok === 1 ? 'CLEAN SWEEP' : 'SWEEP', 0, pxOf(n.ticks.at(-1).pos)); }
    else { n.state = 'miss'; n.reason = 'none'; burst(n, 'miss', 'SWEEP LOST', 0, pxOf(n.ticks.at(-1).pos)); if (score.drain() <= 0 && !practice) end('failed'); updateHud(); }
  }
}
const pxOf = pos => toScreen(pos, w, h);

// Demonstration notes play themselves so a new player can see what a correct echo looks like.
function autoplay(n, jt) {
  if (n.state === 'waiting' && jt >= n.time) { if (n.type === 'squeeze') { n.state = 'holding'; n.owner = 'demo'; } else n.state = 'hit'; burst(n, 'perfect', 'LIKE THIS'); n.ticks?.forEach(k => k.state = 'perfect'); }
  if (n.state === 'holding' && jt >= n.tail.time) { n.state = 'hit'; n.tail.state = 'perfect'; n.owner = null; burst(n, 'perfect', 'RELEASE'); }
}

const settled = n => (n.state === 'hit' || n.state === 'miss') && (!n.tail || n.tail.state !== 'waiting') && (!n.ticks || n.ticks.every(k => k.state !== 'waiting'));
function settlePhrases() {
  for (const ph of phrases) {
    if (ph.reported || !ph.notes.every(settled)) continue;
    ph.reported = true;
    const failed = ph.notes.find(n => n.state === 'miss' || n.tail?.state === 'miss');
    if (mode !== 'tutorial') continue;
    const res = tutorial.report(ph.lesson, ph.demo || !failed, failed?.reason, failed?.type, ph.demo);
    if (!res) continue;
    lessonMessage = { ...res, until: performance.now() + beat * 4000 };
    if (res.kind === 'pass' || res.kind === 'advance' || res.kind === 'finish') sound.chime();
    updateLesson();
  }
}

// --- run lifecycle ----------------------------------------------------------------------------
async function start({ isPractice = false, isTutorial = false } = {}) {
  if (cameraBusy) { $('camera-status').textContent = 'Camera is connecting. Please wait.'; return; }
  if (inputMode === 'camera' && !cameraMode) { await connectCamera(); if (!cameraMode) return; }
  try { await sound.initAudio($('sound').checked); } catch { feedback('Click again to enable audio.'); return; }
  stopMusic();
  mode = isTutorial ? 'tutorial' : 'song'; levelKey = $('difficulty').value; level = LEVELS[levelKey] || LEVELS.normal;
  practice = isPractice || isTutorial;
  beat = 60 / (isTutorial ? TUTORIAL_BPM : Number($('bpm').value));
  tutorial = isTutorial ? new Tutorial({ camera: cameraMode }) : null;
  source = isTutorial ? tutorial : songSource(levelKey, Number($('bpm').value));
  songPhrases = isTutorial ? 0 : source.total;
  score = new Score({ practice }); phrases = []; notes = []; sourceDone = false; totalBeats = LEAD_IN + BAR * 2; effects = []; lessonMessage = null;
  resetInputs();
  running = true; paused = false; startTime = audioNow() + .4; nextStep = 0;
  fillPhrases();
  for (const id of ['overlay', 'summary', 'help-panel', 'settings-panel']) $(id).hidden = true;
  for (const id of ['difficulty', 'bpm', 'offset', 'input-mode']) $(id).disabled = true;
  $('stop').disabled = false; document.body.classList.add('playing'); document.body.classList.toggle('tutorial', isTutorial);
  scheduleMusic(); scheduler = setInterval(scheduleMusic, 25); canvas.focus(); updateHud(); updateLesson();
  feedback(isTutorial ? 'LISTEN TO THE CALL' : 'LISTEN · THEN ECHO');
}

function end(reason = 'finished') {
  if (!running) return;
  running = false; paused = false; stopMusic(); padHeld = {};
  document.body.classList.remove('playing', 'tutorial');
  for (const id of ['difficulty', 'bpm', 'offset', 'input-mode']) $(id).disabled = false;
  $('stop').disabled = true;
  $('overlay').hidden = false; document.querySelector('.intro-content').hidden = true; $('summary').hidden = false;
  if (reason === 'tutorial' || mode === 'tutorial') return showTutorialEnd(reason);
  showSummary(reason);
}

function showTutorialEnd(reason) {
  const complete = tutorial?.finished;
  if (complete) markTutorialDone();
  $('summary').innerHTML = `<p class="eyebrow">${complete ? 'TUTORIAL COMPLETE' : 'TUTORIAL PAUSED'}</p>
    <h1>${complete ? 'You know every move.' : 'Come back any time.'}</h1>
    <p class="summary-lead">${complete ? 'Start with INTRO: one move per bar, any hand, with guide clicks.' : 'Lessons left: ' + (tutorial ? tutorial.lessons.length - tutorial.index : 0)}</p>
    <div class="summary-actions"><button class="start-button" data-go="intro">Play INTRO <span>↗</span></button><button class="practice-button" data-go="menu">Menu</button></div>`;
  bindSummaryButtons();
  refreshLaunch();
}

const TYPE_ORDER = ['grab', 'reach', 'squeeze', 'clap', 'flip', 'sweep'];
function showSummary(reason) {
  const r = score.result(), input = cameraMode ? 'camera' : 'pointer';
  const isBest = !practice && reason === 'finished' && saveBest(levelKey, input, r);
  const title = practice ? 'Practice run' : reason === 'stopped' ? 'Run ended' : reason === 'failed' ? 'Out of energy' : r.cleared ? 'Track cleared' : 'Not quite';
  const bars = TYPE_ORDER.filter(t => r.byType[t]).map(t => {
    const c = r.byType[t], total = c.perfect + c.good + c.miss, acc = (c.perfect + c.good * .5) / total;
    return `<div class="type-row" data-type="${t}"><span>${TYPES[t].label}</span><i style="--v:${Math.round(acc * 100)}%"></i><b>${Math.round(acc * 100)}%</b></div>`;
  }).join('');
  const advice = r.advice && r.advice.apply ? `<div class="advice"><p>Your moves landed <b>${Math.abs(r.advice.ms)} ms ${r.advice.ms > 0 ? 'late' : 'early'}</b> on average.</p><button class="pill-button" id="apply-offset" data-ms="${r.advice.apply}">Apply ${r.advice.apply > 0 ? '+' : ''}${r.advice.apply} ms calibration</button></div>`
    : r.advice ? `<div class="advice"><p>Timing is centred (${r.advice.ms >= 0 ? '+' : ''}${r.advice.ms} ms). Calibration looks right.</p></div>` : '';
  $('summary').innerHTML = `<p class="eyebrow">${levelKey === 'easy' ? 'INTRO' : level.name} · ${title.toUpperCase()}${isBest ? ' · NEW BEST' : ''}</p>
    <div class="result-head"><div class="rank" data-rank="${r.rank}">${r.rank}</div><div><div class="result-score">${String(r.points).padStart(6, '0')}</div>
    <p class="summary-lead">Accuracy ${(r.accuracy * 100).toFixed(1)}% · Best combo ${r.maxCombo}${r.cleared ? '' : ' · clear needs 60% and energy left'}</p></div></div>
    <div class="judge-row"><span>PERFECT <b>${r.counts.perfect}</b></span><span>GOOD <b>${r.counts.good}</b></span><span>MISS <b>${r.counts.miss}</b></span></div>
    <div class="type-bars">${bars}</div>${advice}
    <div class="summary-actions"><button class="start-button" data-go="again">Play again <span>↗</span></button><button class="practice-button" data-go="menu">Menu</button></div>`;
  bindSummaryButtons();
  refreshLaunch();
}

function bindSummaryButtons() {
  for (const b of $('summary').querySelectorAll('[data-go]')) b.onclick = () => {
    if (b.dataset.go === 'again') start({ isPractice: practice });
    if (b.dataset.go === 'intro') { $('difficulty').value = 'easy'; setDifficulty(); start(); }
    if (b.dataset.go === 'menu') { $('summary').hidden = true; document.querySelector('.intro-content').hidden = false; }
  };
  const apply = $('apply-offset');
  if (apply) apply.onclick = () => { const v = Math.max(-200, Math.min(200, Number($('offset').value) + Number(apply.dataset.ms))); $('offset').value = v; $('offset-value').textContent = v + ' ms'; saveOffset(); apply.textContent = `Calibration set to ${v} ms`; apply.disabled = true; };
}

// --- HUD / lesson ----------------------------------------------------------------------------
function updateHud() {
  $('score').textContent = String(score.points).padStart(6, '0');
  $('combo').textContent = score.combo;
  $('groove').textContent = '×' + score.groove; $('groove').dataset.level = score.groove;
  $('accuracy').textContent = score.units ? (score.accuracy * 100).toFixed(1) + '%' : '—';
  $('energy').textContent = practice ? (mode === 'tutorial' ? 'TUTORIAL' : 'PRACTICE') : '▪'.repeat(score.energy) + '▫'.repeat(MAX_ENERGY - score.energy);
  const ph = phraseAt(visualTime());
  $('progress').textContent = mode === 'tutorial' ? `LESSON ${Math.min(tutorial.index + 1, tutorial.lessons.length)} / ${tutorial.lessons.length}` : `PHRASE ${Math.min(songPhrases, (ph?.index ?? -1) + 1)} / ${songPhrases}`;
}
function updateLesson() {
  const box = $('lesson');
  if (mode !== 'tutorial' || !tutorial || tutorial.finished) { box.hidden = true; return; }
  const l = tutorial.lesson; box.hidden = false;
  $('lesson-step').textContent = `LESSON ${tutorial.index + 1} / ${tutorial.lessons.length}`;
  $('lesson-title').textContent = l.title;
  if (box.dataset.lesson !== l.id) {
    box.dataset.lesson = l.id;
    $('lesson-text').textContent = l.text;
    const steps = !cameraMode && l.keys ? l.keys : l.steps;
    $('lesson-steps').replaceChildren(...steps.map(step => { const li = document.createElement('li'); li.textContent = step; return li; }));
  }
  const ph = phraseAt(visualTime()), elapsed = ph ? (visualTime() - ph.callAt) / beat : -1;
  const phase = elapsed < 0 || ph?.lesson !== tutorial.index ? 'GET READY' : elapsed < 4 ? 'LISTEN · WATCH' : elapsed < 4 * (1 + ph.times) ? (ph.demo ? 'DEMO · WATCH' : 'YOUR TURN') : 'REST · READ THE TIPS';
  $('lesson-phase').textContent = phase;
  $('lesson-phase').dataset.active = phase === 'YOUR TURN';
  $('lesson-dots').innerHTML = Array.from({ length: l.need }, (_, i) => `<i class="${i < tutorial.passes ? 'on' : ''}"></i>`).join('');
  const m = lessonMessage && performance.now() < lessonMessage.until ? lessonMessage : null;
  $('lesson-note').textContent = m ? m.text : '';
  $('lesson-note').dataset.kind = m?.kind || '';
  $('lesson-skip').textContent = m?.offerSkip ? 'Skip this lesson' : 'Skip';
}

function resetInputs() { handTracks.reset(); clapGesture.reset(); cameraHands = []; padHeld = {}; }

// --- pointer / keyboard -----------------------------------------------------------------------
// Two keyboard "hands": Z / click and X, so one can squeeze while the other grabs.
let padHeld = {};
function padFist(id = 'pad') { if (cameraMode || padHeld[id]) return; padHeld[id] = true; act('fist', { ...pointer, handId: id }, songTime()); }
function padRelease(id = 'pad') { if (!padHeld[id]) return; padHeld[id] = false; release(id, songTime()); }
canvas.addEventListener('pointermove', e => { if (cameraMode) return; const r = canvas.getBoundingClientRect(); pointer = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, visible: true, handId: 'pad' }; });
// Keep the last pointer target visible when using the toolbar or keyboard.
canvas.tabIndex = 0;
canvas.addEventListener('pointerdown', e => {
  if (cameraMode) return; e.preventDefault(); canvas.focus(); canvas.setPointerCapture(e.pointerId);
  const r = canvas.getBoundingClientRect(); pointer = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, visible: true, handId: 'pad' };
  padFist();
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(ev, () => padRelease());
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  if (e.code === 'Escape') { panel('settings-panel', false); panel('help-panel', false); return; }
  if (e.repeat || cameraMode || ['INPUT', 'SELECT', 'BUTTON'].includes(e.target.tagName)) return;
  if (e.code === 'KeyZ') { e.preventDefault(); padFist(); }
  if (e.code === 'KeyX') { e.preventDefault(); padFist('pad2'); }
  if (e.code === 'Space') { e.preventDefault(); act('clap', pointer, songTime()); }
  if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { e.preventDefault(); act('flip', pointer, songTime(), e.code === 'ArrowLeft' ? 'left' : 'right'); }
});
document.addEventListener('keyup', e => { if (e.code === 'KeyZ') padRelease(); if (e.code === 'KeyX') padRelease('pad2'); });
$('action-grab').addEventListener('pointerdown', e => { if (cameraMode) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); padFist(); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) $('action-grab').addEventListener(ev, () => padRelease());
$('action-clap').addEventListener('pointerdown', e => { e.preventDefault(); if (!cameraMode) act('clap', pointer, songTime()); });
$('action-left').addEventListener('pointerdown', e => { e.preventDefault(); if (!cameraMode) act('flip', pointer, songTime(), 'left'); });
$('action-right').addEventListener('pointerdown', e => { e.preventDefault(); if (!cameraMode) act('flip', pointer, songTime(), 'right'); });

// --- camera -----------------------------------------------------------------------------------
const camera = new CameraController({ video: $('video'), preview: $('camera-preview'), loadDetector: () => WorkerHandTracker.create(), onStatus: (stage, text) => {
  $('status').textContent = $('camera-status').textContent = text; $('status').dataset.stage = stage;
  const live = ['video', 'model', 'ready'].includes(stage);
  document.body.classList.toggle('camera-active', live); $('video').style.display = live ? 'block' : 'none'; $('camera-preview').hidden = !live;
} });
function stopCamera() {
  camera.stop(); cameraMode = cameraBusy = false; inputMode = 'pointer'; $('input-mode').value = 'pointer';
  $('camera').disabled = false; $('cancel-camera').hidden = true; $('video').style.display = 'none'; document.body.classList.remove('camera-active'); resetInputs();
  $('mode').textContent = '● TRACKPAD / KEYS'; $('gesture').textContent = 'MOVE · CLICK/Z · SPACE · ← →';
  $('camera-status').textContent = 'Trackpad ready. Move into rings for Reach and Sweep; Z or click = Grab (hold for Squeeze), X = Grab with the other hand, Space = Clap, ← → = Flip inside its circle.';
  document.body.classList.add('pointer-mode'); refreshLaunch();
}
async function connectCamera() {
  inputMode = 'camera'; $('input-mode').value = 'camera'; cameraBusy = true; pause(); $('camera').disabled = true; $('cancel-camera').hidden = false;
  try {
    const result = await camera.start($('camera-device').value); if (!result) return;
    detector = result.detector; cameraMode = true; resetInputs(); detector.start($('video'));
    $('mode').textContent = '● CAMERA / TWO HANDS'; $('camera').textContent = 'Reconnect camera'; document.body.classList.remove('pointer-mode');
    const selected = $('camera-device').value; $('camera-device').replaceChildren(new Option('Default camera', ''));
    for (const d of result.devices) $('camera-device').add(new Option(d.label || 'Camera', d.deviceId));
    $('camera-device').value = selected;
  } catch { cameraMode = false; $('mode').textContent = '● CAMERA UNAVAILABLE'; }
  finally { cameraBusy = false; $('camera').disabled = false; $('cancel-camera').hidden = true; refreshLaunch(); resume(); }
}
function handPoint(hand) { const v = $('video'), p = cameraPoint(hand, w, h, v.videoWidth || 640, v.videoHeight || 480); return { ...p, visible: p.visible && hand.visible, handId: hand.id, fist: hand.fist, closure: hand.closure, debug: DEBUG ? hand : null }; }

// Fist needs an open hand first (armed); opening past HAND.releaseAt counts as a release.
function fistGesture(hand, time) {
  if (hand.open) hand.armed = true;
  if (!hand.fist && hand.armed && hand.rawFist) { hand.fist = true; hand.armed = false; act('fist', handPoint(hand), time); }
  else if (hand.fist && hand.closure < HAND.releaseAt) { hand.fist = false; release(hand.id, time); }
}
function track(now) {
  if (!cameraMode || !detector) return;
  const packet = detector.takeResult(); if (!packet || now - packet.timestamp > 350) return;
  const { result, timestamp } = packet, time = songTime() - (now - timestamp) / 1000, v = $('video');
  const aspect = (v.videoWidth || 640) / (v.videoHeight || 480), features = result.landmarks.map((p, i) => handFeatures(p, result.worldLandmarks?.[i], aspect));
  const live = handTracks.update(features.map(f => ({ ...f, visible: true })), timestamp); cameraHands = handTracks.hands;
  for (const hand of live) {
    fistGesture(hand, time);
    // Swipes only need a hand that is not a fist: fast flips blur the fingers, so "fully open" drops frames.
    if (hand.closure < HAND.fistAt) {
      hand.history.push({ ...handPoint(hand), at: timestamp, time });
      hand.history = hand.history.filter(p => timestamp - p.at <= 160);
      const origin = hand.history[0];
      if (origin && timestamp - origin.at >= 16) {
        const dx = handPoint(hand).x - origin.x;
        if (Math.abs(dx) > .025 && timestamp - hand.lastSwipe > 180 && act('flip', { ...handPoint(hand), path: hand.history }, time, dx > 0 ? 'right' : 'left')) {
          hand.lastSwipe = timestamp; hand.history = [];
        }
      }
    } else hand.history = [];
  }
  const pairHands = [...live].sort((a,b) => a.id-b.id);
  const pair = pairHands.length === 2 ? clapFeatures(pairHands[0], pairHands[1]) : null;
  const contact = clapGesture.update(pair, timestamp);
  if (contact != null) act('clap', { x: .5, y: .5, visible: true, handId: 'clap' }, time + (contact - timestamp) / 1000);
  const text = live.length ? `${live.length} HAND${live.length > 1 ? 'S' : ''} · ` + live.map(hd => hd.fist ? 'FIST' : hd.open ? 'OPEN' : '…').join(' / ') : 'Show your hands to the camera';
  if ($('gesture').textContent !== text) $('gesture').textContent = text;
  if (detector.error) feedback('Tracking interrupted. Reconnect camera.');
}

// --- panels & settings ------------------------------------------------------------------------
function pause() { if (!running || paused || virtual) return; pauseAt = sound.audioTime(); paused = true; stopMusic(); feedback('PAUSED · CLOSE PANEL TO RESUME'); }
function resume() {
  if (!running || !paused || !$('settings-panel').hidden || !$('help-panel').hidden || cameraBusy || document.hidden) return;
  startTime += sound.audioTime() - pauseAt; paused = false; nextStep = Math.ceil(songTime() / (beat / 2));
  for (const n of notes) if (n.state === 'holding') n.breakAt = null;
  scheduleMusic(); scheduler = setInterval(scheduleMusic, 25);
}
function panel(id, show) { if (show) { pause(); $(id).hidden = false; } else { $(id).hidden = true; resume(); } }
function setDifficulty() { const l = LEVELS[$('difficulty').value] || LEVELS.normal; $('bpm').value = l.bpm; refreshLaunch(); }
function refreshLaunch() {
  const l = LEVELS[$('difficulty').value] || LEVELS.normal, best = bestFor($('difficulty').value, inputMode === 'camera' ? 'camera' : 'pointer');
  $('difficulty-description').textContent = l.description + (best ? ` · BEST ${best.rank} ${String(best.points).padStart(6, '0')}` : '');
  const fresh = !tutorialDone();
  document.body.classList.toggle('first-run', fresh);
}
const OFFSET_KEY = 'ftb.offset';
function saveOffset() { try { localStorage.setItem(OFFSET_KEY, $('offset').value); } catch {} }
try { const v = localStorage.getItem(OFFSET_KEY); if (v != null) { $('offset').value = v; $('offset-value').textContent = v + ' ms'; } } catch {}

$('difficulty').onchange = setDifficulty;
$('input-mode').onchange = () => { $('input-mode').value === 'camera' ? connectCamera() : stopCamera(); };
$('start').onclick = () => start();
$('practice').onclick = () => start({ isPractice: true });
$('tutorial-start').onclick = () => start({ isTutorial: true });
$('stop').onclick = () => end('stopped');
$('lesson-skip').onclick = () => { if (!tutorial) return; const res = tutorial.advance(); lessonMessage = { ...res, until: performance.now() + 2500 }; updateLesson(); };
$('camera').onclick = connectCamera; $('pointer').onclick = () => { stopCamera(); resume(); }; $('cancel-camera').onclick = stopCamera;
$('help').onclick = () => panel('help-panel', true); $('close-help').onclick = () => panel('help-panel', false);
$('settings').onclick = () => panel('settings-panel', true); $('close-settings').onclick = () => panel('settings-panel', false);
$('offset').oninput = () => { $('offset-value').textContent = $('offset').value + ' ms'; saveOffset(); };
$('sound').onchange = () => sound.setVolume($('sound').checked);
$('fullscreen').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.querySelector('.game-shell').requestFullscreen();
document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume());
window.addEventListener('blur', pause); window.addEventListener('focus', resume);
window.addEventListener('pagehide', () => { sound.silence(); camera.stop(); });

// --- frame loop -------------------------------------------------------------------------------
let lastUi = 0;
function draw(now) {
  requestAnimationFrame(draw);
  syncLayout();
  if (!virtual) { track(now); if (running && !paused) gameTick(); }
  effects = effects.filter(e => now - e.born < 900);
  const vt = visualTime(), ph = running ? phraseAt(vt) : null;
  const hands = cameraMode ? cameraHands.filter(p => now - p.seen < 350).map(hd => handPoint(responsiveCursor(hd, now, $('cursor-response').checked))) : [pointer];
  drawRhythm(ctx, {
    w, h, time: vt, judgeOffset: offset(), now, beat, effects, notes, phrase: ph, nextPhrase: ph ? phrases[ph.index + 1] : null,
    running, motion: motion(), hands, cameraMode, groove: score.groove, combo: score.combo, sidesOn: cameraMode && (mode === 'tutorial' ? !!tutorial?.lesson?.sides : level.sides),
    videoReady: camera.stream && $('video').readyState >= 2, pointerMode: !cameraMode, leadIn: LEAD_IN * beat
  });
  if (now - lastUi > 100) {
    lastUi = now;
    if (running) { updateHud(); if (mode === 'tutorial') updateLesson(); }
    if (performance.now() > Number($('feedback').dataset.until || 0) && running) { $('feedback').textContent = ''; }
    if (cameraMode && detector) $('tracking-details').textContent = `Camera ${Math.round(detector.cameraFps || 0)} FPS · Tracking ${Math.round(detector.fps || 0)} FPS · ${Math.round(detector.lastMs || 0)} ms · ${detector.backend || 'CPU'}`;
  }
}

for (const key of Object.keys(LEVELS)) { const problems = lintSong(key, LEVELS[key].bpm); if (problems.length) console.warn('Chart lint:', problems); }
setDifficulty(); updateHud(); requestAnimationFrame(draw);
window.addEventListener('load', () => { if (inputMode === 'camera' && !cameraBusy && !cameraMode) connectCamera(); }, { once: true });
// Exposed for debugging in the console.
window.FTB = { get notes() { return notes; }, get score() { return score; }, get phrases() { return phrases; }, act, release, songTime, judgeTime, HAND };
// ?debug only: feed synthetic landmarks through the real camera pipeline (used to test two-hand moves).
if (DEBUG) Object.defineProperty(window.FTB, 'hands', { get: () => cameraHands });
if (DEBUG) Object.assign(window.FTB, {
  // Advance a virtual clock by dt ms and run one input + judgement frame.
  step(dt = 33) { virtual ??= { audio: sound.audioTime(), ms: performance.now() }; virtual.audio += dt / 1000; virtual.ms += dt; track(virtual.ms); if (running && !paused) gameTick(); },
  nowMs, useVirtualClock() { virtual = { audio: sound.audioTime(), ms: performance.now() }; }
});
if (DEBUG) window.FTB.fakeCamera = fake => { detector = fake; cameraMode = true; inputMode = 'camera'; $('input-mode').value = 'camera'; document.body.classList.remove('pointer-mode'); };
