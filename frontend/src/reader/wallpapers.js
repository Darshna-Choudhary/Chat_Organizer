// Wallpaper scenes, drawn as SVG so they work offline and look the same everywhere. Each is a 1600x1000 picture
// used with background-size: cover. Generated with a fixed seed, so a scene always looks the same.
const W = 1600;
const H = 1000;

function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const n1 = (n) => Math.round(n * 10) / 10;
const pick = (r, list) => list[Math.floor(r() * list.length)];
const wrap = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;
const blur = (id, sd) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
const stops = (list) => list.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
const vgrad = (id, list) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops(list)}</linearGradient>`;
const rgrad = (id, cx, cy, r, list) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">${stops(list)}</radialGradient>`;

function starry() {
  const r = rng(7);
  let stars = '';
  let glints = '';
  for (let i = 0; i < 190; i++) {
    const big = r() > 0.82;
    stars += `<circle cx="${n1(r() * W)}" cy="${n1(r() * H * 0.94)}" r="${n1(big ? 1.2 + r() * 1.1 : 0.45 + r() * 0.8)}" fill="#fff" opacity="${n1((0.25 + r() * 0.6) * 100) / 100}"/>`;
  }
  for (let i = 0; i < 16; i++) {
    const x = n1(r() * W);
    const y = n1(r() * H * 0.8);
    glints += `<circle cx="${x}" cy="${y}" r="${n1(2 + r() * 2)}" fill="#dfe6ff" opacity=".85"/>`;
  }
  const defs = vgrad('sky', [[0, '#0a0f2c'], [0.55, '#151b4b'], [1, '#2a2763']]) + rgrad('halo', 1340, 170, 420, [[0, '#cfd8ff', 0.34], [0.35, '#9fb0ff', 0.12], [1, '#9fb0ff', 0]]) + blur('soft', 2.2) + blur('band', 46) + blur('moon', 3);
  const body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>` +
    `<ellipse cx="760" cy="430" rx="900" ry="120" transform="rotate(-24 760 430)" fill="#8e9cff" opacity=".08" filter="url(#band)"/>` +
    `<circle cx="1340" cy="170" r="420" fill="url(#halo)"/><circle cx="1340" cy="170" r="30" fill="#f6f2e0" opacity=".93" filter="url(#moon)"/>` +
    stars + `<g filter="url(#soft)">${glints}</g>` + glints;
  return wrap(defs, body);
}

function fireflies() {
  const r = rng(11);
  let blades = '';
  for (let i = 0; i < 130; i++) {
    const x = n1(r() * W);
    const h = 70 + r() * 210;
    const lean = (r() - 0.5) * 90;
    blades += `<path d="M${x} ${H} Q${n1(x + lean * 0.3)} ${n1(H - h * 0.55)} ${n1(x + lean)} ${n1(H - h)}" stroke="#061511" stroke-opacity="${n1(0.4 + r() * 0.5) }" stroke-width="${n1(2 + r() * 4)}" stroke-linecap="round" fill="none"/>`;
  }
  let flies = '';
  for (let i = 0; i < 52; i++) {
    const x = n1(r() * W);
    const y = n1(150 + r() * 780);
    const s = 5 + r() * 15;
    flies += `<circle cx="${x}" cy="${y}" r="${n1(s * 3.2)}" fill="url(#fly)" opacity="${n1(0.35 + r() * 0.6)}"/><circle cx="${x}" cy="${y}" r="${n1(0.9 + s * 0.09)}" fill="#fffbd0"/>`;
  }
  const defs = vgrad('sky', [[0, '#09171a'], [0.6, '#0f2c2d'], [1, '#12332f']]) + `<radialGradient id="fly"><stop offset="0" stop-color="#fff3a6" stop-opacity=".95"/><stop offset=".35" stop-color="#f6e27a" stop-opacity=".35"/><stop offset="1" stop-color="#f6e27a" stop-opacity="0"/></radialGradient>` + blur('haze', 48);
  const body = `<rect width="${W}" height="${H}" fill="url(#sky)"/><ellipse cx="800" cy="1060" rx="1050" ry="300" fill="#2c7a63" opacity=".35" filter="url(#haze)"/>` + flies + blades;
  return wrap(defs, body);
}

function rain() {
  const r = rng(23);
  const colors = ['#ffcf8a', '#ff9fb4', '#8fd6d0', '#ffe6b0', '#b9a6ff', '#ffb77a'];
  let lights = '';
  for (let i = 0; i < 22; i++) {
    lights += `<circle cx="${n1(r() * W)}" cy="${n1(260 + r() * 700)}" r="${n1(28 + r() * 70)}" fill="${pick(r, colors)}" opacity="${n1((0.14 + r() * 0.18) * 100) / 100}"/>`;
  }
  let streaks = '';
  for (let i = 0; i < 120; i++) {
    const x = r() * W;
    const y = r() * H;
    const len = 40 + r() * 100;
    streaks += `<line x1="${n1(x)}" y1="${n1(y)}" x2="${n1(x + len * 0.16)}" y2="${n1(y + len)}" stroke="#dbe8f4" stroke-opacity="${n1((0.06 + r() * 0.16) * 100) / 100}" stroke-width="${n1(0.8 + r() * 0.9)}" stroke-linecap="round"/>`;
  }
  let drops = '';
  for (let i = 0; i < 30; i++) {
    const x = n1(r() * W);
    const y = n1(r() * H);
    const rx = n1(3 + r() * 5);
    drops += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${n1(rx * 1.5)}" fill="#fff" fill-opacity=".10" stroke="#fff" stroke-opacity=".22" stroke-width="1"/><circle cx="${n1(x - rx * 0.3)}" cy="${n1(y - rx * 0.6)}" r="${n1(rx * 0.25)}" fill="#fff" opacity=".6"/>`;
  }
  const defs = vgrad('sky', [[0, '#25313e'], [0.5, '#3b4d5e'], [1, '#566c7e']]) + blur('bokeh', 13);
  return wrap(defs, `<rect width="${W}" height="${H}" fill="url(#sky)"/><g filter="url(#bokeh)">${lights}</g>${streaks}${drops}`);
}

function candle() {
  const r = rng(31);
  const warm = ['#ffb25e', '#ffd08a', '#ff8f5a', '#ffc27a'];
  let lights = '';
  for (let i = 0; i < 20; i++) {
    lights += `<circle cx="${n1(r() * W)}" cy="${n1(120 + r() * 860)}" r="${n1(18 + r() * 62)}" fill="${pick(r, warm)}" opacity="${n1((0.10 + r() * 0.2) * 100) / 100}"/>`;
  }
  let sparks = '';
  for (let i = 0; i < 40; i++) sparks += `<circle cx="${n1(r() * W)}" cy="${n1(r() * H)}" r="${n1(0.7 + r() * 1.3)}" fill="#ffd9a0" opacity="${n1((0.25 + r() * 0.5) * 100) / 100}"/>`;
  const defs = `<radialGradient id="bg" cx=".5" cy="1.05" r="1.05"><stop offset="0" stop-color="#4d2629"/><stop offset=".55" stop-color="#2a1417"/><stop offset="1" stop-color="#120a0c"/></radialGradient>` + blur('b', 9) + blur('glow', 70);
  return wrap(defs, `<rect width="${W}" height="${H}" fill="url(#bg)"/><ellipse cx="800" cy="1020" rx="760" ry="300" fill="#ff9d4d" opacity=".14" filter="url(#glow)"/><g filter="url(#b)">${lights}</g>${sparks}`);
}

function golden() {
  const r = rng(43);
  let lights = '';
  for (let i = 0; i < 16; i++) {
    lights += `<circle cx="${n1(r() * W)}" cy="${n1(r() * H * 0.9)}" r="${n1(22 + r() * 70)}" fill="#fff" opacity="${n1((0.10 + r() * 0.14) * 100) / 100}"/>`;
  }
  const defs = `<linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">${stops([[0, '#ffefd9'], [0.55, '#ffd9bf'], [1, '#f8bdb2']])}</linearGradient>` + rgrad('sun', 260, 170, 780, [[0, '#fff6df', 0.9], [0.5, '#ffe7c6', 0.35], [1, '#ffe7c6', 0]]) + blur('b', 7);
  return wrap(defs, `<rect width="${W}" height="${H}" fill="url(#sky)"/><rect width="${W}" height="${H}" fill="url(#sun)"/><g filter="url(#b)">${lights}</g>` +
    `<path d="M0 800 C 300 720 600 850 900 785 S 1400 715 1600 800 V1000 H0 Z" fill="#f0a08b" opacity=".26"/>` +
    `<path d="M0 880 C 260 820 560 930 860 870 S 1380 820 1600 890 V1000 H0 Z" fill="#e58a7c" opacity=".26"/>`);
}

function petals() {
  const r = rng(57);
  const cols = ['#f4b3c4', '#f7c6d3', '#eea0b6', '#fad2dc'];
  const shape = (s) => `M0 ${-s} C ${n1(s * 0.78)} ${n1(-s * 0.92)}, ${n1(s * 0.92)} ${n1(s * 0.3)}, 0 ${s} C ${n1(-s * 0.92)} ${n1(s * 0.3)}, ${n1(-s * 0.78)} ${n1(-s * 0.92)}, 0 ${-s} Z`;
  let sharp = '';
  let soft = '';
  for (let i = 0; i < 46; i++) {
    const s = 14 + r() * 32;
    const p = `<path transform="translate(${n1(r() * W)} ${n1(r() * H)}) rotate(${n1(r() * 360)})" d="${shape(n1(s))}" fill="${pick(r, cols)}" opacity="${n1((0.22 + r() * 0.3) * 100) / 100}"/>`;
    if (i % 3 === 0) soft += p.replace(/d="/, 'd="').replace(`d="${shape(n1(s))}"`, `d="${shape(n1(s * 1.6))}"`);
    else sharp += p;
  }
  const defs = `<linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">${stops([[0, '#fff7f8'], [0.55, '#fde9ee'], [1, '#fadfe7']])}</linearGradient>` + rgrad('glow', 240, 140, 700, [[0, '#ffffff', 0.85], [1, '#ffffff', 0]]) + blur('s', 3);
  return wrap(defs, `<rect width="${W}" height="${H}" fill="url(#sky)"/><rect width="${W}" height="${H}" fill="url(#glow)"/><g filter="url(#s)">${soft}</g>${sharp}`);
}

function lavender() {
  const defs = vgrad('sky', [[0, '#c7b6f0'], [0.45, '#e6cbef'], [0.78, '#ffd8d2'], [1, '#ffe8d4']]) + rgrad('sun', 1180, 690, 560, [[0, '#fff2da', 0.9], [0.5, '#ffe6cf', 0.35], [1, '#ffe6cf', 0]]);
  return wrap(defs, `<rect width="${W}" height="${H}" fill="url(#sky)"/><rect width="${W}" height="${H}" fill="url(#sun)"/>` +
    `<path d="M0 700 C 250 640 520 740 800 690 S 1360 620 1600 700 V1000 H0 Z" fill="#b79ddb" opacity=".55"/>` +
    `<path d="M0 790 C 300 730 560 840 880 790 S 1400 740 1600 800 V1000 H0 Z" fill="#9b7fcb" opacity=".66"/>` +
    `<path d="M0 890 C 280 840 600 930 900 890 S 1380 850 1600 900 V1000 H0 Z" fill="#7d61b0" opacity=".8"/>`);
}

function paper() {
  let lines = '';
  for (let y = 120; y < H; y += 36) lines += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#8b6b3f" stroke-opacity=".08" stroke-width="1"/>`;
  const defs = `<radialGradient id="v" cx=".5" cy=".5" r=".78"><stop offset=".55" stop-color="#7a5028" stop-opacity="0"/><stop offset="1" stop-color="#7a5028" stop-opacity=".2"/></radialGradient>` +
    `<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .42  0 0 0 0 .3  0 0 0 0 .18  0 0 0 .22 0"/></filter>`;
  return wrap(defs, `<rect width="${W}" height="${H}" fill="#f3e6cc"/>${lines}<line x1="190" y1="0" x2="190" y2="${H}" stroke="#b5483c" stroke-opacity=".10" stroke-width="1.2"/><rect width="${W}" height="${H}" filter="url(#grain)"/><rect width="${W}" height="${H}" fill="url(#v)"/>`);
}

export const WALLPAPERS = [
  { id: 'starry', name: 'Starry Night', color: '#0a0f2c', svg: starry() },
  { id: 'fireflies', name: 'Fireflies', color: '#09171a', svg: fireflies() },
  { id: 'rain', name: 'Rainy Window', color: '#25313e', svg: rain() },
  { id: 'candle', name: 'Candlelight', color: '#2a1417', svg: candle() },
  { id: 'golden', name: 'Golden Hour', color: '#ffe3c8', svg: golden() },
  { id: 'petals', name: 'Petals', color: '#fde9ee', svg: petals() },
  { id: 'lavender', name: 'Lavender Hills', color: '#e6cbef', svg: lavender() },
  { id: 'paper', name: 'Love Letter', color: '#f3e6cc', svg: paper() },
];

const urls = new Map();
export function wallpaperUrl(p) {
  if (!urls.has(p.id)) urls.set(p.id, `url("data:image/svg+xml,${encodeURIComponent(p.svg)}")`);
  return urls.get(p.id);
}
export const getWallpaper = (id) => WALLPAPERS.find((p) => p.id === id) || null;
