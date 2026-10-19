// Scoring: every judged moment is one unit (a note, a squeeze release, a sweep dot).
// Perfect 100 · Good 50 · Miss 0, multiplied by the GROOVE level your current combo has reached.

export const POINTS = { perfect: 100, good: 50, miss: 0 };
export const GROOVE = [{ combo: 0, mult: 1 }, { combo: 10, mult: 2 }, { combo: 25, mult: 3 }, { combo: 50, mult: 4 }];
export const RANKS = [['S', .95], ['A', .88], ['B', .75], ['C', .6], ['D', 0]];
export const CLEAR_ACCURACY = .6;
export const MAX_ENERGY = 5;
export const ENERGY_REFILL_COMBO = 16;

export const grooveFor = combo => GROOVE.findLast(g => combo >= g.combo).mult;
export const rankFor = accuracy => RANKS.find(([, min]) => accuracy >= min)[0];

export class Score {
  constructor({ practice = false } = {}) {
    this.practice = practice;
    this.points = 0; this.combo = 0; this.maxCombo = 0;
    this.counts = { perfect: 0, good: 0, miss: 0 };
    this.byType = {};
    this.deltas = []; // signed timing errors in seconds, for the calibration hint
    this.energy = MAX_ENERGY;
  }
  get units() { return this.counts.perfect + this.counts.good + this.counts.miss; }
  get accuracy() { return this.units ? (this.counts.perfect + this.counts.good * .5) / this.units : 1; }
  get groove() { return grooveFor(this.combo); }

  // Returns the points gained so the caller can show them.
  add(grade, type, delta = null) {
    const t = this.byType[type] ??= { perfect: 0, good: 0, miss: 0 };
    this.counts[grade]++; t[grade]++;
    if (grade === 'miss') { this.combo = 0; return 0; }
    this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
    if (delta != null) this.deltas.push(delta);
    if (this.combo % ENERGY_REFILL_COMBO === 0) this.energy = Math.min(MAX_ENERGY, this.energy + 1);
    const gained = POINTS[grade] * this.groove;
    this.points += gained;
    return gained;
  }
  // Energy drops once per failed note, not per missed unit, so a broken sweep costs one, not four.
  drain() { if (!this.practice) this.energy = Math.max(0, this.energy - 1); return this.energy; }

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
      byType: this.byType, cleared: this.practice || (this.energy > 0 && accuracy >= CLEAR_ACCURACY), energy: this.energy, advice: this.timingAdvice()
    };
  }
}

// Best results per level and input, kept in this browser only.
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
