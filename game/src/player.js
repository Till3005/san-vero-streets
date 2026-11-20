import { PLAYER } from './config.js';
import { driveKinematics, worldFocus } from './cars.js';
import { movePed } from './peds.js';
import { playerFire, damagePlayer } from './combat.js';
import { crime } from './police.js';
import { solidAt } from './city.js';
import { makePed, } from './entities.js';
import { makePedLook } from './city.js';
import { dist } from './random.js';

export function updatePlayer(world, input, dt) {
  const p = world.player;
  p.fireT = Math.max(0, p.fireT - dt);
  if (world.dialog) {
    if (p.inCar) { p.inCar.vx *= 1 - 3 * dt; p.inCar.vy *= 1 - 3 * dt; }
    return;
  }
  if (world.shotGhost) return;
  if (p.inCar) updateDriving(world, input, dt);
  else updateOnFoot(world, input, dt);
  if (p.hp < PLAYER.maxHp && world.wanted.stars === 0 && world.time - p.lastHurt > 6) p.hp = Math.min(PLAYER.maxHp, p.hp + 5 * dt);
}

function updateDriving(world, input, dt) {
  const p = world.player;
  const car = p.inCar;
  if (car.dead) {
    exitCar(world, true);
    return;
  }
  const throttle = (input.up ? 1 : 0) + (input.down ? -1 : 0);
  const steer = (input.right ? 1 : 0) + (input.left ? -1 : 0);
  driveKinematics(world, car, dt, throttle, steer, input.handbrake);
  car.parked = false;
  car.x = clampWorld(car.x);
  car.y = clampWorld(car.y);
  if (input.action) exitCar(world, false);
  if (input.fire) playerFire(world, input.aimX, input.aimY);
}

function clampWorld(v) {
  return Math.max(60, Math.min(90 * 48 - 60, v));
}

function updateOnFoot(world, input, dt) {
  const p = world.player;
  let vx = (input.right ? 1 : 0) + (input.left ? -1 : 0);
  let vy = (input.down ? 1 : 0) + (input.up ? -1 : 0);
  const len = Math.hypot(vx, vy);
  const speed = input.sprint ? PLAYER.sprint : PLAYER.walk;
  if (len > 0) {
    vx /= len;
    vy /= len;
    movePed(world, p, vx * speed, vy * speed, dt);
    p.walkT += dt * (input.sprint ? 15 : 11);
  }
  p.angle = Math.atan2(input.aimY - p.y, input.aimX - p.x);
  p.x = clampWorld(p.x);
  p.y = clampWorld(p.y);
  if (input.action) tryEnterCar(world, p);
  if (input.fire) playerFire(world, input.aimX, input.aimY);
  for (const car of world.cars) {
    const sp = Math.hypot(car.vx, car.vy);
    if (sp < 130 || car.dead) continue;
    const d = dist(car.x, car.y, p.x, p.y);
    if (d < car.type.l * 0.45) {
      damagePlayerByCar(world, (sp - 120) * 0.16);
      const a = Math.atan2(p.y - car.y, p.x - car.x);
      p.x += Math.cos(a) * 10;
      p.y += Math.sin(a) * 10;
    }
  }
}

function damagePlayerByCar(world, dmg) {
  damagePlayer(world, dmg);
}

function tryEnterCar(world, p) {
  let best = null;
  let bestD = 74;
  for (const car of world.cars) {
    if (car.dead) continue;
    const d = dist(car.x, car.y, p.x, p.y);
    if (d < bestD) { best = car; bestD = d; }
  }
  if (!best) return;
  jackCar(world, best);
}

export function jackCar(world, car) {
  const p = world.player;
  if (car.hasDriver) {
    const ped = makePed({ x: car.x - Math.sin(car.angle) * 30, y: car.y + Math.cos(car.angle) * 30, look: makePedLook(world.rng), mode: 'flee' });
    ped.fleeDir = Math.atan2(ped.y - car.y, ped.x - car.x) + (world.rng.next() - 0.5) * 0.6;
    ped.fleeT = 4;
    ped.speed = 60;
    world.peds.push(ped);
    car.hasDriver = false;
    crime(world, 8);
    world.stats.jacked += 1;
  }
  if (car.kind === 'police') crime(world, 30);
  p.inCar = car;
  car.control = 'player';
  car.parked = false;
  car.plan = null;
  world.audio.door();
}

export function exitCar(world, forced) {
  const p = world.player;
  const car = p.inCar;
  if (!car) return;
  const candidates = [[-Math.sin(car.angle), Math.cos(car.angle)], [Math.sin(car.angle), -Math.cos(car.angle)], [-Math.cos(car.angle), -Math.sin(car.angle)]];
  let px = car.x, py = car.y;
  for (const [ox, oy] of candidates) {
    const tx = car.x + ox * 40, ty = car.y + oy * 40;
    if (!solidAt(world.city, tx, ty)) { px = tx; py = ty; break; }
  }
  p.x = px;
  p.y = py;
  p.inCar = null;
  car.control = 'off';
  car.parked = true;
  car.speed *= 0.4;
  world.audio.door();
  if (forced) return;
}
