export const TILE = 48;
export const PERIOD = 9;
export const PERIODS = 10;
export const WTILES = PERIOD * PERIODS;
export const WORLD_PX = WTILES * TILE;
export const RIVER_COLS = [44, 45, 46];
export const COAST_START = 83;
export const OCEAN_START = 85;

export const TRAFFIC_CYCLE = 8;
export const STAR_PTS = [10, 40, 90, 170, 290];

export const PLAYER = {
  walk: 150,
  sprint: 230,
  radius: 11,
  maxHp: 100,
  gunDmg: 14,
  fireDelay: 0.21,
  bulletSpeed: 940,
  bulletRange: 660,
};

export const CAR_TYPES = {
  compact: { name: 'compact', w: 38, l: 70, max: 320, accel: 300, grip: 9, mass: 0.9, hp: 90 },
  sedan: { name: 'sedan', w: 42, l: 86, max: 400, accel: 340, grip: 8, mass: 1.1, hp: 110 },
  sports: { name: 'sports', w: 40, l: 84, max: 530, accel: 480, grip: 10, mass: 0.95, hp: 95 },
  taxi: { name: 'taxi', w: 42, l: 86, max: 390, accel: 350, grip: 8, mass: 1.1, hp: 110 },
  van: { name: 'van', w: 46, l: 100, max: 300, accel: 240, grip: 7, mass: 1.5, hp: 135 },
  pickup: { name: 'pickup', w: 44, l: 92, max: 350, accel: 300, grip: 7.5, mass: 1.3, hp: 125 },
  police: { name: 'police', w: 42, l: 88, max: 480, accel: 430, grip: 9, mass: 1.35, hp: 125 },
  boss: { name: 'boss', w: 50, l: 112, max: 350, accel: 260, grip: 7, mass: 2.4, hp: 280 },
};

export const CIV_TYPES = ['compact', 'sedan', 'sports', 'taxi', 'van', 'pickup'];
export const CAR_COLORS = ['#c23b3b', '#3b6bc2', '#e8e8e8', '#2b2b30', '#d9b23b', '#4f8a4f', '#d97b3b', '#4f8a8b', '#8a5aa0', '#b0b6bd'];

export const WALL_COLORS = ['#c05a3e', '#e3d2a4', '#9aa4ad', '#4f9296', '#e08a62', '#7185a8', '#cdbfa2', '#8fae7d', '#b57a92', '#d4a94f'];
export const SKIN = ['#e8bfa5', '#d9a276', '#c98850', '#8a5a3b', '#f0d6c0', '#6e4630'];
export const SHIRTS = ['#d9534f', '#3b7dc2', '#3ba173', '#d9b23b', '#e8e8e8', '#8a5aa0', '#d97b3b', '#5a8a9e', '#c25a8a', '#2f2f36'];
export const PANTS = ['#2f3640', '#4a5560', '#5a4632', '#3a4a5c', '#6e6e74', '#28303a'];

export const COLORS = {
  road: '#3e434d',
  roadVar: '#383d46',
  laneYellow: '#d9b23b',
  laneWhite: '#d5d8dd',
  sidewalk: '#b0aca0',
  sidewalkLine: '#8b919b',
  curb: '#d9d4c8',
  grass: '#69a55b',
  grassDark: '#5b9750',
  sand: '#e4d2a1',
  sandDark: '#d8c48e',
  water: '#2e74ae',
  waterDeep: '#24639b',
  waterLight: '#4d8fc4',
  bridge: '#6f747d',
  bridgeDark: '#5a5f68',
  lot: '#43474f',
  plaza: '#bfb6a2',
  pad: '#c9c2b2',
  tree: '#3d7a3a',
  treeLight: '#529a4b',
  trunk: '#6e4a2e',
  shadow: 'rgba(18, 24, 34, 0.28)',
  hudBg: 'rgba(12, 15, 22, 0.62)',
  hudBorder: 'rgba(255, 255, 255, 0.14)',
  gold: '#f2c14b',
  green: '#57d977',
  red: '#e05252',
  blue: '#4b8ff2',
};

export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
  return `rgb(${r},${g},${b})`;
}

export function dirAngle(dir) {
  return dir * Math.PI / 2;
}

export function dirVec(dir) {
  return [Math.cos(dirAngle(dir)), Math.sin(dirAngle(dir))];
}
