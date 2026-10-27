// Scoring: every judged moment is one unit (a note, a squeeze release, a sweep dot). A run always
// plays to the end and is settled on its final score; there is no energy bar to fail out on.
// Perfect 100 · Good 50 · Miss 0, multiplied by the GROOVE level your current combo has reached.

export const POINTS = { perfect: 100, good: 50, miss: 0 };
export const GROOVE = [{ combo: 0, mult: 1 }, { combo: 10, mult: 2 }, { combo: 25, mult: 3 }, { combo: 50, mult: 4 }];
export const RANKS = [['S', .95], ['A', .88], ['B', .75], ['C', .6], ['D', 0]];
export const CLEAR_ACCURACY = .6;

export const grooveFor = combo => GROOVE.findLast(g => combo >= g.combo).mult;
export const rankFor = accuracy => RANKS.find(([, min]) => accuracy >= min)[0];

export class Score {
  constructor() {
    this.points = 0; this.combo = 0; this.maxCombo = 0;
    this.counts = { perfect: 0, good: 0, miss: 0 };
    this.byType = {};
    this.deltas = []; // signed timing errors in seconds, for the calibration hint
  }
  get units() { return this.counts.perfect + this.counts.good + this.counts.miss; }
  // A run with nothing judged has no accuracy yet, so it can never rank S.
  get accuracy() { return this.units ? (this.counts.perfect + this.counts.good * .5) / this.units : 0; }
  get groove() { return grooveFor(this.combo); }

  // Returns the points gained so the caller can show them.
  add(grade, type, delta = null) {
    const t = this.byType[type] ??= { perfect: 0, good: 0, miss: 0 };
    this.counts[grade]++; t[grade]++;
    if (grade === 'miss') { this.combo = 0; return 0; }
    this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
    if (delta != null) this.deltas.push(delta);
    const gained = POINTS[grade] * this.groove;
    this.points += gained;
    return gained;
  }

  timingAdvice() {
    if (this.deltas.length < 8) return null;
    const sorted = [...this.deltas].sort((a, b) => a - b), median = sorted[sorted.length >> 1];
    const ms = Math.round(median * 1000);
    return Math.abs(ms) < 35 ? { ms, apply: 0 } : { ms, apply: Math.round(ms / 10) * 10 };
  }

  result() {
    const accuracy = this.accuracy;
    return {
      points: this.points, accuracy, rank: rankFor(accuracy), maxCombo: this.maxCombo, counts: { ...this.counts },
      byType: this.byType, cleared: accuracy >= CLEAR_ACCURACY, advice: this.timingAdvice()
    };
  }
}

// Best results per chart and input, kept in this browser only.
const KEY = 'ftb.best.v1';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
export function bestFor(level, input) { return read()[`${level}:${input}`] || null; }
export function saveBest(level, input, result) {
  const all = read(), key = `${level}:${input}`, old = all[key];
  if (old && old.points >= result.points) return false;
  all[key] = { points: result.points, rank: result.rank, accuracy: result.accuracy };
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {}
  return true;
}
