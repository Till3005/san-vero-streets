import { TILE, PERIOD, PERIODS, WTILES, RIVER_COLS, OCEAN_START, WALL_COLORS, SKIN, SHIRTS, PANTS, CAR_COLORS, CIV_TYPES, shade } from './config.js';
import { createRandom, hash2, clamp } from './random.js';

export const T_GRASS = 0, T_ROAD = 1, T_SIDE = 2, T_PAD = 3, T_PARK = 4, T_SAND = 5, T_WATER = 6, T_BRIDGE = 7, T_LOT = 8, T_PLAZA = 9;

export const SITE_DEFS = {
  diner: { bx: 2, by: 4, label: "CHICO'S DINER", accent: '#d9534f' },
  courier: { bx: 3, by: 1, label: 'SWIFT COURIERS', accent: '#7a5fc2' },
  marina: { bx: 5, by: 2, label: "SALTY'S MARINA", accent: '#3b7dc2' },
  chop: { bx: 1, by: 8, label: 'RUFUS AUTO BODY', accent: '#8a8f96' },
  pawn: { bx: 4, by: 5, label: 'GOLDLINE PAWN', accent: '#d9b23b' },
  motel: { bx: 7, by: 5, label: 'PALM COURT MOTEL', accent: '#3ba173' },
  hospital: { bx: 5, by: 6, label: 'MERCY GENERAL', accent: '#e0e4ea' },
  pd: { bx: 6, by: 7, label: 'SVPD CENTRAL', accent: '#2e3f66' },
  docks: { bx: 7, by: 8, label: 'VERO DOCKS', accent: '#c2813b' },
};

const isRiverCol = (tx) => tx === RIVER_COLS[0] || tx === RIVER_COLS[1] || tx === RIVER_COLS[2];

function addBuilding(city, rng, x, y, w, h, ht, opts = {}) {
  const wall = opts.wall || rng.pick(WALL_COLORS);
  const b = {
    x, y, w, h, ht,
    wall,
    roof: opts.roof || shade(wall, 0.82),
    trim: opts.trim || shade(wall, 1.14),
    ox: ht * 3,
    oy: ht * 5,
    details: [],
    winS: [],
    winE: [],
    awning: opts.awning || null,
    roofText: opts.roofText || null,
    cross: !!opts.cross,
    badge: !!opts.badge,
  };
  const nAc = opts.noDetails ? 0 : rng.int(1, 3);
  for (let i = 0; i < nAc; i += 1) b.details.push({ t: 'ac', x: rng.range(20, w - 38), y: rng.range(20, h - 38) });
  const nV = opts.noDetails ? 0 : rng.int(2, 5);
  for (let i = 0; i < nV; i += 1) b.details.push({ t: 'vent', x: rng.range(12, w - 16), y: rng.range(12, h - 16), r: rng.range(3, 5) });
  if (!opts.noDetails && rng.chance(0.35)) b.details.push({ t: 'sky', x: rng.range(24, w - 60), y: rng.range(24, h - 40), w: rng.range(26, 40), h: rng.range(16, 24) });
  if (!opts.noDetails && ht >= 4 && rng.chance(0.45)) b.details.push({ t: 'tank', x: rng.range(30, w - 30), y: rng.range(30, h - 30), r: 15 });
  if (!opts.noDetails) b.details.push({ t: 'box', x: rng.range(10, w - 26), y: rng.range(10, h - 20) });
  const rows = Math.max(1, Math.floor(b.oy / 13));
  for (let r = 0; r < rows; r += 1) {
    for (let wx = 10; wx < w - 16; wx += 22) {
      b.winS.push({ x: wx, y: h - b.oy + 6 + r * 13 });
    }
  }
  for (let wy = 14; wy < h - b.oy - 8; wy += 22) b.winE.push({ x: w - b.ox + 4, y: wy });
  city.buildings.push(b);
  markRect(city.blockGrid, x, y, w, h);
  markRect(city.wallGrid, x, y, w, h);
  return b;
}

function markRect(grid, x, y, w, h) {
  const tx0 = Math.floor(x / TILE), ty0 = Math.floor(y / TILE);
  const tx1 = Math.ceil((x + w) / TILE), ty1 = Math.ceil((y + h) / TILE);
  for (let ty = ty0; ty < ty1; ty += 1) {
    for (let tx = tx0; tx < tx1; tx += 1) {
      if (tx >= 0 && ty >= 0 && tx < WTILES && ty < WTILES) grid[ty * WTILES + tx] = 1;
    }
  }
}

function blockInterior(bx, by) {
  return { x: (bx * PERIOD + 3) * TILE, y: (by * PERIOD + 3) * TILE, w: 5 * TILE, h: 5 * TILE };
}

function genBlockBuildings(city, rng, bx, by) {
  const inner = blockInterior(bx, by);
  const d = Math.max(Math.abs(bx - 4.5), Math.abs(by - 4.5));
  const hMin = d <= 2 ? 3 : d <= 3.5 ? 2 : 1;
  const hMax = d <= 2 ? 6 : d <= 3.5 ? 4 : 3;
  const pattern = rng.int(0, 2);
  if (pattern === 0) {
    const w = rng.int(168, 226), h = rng.int(168, 226);
    addBuilding(city, rng, inner.x + rng.range(4, inner.w - w - 4), inner.y + rng.range(4, inner.h - h - 4), w, h, rng.int(hMin, hMax));
  } else if (pattern === 1) {
    const sx = rng.int(92, 136);
    addBuilding(city, rng, inner.x + 5, inner.y + 5, sx - 9, inner.h - 10, rng.int(hMin, hMax));
    addBuilding(city, rng, inner.x + sx + 4, inner.y + 5, inner.w - sx - 9, inner.h - 10, rng.int(hMin, hMax));
  } else {
    const bigH = rng.int(104, 136);
    addBuilding(city, rng, inner.x + 5, inner.y + 5, inner.w - 10, bigH, rng.int(hMin, hMax));
    const s = rng.int(96, 120);
    addBuilding(city, rng, inner.x + 5, inner.y + bigH + 12, s - 8, inner.h - bigH - 17, rng.int(1, 2), { noDetails: false });
    addBuilding(city, rng, inner.x + s + 5, inner.y + bigH + 12, inner.w - s - 10, inner.h - bigH - 17, rng.int(1, 2), { noDetails: false });
  }
}

function genSiteBlock(city, rng, key, def) {
  const inner = blockInterior(def.bx, def.by);
  const site = { key, bx: def.bx, by: def.by, label: def.label, accent: def.accent, x: (def.bx * PERIOD + 5) * TILE + TILE / 2, y: (def.by * PERIOD + 8) * TILE + TILE / 2 };
  city.sites[key] = site;
  const special = key === 'hospital' || key === 'pd';
  const ht = key === 'hospital' ? 3 : key === 'pd' ? 2 : 1;
  const b = addBuilding(city, rng, inner.x + 4, inner.y + 4, inner.w - 8, key === 'hospital' ? 152 : key === 'pd' ? 128 : 76, ht, {
    wall: key === 'hospital' ? '#dfe3e8' : key === 'pd' ? '#3a4a70' : rng.pick(WALL_COLORS),
    awning: special ? null : def.accent,
    cross: key === 'hospital',
    badge: key === 'pd',
    roofText: key === 'pd' ? 'SVPD' : null,
    noDetails: special,
  });
  b.site = key;
  city.decals.push({ t: 'label', text: def.label, x: inner.x + inner.w / 2, y: inner.y + (key === 'hospital' ? 186 : key === 'pd' ? 166 : 140), size: 13, color: 'rgba(30,30,40,0.55)' });
  city.decals.push({ t: 'pad', x: site.x, y: site.y, r: 26, color: def.accent });
  if (key === 'marina') {
    const py = inner.y + inner.h / 2;
    city.decals.push({ t: 'pier', x: 44 * TILE, y: py - 11, w: 5 * TILE, h: 22 });
    city.props.push({ t: 'boat', x: 45.5 * TILE, y: py + 64, c: '#c8553b', a: Math.PI / 2 });
    city.props.push({ t: 'boat', x: 45.2 * TILE, y: py - 96, c: '#e8e8e8', a: Math.PI / 2 + 0.25 });
  }
  if (key === 'docks') {
    const px = inner.x + inner.w / 2;
    city.decals.push({ t: 'pier', x: px - 14, y: (COAST_TILE) * TILE + 6, w: 28, h: 6 * TILE });
    city.props.push({ t: 'boat', x: px, y: (COAST_TILE + 5.4) * TILE, c: '#3b7dc2', a: 0 });
    city.props.push({ t: 'crane', x: px + 70, y: (COAST_TILE + 0.6) * TILE, c: '#c2813b' });
  }
}

const COAST_TILE = 83;

function genParkBlock(city, rng, bx, by) {
  const inner = blockInterior(bx, by);
  city.blocks[bx][by] = { type: 'park' };
  if (!city.pondPlaced && rng.chance(0.5)) {
    city.pondPlaced = true;
    city.decals.push({ t: 'pond', x: inner.x + inner.w / 2, y: inner.y + inner.h / 2, rx: 62, ry: 40 });
    markPond(city, inner.x + inner.w / 2, inner.y + inner.h / 2, 62, 40);
  }
  const n = rng.int(5, 8);
  for (let i = 0; i < n; i += 1) {
    const tx = rng.range(inner.x + 26, inner.x + inner.w - 26);
    const ty = rng.range(inner.y + 26, inner.y + inner.h - 26);
    let ok = true;
    for (const tree of city.trees) if (Math.hypot(tree.x - tx, tree.y - ty) < 52) ok = false;
    if (ok) city.trees.push({ x: tx, y: ty, r: rng.range(13, 19) });
  }
  for (let i = 0; i < 3; i += 1) city.props.push({ t: 'bench', x: inner.x + 30 + i * 80, y: inner.y + inner.h - 16, c: '#7a5233', a: 0 });
  for (let i = 0; i < 7; i += 1) city.decals.push({ t: 'flower', x: rng.range(inner.x + 14, inner.x + inner.w - 14), y: rng.range(inner.y + 14, inner.y + inner.h - 14), c: rng.pick(['#e05a7a', '#e8d95a', '#d9d9e8', '#e88a4a']) });
}

function markPond(city, cx, cy, rx, ry) {
  for (let ty = Math.floor((cy - ry) / TILE); ty <= Math.ceil((cy + ry) / TILE); ty += 1) {
    for (let tx = Math.floor((cx - rx) / TILE); tx <= Math.ceil((cx + rx) / TILE); tx += 1) {
      const dx = (tx + 0.5) * TILE - cx, dy = (ty + 0.5) * TILE - cy;
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) < 1 && tx >= 0 && ty >= 0 && tx < WTILES && ty < WTILES) city.blockGrid[ty * WTILES + tx] = 1;
    }
  }
}

function genLotBlock(city, rng, bx, by) {
  const inner = blockInterior(bx, by);
  city.blocks[bx][by] = { type: 'lot' };
  const rows = [inner.y + 34, inner.y + inner.h - 34];
  const bays = [];
  for (let i = 0; i < 6; i += 1) {
    const x = inner.x + 30 + i * 36;
    city.decals.push({ t: 'lotline', x1: x - 16, y1: rows[0] - 26, x2: x - 16, y2: rows[0] + 26 });
    city.decals.push({ t: 'lotline', x1: x - 16, y1: rows[1] - 26, x2: x - 16, y2: rows[1] + 26 });
    if (rng.chance(0.55)) bays.push({ x: x + 2, y: rows[0], angle: -Math.PI / 2 });
    if (rng.chance(0.55)) bays.push({ x: x + 2, y: rows[1], angle: Math.PI / 2 });
  }
  city.decals.push({ t: 'lotline', x1: inner.x + 16, y1: inner.y + inner.h / 2, x2: inner.x + inner.w - 16, y2: inner.y + inner.h / 2, dash: true });
  city.lots.push({ bx, by, bays });
}

export function generateCity(seed) {
  const rng = createRandom((seed ^ 0x51ab7) >>> 0);
  const codes = new Uint8Array(WTILES * WTILES);
  const blockGrid = new Uint8Array(WTILES * WTILES);
  const wallGrid = new Uint8Array(WTILES * WTILES);
  const city = {
    seed, codes, blockGrid, wallGrid,
    buildings: [], trees: [], props: [], decals: [], lots: [], sites: {},
    blocks: [], pondPlaced: false,
  };

  const types = [];
  for (let bx = 0; bx < PERIODS; bx += 1) {
    city.blocks[bx] = [];
    types[bx] = [];
    for (let by = 0; by < PERIODS; by += 1) { types[bx][by] = 'bld'; city.blocks[bx][by] = { type: 'bld' }; }
  }
  for (const key of Object.keys(SITE_DEFS)) { types[SITE_DEFS[key].bx][SITE_DEFS[key].by] = key; city.blocks[SITE_DEFS[key].bx][SITE_DEFS[key].by] = { type: 'site', key }; }
  const free = [];
  for (let bx = 0; bx < PERIODS; bx += 1) for (let by = 0; by < PERIODS; by += 1) if (types[bx][by] === 'bld') free.push([bx, by]);
  for (let i = free.length - 1; i > 0; i -= 1) { const j = rng.int(0, i); const t = free[i]; free[i] = free[j]; free[j] = t; }
  let fi = 0;
  for (let p = 0; p < 8; p += 1) { const [bx, by] = free[fi++]; types[bx][by] = 'park'; genParkBlock(city, rng, bx, by); }
  for (let p = 0; p < 7; p += 1) { const [bx, by] = free[fi++]; types[bx][by] = 'lot'; genLotBlock(city, rng, bx, by); }

  for (let ty = 0; ty < WTILES; ty += 1) {
    for (let tx = 0; tx < WTILES; tx += 1) {
      let code = T_GRASS;
      if (isRiverCol(tx)) code = ty % PERIOD < 2 ? T_BRIDGE : T_WATER;
      else if (tx >= OCEAN_START || ty >= OCEAN_START) code = T_WATER;
      else if (tx >= COAST_TILE || ty >= COAST_TILE) code = T_SAND;
      else if (tx % PERIOD < 2 || ty % PERIOD < 2) code = T_ROAD;
      else if (tx % PERIOD === 2 || tx % PERIOD === 8 || ty % PERIOD === 2 || ty % PERIOD === 8) code = T_SIDE;
      else {
        const bx = Math.floor(tx / PERIOD), by = Math.floor(ty / PERIOD);
        const t = types[bx][by];
        code = t === 'park' ? T_PARK : t === 'lot' ? T_LOT : t === 'site' ? T_PLAZA : T_PAD;
      }
      codes[ty * WTILES + tx] = code;
    }
  }

  for (const key of Object.keys(SITE_DEFS)) genSiteBlock(city, rng, key, SITE_DEFS[key]);
  for (let bx = 0; bx < PERIODS; bx += 1) {
    for (let by = 0; by < PERIODS; by += 1) {
      if (types[bx][by] === 'bld') genBlockBuildings(city, rng, bx, by);
    }
  }
  for (let i = 0; i < 46; i += 1) {
    const bx = rng.int(0, PERIODS - 1), by = rng.int(0, PERIODS - 1);
    const inner = blockInterior(bx, by);
    if (types[bx][by] !== 'bld') continue;
    city.props.push({ t: 'crate', x: inner.x + rng.range(10, inner.w - 10), y: inner.y + rng.range(10, inner.h - 10) });
  }

  for (let by = 0; by < PERIODS; by += 1) {
    for (let bx = 0; bx < PERIODS; bx += 1) {
      for (let i = 0; i < 7; i += 1) {
        const tx = bx * PERIOD + 2 + i;
        const r = hash2(tx * 13 + by * 7, 991);
        const ry = by * PERIOD + 8;
        if (codes[ry * WTILES + tx] === T_SIDE) {
          if (r < 0.2) city.props.push({ t: 'lamp', x: tx * TILE + 24, y: ry * TILE + 38 });
          else if (r < 0.3) city.props.push({ t: 'hydrant', x: tx * TILE + 24, y: ry * TILE + 36, c: '#c23b3b' });
          else if (r < 0.38) city.props.push({ t: 'mailbox', x: tx * TILE + 24, y: ry * TILE + 36, c: '#3b6bc2' });
          else if (r < 0.5) city.props.push({ t: 'bin', x: tx * TILE + 24, y: ry * TILE + 38, c: '#4a5560' });
          else if (r < 0.56) city.props.push({ t: 'bag', x: tx * TILE + 30, y: ry * TILE + 30, c: '#2f2f36' });
        }
        const r2 = hash2(tx * 17 + by * 5, 413);
        const ty2 = by * PERIOD + 2;
        if (codes[ty2 * WTILES + tx] === T_SIDE) {
          if (r2 < 0.18) city.props.push({ t: 'lamp', x: tx * TILE + 24, y: ty2 * TILE + 12 });
          else if (r2 < 0.26) city.props.push({ t: 'hydrant', x: tx * TILE + 30, y: ty2 * TILE + 14, c: '#c23b3b' });
          else if (r2 < 0.34) city.props.push({ t: 'bin', x: tx * TILE + 24, y: ty2 * TILE + 12, c: '#4a5560' });
        }
      }
    }
  }

  for (let ty = 0; ty < WTILES; ty += 1) {
    for (let tx = 0; tx < WTILES; tx += 1) {
      if (codes[ty * WTILES + tx] !== T_SAND) continue;
      const r = hash2(tx * 31, ty * 17);
      if (r < 0.05) city.props.push({ t: 'umbrella', x: tx * TILE + 24, y: ty * TILE + 24, c: rng.pick(['#d9534f', '#3b7dc2', '#d9b23b', '#3ba173']) });
      else if (r < 0.14) city.props.push({ t: 'towel', x: tx * TILE + 24, y: ty * TILE + 24, c: rng.pick(['#e8e8e8', '#4f8a8b', '#d97b3b']), a: rng.range(-0.5, 0.5) });
    }
  }
  city.props.push({ t: 'boat', x: 87.4 * TILE, y: 20.6 * TILE, c: '#e8e8e8', a: Math.PI / 2 + 0.2 });
  city.props.push({ t: 'boat', x: 87.8 * TILE, y: 62 * TILE, c: '#4f8a4f', a: Math.PI / 2 - 0.15 });
  city.props.push({ t: 'boat', x: 30.5 * TILE, y: 87.6 * TILE, c: '#c8553b', a: 0.1 });
  city.props.push({ t: 'boat', x: 45.6 * TILE, y: 66.5 * TILE, c: '#3ba173', a: Math.PI / 2 });
  city.props.push({ t: 'boat', x: 44.9 * TILE, y: 12.5 * TILE, c: '#d97b3b', a: Math.PI / 2 + 0.12 });
  city.props.push({ t: 'boat', x: 45.8 * TILE, y: 84.5 * TILE, c: '#e8e8e8', a: Math.PI / 2 - 0.08 });

  return city;
}

export function tileCodeAt(city, x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= WTILES || ty >= WTILES) return T_WATER;
  return city.codes[ty * WTILES + tx];
}

export function isRoadCode(c) { return c === T_ROAD || c === T_BRIDGE; }
export function isRoadTile(city, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= WTILES || ty >= WTILES) return false;
  return isRoadCode(city.codes[ty * WTILES + tx]);
}
export function isJunction(city, tx, ty) { return tx % PERIOD < 2 && ty % PERIOD < 2 && isRoadTile(city, tx, ty); }
export function solidAt(city, x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= WTILES || ty >= WTILES) return true;
  if (city.codes[ty * WTILES + tx] === T_WATER) return true;
  return city.blockGrid[ty * WTILES + tx] === 1;
}
export function wallAt(city, x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= WTILES || ty >= WTILES) return false;
  return city.wallGrid[ty * WTILES + tx] === 1;
}
export function hasLOS(city, x1, y1, x2, y2) {
  const d = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(2, Math.ceil(d / 26));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (wallAt(city, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false;
  }
  return true;
}

export function laneCoord(dir, base) {
  if (dir === 0) return base * TILE + 72;
  if (dir === 2) return base * TILE + 24;
  if (dir === 1) return base * TILE + 24;
  return base * TILE + 72;
}

export function nearestLanePoint(city, x, y) {
  let best = null;
  for (let px = 0; px < PERIODS; px += 1) {
    const c0 = px * PERIOD;
    if (isRiverCol(c0) || isRiverCol(c0 + 1)) continue;
    for (const [dir, lx] of [[1, laneCoord(1, c0)], [3, laneCoord(3, c0)]]) {
      const d = Math.abs(lx - x);
      if (!best || d < best.d) best = { d, dir, x: lx, y: clamp(y, TILE * 2, 82 * TILE) };
    }
  }
  for (let py = 0; py < PERIODS; py += 1) {
    const r0 = py * PERIOD;
    for (const [dir, ly] of [[0, laneCoord(0, r0)], [2, laneCoord(2, r0)]]) {
      const d = Math.abs(ly - y);
      if (!best || d < best.d) best = { d, dir, x: clamp(x, TILE * 2, 82 * TILE), y: ly };
    }
  }
  return best;
}

export function randomRoadSpawn(city, cx, cy, minD, maxD, rng) {
  for (let i = 0; i < 50; i += 1) {
    const a = rng.next() * Math.PI * 2;
    const r = minD + rng.next() * (maxD - minD);
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (!isRoadTile(city, tx, ty) || isJunction(city, tx, ty)) continue;
    const p = nearestLanePoint(city, x, y);
    if (p && p.d < 30 && isRoadTile(city, Math.floor(p.x / TILE), Math.floor(p.y / TILE))) return { x: p.x, y: p.y, dir: p.dir };
  }
  return null;
}

export function randomSidewalkPoint(city, cx, cy, minD, maxD, rng) {
  for (let i = 0; i < 50; i += 1) {
    const a = rng.next() * Math.PI * 2;
    const r = minD + rng.next() * (maxD - minD);
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 1 || ty < 1 || tx >= WTILES - 1 || ty >= WTILES - 1) continue;
    if (city.codes[ty * WTILES + tx] !== T_SIDE) continue;
    return { x: tx * TILE + 24 + rng.range(-8, 8), y: ty * TILE + 24 + rng.range(-8, 8) };
  }
  return null;
}

export function lightGreenNS(time) {
  const ph = time % (16);
  return ph < 8;
}

export function makePedLook(rng) {
  return { skin: rng.pick(SKIN), shirt: rng.pick(SHIRTS), pants: rng.pick(PANTS), hair: rng.pick(['#2b2b2b', '#4a3220', '#6e4a2e', '#c9b26a', '#8a8a8a', '#1a1a1a']), hat: rng.chance(0.18) ? rng.pick(['#c23b3b', '#3b7dc2', '#e8e8e8', '#2b2b30']) : null };
}

export function makeCarStyle(rng) {
  return { color: rng.pick(CAR_COLORS), type: rng.pick(CIV_TYPES) };
}
