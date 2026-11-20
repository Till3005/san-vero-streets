import { makeCar } from './entities.js';
import { crime } from './police.js';
import { randomRoadSpawn } from './city.js';
import { worldFocus, driveKinematics } from './cars.js';
import { panicArea, playerFire } from './combat.js';
import { step } from './world.js';
import { dirAngle } from './config.js';
import { angDiff, clamp } from './random.js';

const DEFAULTS = { start: 8, play: 9, drive: 7.5, action: 5 };

function idleInput(aimX, aimY) {
  return { up: false, down: false, left: false, right: false, fire: false, sprint: false, handbrake: false, action: false, aimX: aimX || 0, aimY: aimY || 0 };
}

export function stageShot(name, world, tOverride) {
  world.shotGhost = true;
  const t = tOverride || DEFAULTS[name] || 8;
  if (name === 'drive') stageDrive(world, t);
  else if (name === 'action') stageAction(world, t);
  else {
    const steps = Math.floor(t * 60);
    for (let i = 0; i < steps; i += 1) {
      const input = idleInput(world.player.x + 40, world.player.y);
      if (i < 110 && i % 20 < 14) { input.left = true; input.up = true; }
      step(world, input, 1 / 60);
    }
  }
  world.player.hp = 100;
  world.player.lastHurt = world.time;
  return name === 'start' ? 'title' : 'play';
}

function stageDrive(world, t) {
  const laneX = 81 * 48 + 72;
  const car = makeCar({ x: laneX, y: 3900, angle: dirAngle(3), kind: 'sports', color: '#c23b3b', control: 'off', parked: false });
  world.cars.push(car);
  world.player.inCar = car;
  const steps = Math.floor(t * 60);
  for (let i = 0; i < steps; i += 1) {
    const desired = -Math.PI / 2 + clamp((laneX - car.x) * 0.004, -0.35, 0.35);
    const steer = clamp(angDiff(car.angle, desired) * 3, -1, 1);
    let throttle = Math.hypot(car.vx, car.vy) > 400 ? 0.15 : 1;
    const px = car.x + Math.cos(car.angle) * 95, py = car.y + Math.sin(car.angle) * 95;
    for (const other of world.cars) {
      if (other === car || other.dead) continue;
      if (Math.abs(other.x - px) < 55 && Math.abs(other.y - py) < 55) { throttle = -0.6; break; }
    }
    driveKinematics(world, car, 1 / 60, throttle, steer, false);
    step(world, idleInput(car.x, car.y - 100), 1 / 60);
  }
}

function stageAction(world, t) {
  crime(world, 170);
  const p = world.player;
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const spot = randomRoadSpawn(world.city, p.x + Math.cos(a) * 700, p.y + Math.sin(a) * 700, 0, 140, world.rng);
    if (spot) {
      const cop = makeCar({ x: spot.x, y: spot.y, angle: dirAngle(spot.dir), kind: 'police', control: 'cop', parked: false });
      cop.siren = true;
      world.cars.push(cop);
    }
  }
  panicArea(world, p.x, p.y, 320);
  const steps = Math.floor(t * 60);
  for (let i = 0; i < steps; i += 1) {
    let target = null;
    let bestD = 1e9;
    for (const car of world.cars) {
      if (car.kind !== 'police' || car.dead) continue;
      const d = Math.hypot(car.x - p.x, car.y - p.y);
      if (d < bestD) { bestD = d; target = car; }
    }
    const input = idleInput(target ? target.x : p.x + 100, target ? target.y : p.y);
    if (i > steps - 50 && target && bestD < 620) playerFire(world, target.x, target.y);
    step(world, input, 1 / 60);
  }
}
