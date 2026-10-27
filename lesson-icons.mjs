// Animated tutorial icons. Each icon has two frames (.fa then .fb) that swap on every beat, so a
// lesson shows the move itself — open hand then fist, hands apart then together — instead of text.
// Camera lessons show hands; trackpad/keyboard lessons show the key or pointer to use.

const INK = '#1b1530', COLOR = { cyan: '#31d7f0', orange: '#ff9f2e', yellow: '#ffe14a', pink: '#ff4f9a', purple: '#7a5cff', green: '#5fd068' };
const line = `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;

function openHand(x, y, fill = '#fff', s = 1) {
  const fingers = [0, 1, 2, 3].map(i => `<rect x="${-13 + i * 7}" y="-22" width="6" height="19" rx="3" fill="${fill}" ${line}/>`).join('');
  return `<g transform="translate(${x} ${y}) scale(${s})">${fingers}<rect x="-24" y="2" width="6" height="15" rx="3" fill="${fill}" ${line} transform="rotate(-35 -21 9)"/><rect x="-15" y="-6" width="30" height="26" rx="9" fill="${fill}" ${line}/></g>`;
}
function fist(x, y, fill = '#fff', s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-16" y="-12" width="32" height="30" rx="10" fill="${fill}" ${line}/>`
    + `<path d="M-7 -12v8M1 -12v8M9 -12v8" ${line} fill="none"/><rect x="-16" y="3" width="19" height="8" rx="4" fill="${fill}" ${line}/></g>`;
}
const ring = (x, y, r, c, dash = true) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" fill-opacity=".22" stroke="${INK}" stroke-width="2.5" ${dash ? 'stroke-dasharray="5 4"' : ''}/>`;
const arrow = (x1, x2, y, c) => { const d = x2 > x1 ? -7 : 7; return `<path d="M${x1} ${y}H${x2}M${x2 + d} ${y - 6}L${x2} ${y}L${x2 + d} ${y + 6}" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`; };
const key = (x, y, w, label, down, c = '#fff') => `<g transform="translate(0 ${down ? 3 : 0})"><rect x="${x + 3}" y="${y + 3}" width="${w}" height="26" rx="6" fill="${INK}" opacity="${down ? 0 : 1}"/><rect x="${x}" y="${y}" width="${w}" height="26" rx="6" fill="${down ? c : '#fff'}" ${line}/><text x="${x + w / 2}" y="${y + 18}" text-anchor="middle" font-family="DM Mono, monospace" font-size="13" font-weight="500" fill="${INK}">${label}</text></g>`;
const cursor = (x, y) => `<path d="M${x} ${y}l0 20l5 -5l4 9l4 -2l-4 -9l7 0z" fill="#fff" ${line}/>`;
const badge = (x, label, fill, w = 34) => `<rect x="${x - w / 2 + 3}" y="23" width="${w}" height="30" rx="15" fill="${INK}"/><rect x="${x - w / 2}" y="20" width="${w}" height="30" rx="15" fill="${fill}" ${line}/><text x="${x}" y="40" text-anchor="middle" font-family="DM Sans, sans-serif" font-weight="800" font-size="15" fill="${INK}">${label}</text>`;
const frames = (a, b, shared = '') => `<svg viewBox="0 0 96 72" xmlns="http://www.w3.org/2000/svg">${shared}<g class="fa">${a}</g><g class="fb">${b}</g></svg>`;

const CAMERA = {
  listen: () => frames(`<path d="M30 42h-8v-14h8l12-9v32z" fill="#fff" ${line}/><path d="M52 29q6 6 0 14" fill="none" ${line}/>`,
    `<path d="M30 42h-8v-14h8l12-9v32z" fill="#fff" ${line}/><path d="M52 29q6 6 0 14M60 23q12 12 0 26M68 17q18 18 0 38" fill="none" ${line}/>`),
  aim: () => frames(openHand(28, 44) + `<circle cx="28" cy="52" r="4" fill="${INK}"/>`, openHand(64, 34) + `<circle cx="64" cy="42" r="4" fill="${INK}"/>`, ring(64, 40, 20, COLOR.orange)),
  grab: () => frames(openHand(48, 42), fist(48, 40), ring(48, 38, 30, COLOR.cyan)),
  reach: () => frames(openHand(26, 44), openHand(66, 42), ring(66, 38, 22, COLOR.orange)),
  clap: () => frames(openHand(26, 44) + openHand(70, 44),
    openHand(41, 44) + openHand(55, 44) + `<path d="M48 8l3 7 7 0-6 4 2 7-6-4-6 4 2-7-6-4 7 0z" fill="${COLOR.pink}" ${line}/>`),
  squeeze: () => frames(fist(48, 40) + `<rect x="74" y="12" width="10" height="48" rx="3" fill="${COLOR.yellow}" ${line}/>`,
    openHand(48, 42) + `<rect x="74" y="12" width="10" height="48" rx="3" fill="#fff" ${line}/>`),
  flip: () => frames(openHand(26, 44) + arrow(46, 82, 14, COLOR.purple), openHand(70, 44) + `<path d="M30 30h18M26 44h18M30 58h18" stroke="${COLOR.purple}" stroke-width="3" stroke-linecap="round"/>`),
  'flip-left': () => frames(openHand(70, 44) + arrow(50, 14, 14, COLOR.purple), openHand(26, 44) + `<path d="M48 30h18M52 44h18M48 58h18" stroke="${COLOR.purple}" stroke-width="3" stroke-linecap="round"/>`),
  sweep: () => frames(openHand(20, 58, '#fff', .7), openHand(76, 28, '#fff', .7),
    `<path d="M14 62Q40 58 48 40T82 14" fill="none" stroke="${COLOR.green}" stroke-width="5" stroke-dasharray="2 8" stroke-linecap="round"/>` + [[14, 62], [48, 40], [82, 14]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${COLOR.green}" ${line}/>`).join('')),
  // The count 1, 2, 3 with the "&" between 2 and 3 lighting up: the beat badge players see on off-beat notes.
  offbeat: () => frames(badge(20, '2', COLOR.yellow) + badge(48, '&', '#fff', 30) + badge(76, '3', '#fff'), badge(20, '2', '#fff') + badge(48, '2 &', COLOR.orange, 40) + badge(76, '3', '#fff'),
    `<text x="48" y="66" text-anchor="middle" font-family="DM Mono, monospace" font-size="10" fill="${INK}">OFF-BEAT</text>`),
  sides: () => frames(fist(26, 40, COLOR.cyan) + openHand(70, 42, COLOR.pink), openHand(26, 42, COLOR.cyan) + fist(70, 40, COLOR.pink),
    `<path d="M48 6v60" stroke="${INK}" stroke-width="2" stroke-dasharray="4 5"/>`)
};
const KEYS = {
  listen: CAMERA.listen,
  aim: () => frames(cursor(20, 34), cursor(56, 26), ring(64, 38, 20, COLOR.orange)),
  reach: () => frames(cursor(18, 34), cursor(58, 28), ring(66, 38, 20, COLOR.orange)),
  sweep: CAMERA.sweep,
  offbeat: CAMERA.offbeat,
  grab: () => frames(key(34, 24, 28, 'Z', false), key(34, 24, 28, 'Z', true, COLOR.cyan)),
  squeeze: () => frames(key(34, 24, 28, 'Z', true, COLOR.yellow) + `<text x="48" y="66" text-anchor="middle" font-family="DM Mono, monospace" font-size="10" fill="${INK}">HOLD</text>`, key(34, 24, 28, 'Z', false)),
  clap: () => frames(key(14, 24, 68, 'SPACE', false), key(14, 24, 68, 'SPACE', true, COLOR.pink)),
  flip: () => frames(key(34, 24, 28, '→', false), key(34, 24, 28, '→', true, COLOR.purple)),
  'flip-left': () => frames(key(34, 24, 28, '←', false), key(34, 24, 28, '←', true, COLOR.purple)),
  sides: CAMERA.sides
};

export const lessonIcon = (kind, pointer = false) => ((pointer ? KEYS : CAMERA)[kind] || CAMERA.listen)();
