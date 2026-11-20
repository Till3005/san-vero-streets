import { CAR_TYPES } from './config.js';

export function makeCar(opts) {
  const type = CAR_TYPES[opts.kind || 'sedan'];
  return {
    kind: type.name,
    type,
    x: opts.x, y: opts.y,
    angle: opts.angle || 0,
    vx: 0, vy: 0,
    speed: 0,
    style: opts.style || { color: opts.color || '#3b6bc2' },
    hp: opts.hp ?? type.hp,
    maxHp: type.hp,
    control: opts.control || 'off',
    parked: opts.parked ?? true,
    dead: false,
    deadT: 0,
    burning: false,
    burnT: 0,
    smokeT: 0,
    siren: false,
    dir: opts.dir ?? 1,
    plan: null,
    lastJ: -1,
    cruise: opts.cruise || 170,
    hasDriver: opts.hasDriver ?? false,
    mission: opts.mission || null,
    armed: opts.armed || false,
    shootT: 1,
    honk: 0,
    wp: null,
    color: opts.color || null,
  };
}

export function makePed(opts) {
  return {
    x: opts.x, y: opts.y,
    angle: opts.angle || 0,
    mode: opts.mode || 'walk',
    look: opts.look,
    hp: opts.hp ?? 12,
    walkT: Math.random() * 6,
    speed: 0,
    vx: 0, vy: 0,
    fleeDir: opts.fleeDir || 0,
    fleeT: 0,
    shootT: opts.shootT ?? 1,
    gun: opts.gun || false,
    dead: false,
    corpseT: 0,
    mission: opts.mission || null,
    strafe: Math.random() * Math.PI * 2,
  };
}

export function makeBullet(x, y, vx, vy, dmg, owner) {
  return { x, y, vx, vy, dmg, owner, life: 0.85 };
}
