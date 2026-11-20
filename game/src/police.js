import { dirVec, STAR_PTS } from './config.js';
import { randomRoadSpawn, hasLOS, solidAt } from './city.js';
import { makeCar } from './entities.js';
import { makePed } from './entities.js';
import { driveKinematics, worldFocus } from './cars.js';
import { copCanSee, fireBullet, killPed } from './combat.js';
import { movePed } from './peds.js';
import { dirAngle } from './config.js';
import { dist, clamp, angDiff } from './random.js';

export function crime(world, pts) {
  const w = world.wanted;
  w.pts = clamp(w.pts + pts, 0, 620);
  w.evadeT = 0;
  recomputeStars(world);
}

export function resetWanted(world) {
  world.wanted.pts = 0;
  world.wanted.evadeT = 0;
  world.wanted.bustT = 0;
  recomputeStars(world);
}

function recomputeStars(world) {
  let stars = 0;
  for (let i = 0; i < STAR_PTS.length; i += 1) if (world.wanted.pts >= STAR_PTS[i]) stars = i + 1;
  world.wanted.stars = stars;
}

export function updateWanted(world, dt) {
  const w = world.wanted;
  const focus = worldFocus(world);
  const heat = w.stars > 0 && copCanSee(world, focus.x, focus.y);
  w.heat = heat;
  if (heat) w.evadeT = 0;
  else w.evadeT += dt;
  if (!heat && w.evadeT > 9 && w.pts > 0) {
    w.pts = Math.max(0, w.pts - 30 * dt);
    recomputeStars(world);
  }
}

function spawnCopCar(world, dt) {
  world.copSpawnT = (world.copSpawnT || 0) - dt;
  const desired = [0, 1, 2, 3, 4, 6][world.wanted.stars];
  let count = 0;
  for (const car of world.cars) if (car.control === 'cop' && !car.dead && !car.retreat) count += 1;
  if (world.copSpawnT <= 0 && count < desired) {
    world.copSpawnT = 2.2;
    const focus = worldFocus(world);
    const spot = randomRoadSpawn(world.city, focus.x, focus.y, 640, 1200, world.rng);
    if (spot) {
      const car = makeCar({ x: spot.x, y: spot.y, angle: dirAngle(spot.dir), kind: 'police', control: 'cop', parked: false });
      car.siren = true;
      world.cars.push(car);
    }
  }
}

function spawnFootCop(world, x, y) {
  let alive = 0;
  for (const ped of world.peds) if (ped.mode === 'cop' && !ped.dead) alive += 1;
  if (alive >= 8) return;
  const ped = makePed({ x, y, mode: 'cop', gun: true, hp: 30 });
  ped.look = { skin: '#e8bfa5', shirt: '#2e3f66', pants: '#232c3f', hair: '#3a2a1a', hat: '#2e3f66' };
  ped.shootT = 0.6 + world.rng.next() * 0.5;
  ped.orbit = world.rng.next() * Math.PI * 2;
  ped.speed = 128;
  world.peds.push(ped);
}

function updateCopCar(world, car, dt) {
  const focus = worldFocus(world);
  const d = dist(car.x, car.y, focus.x, focus.y);
  if (world.wanted.stars === 0) {
    car.retreat = true;
    const away = Math.atan2(car.y - focus.y, car.x - focus.x);
    driveKinematics(world, car, dt, 0.8, clamp(angDiff(car.angle, away) * 2, -1, 1), false);
    if (d > 1500) car.gone = true;
    return;
  }
  car.retreat = false;
  const pvx = focus.vx || 0, pvy = focus.vy || 0;
  const tx = focus.x + pvx * 0.35, ty = focus.y + pvy * 0.35;
  let desired = Math.atan2(ty - car.y, tx - car.x);
  const hx = Math.cos(car.angle), hy = Math.sin(car.angle);
  let avoid = 0;
  for (const s of [-0.5, 0.5]) {
    const px = car.x + Math.cos(car.angle + s) * 95, py = car.y + Math.sin(car.angle + s) * 95;
    if (solidAt(world.city, px, py)) avoid -= Math.sign(s) * 1.1;
  }
  const cxp = car.x + hx * 120, cyp = car.y + hy * 120;
  if (solidAt(world.city, cxp, cyp) && avoid === 0) avoid = Math.sin(world.time * 3 + car.x) > 0 ? 1 : -1;
  desired += avoid;
  const diff = angDiff(car.angle, desired);
  let throttle = 1;
  const playerOnFoot = !world.player.inCar;
  if (playerOnFoot && d < 230) throttle = 0;
  else if (d < 320) throttle = 0.75;
  if (Math.abs(diff) > 1.1) throttle = Math.min(throttle, 0.4);
  const steer = clamp(diff * 2.4, -1, 1);
  driveKinematics(world, car, dt, throttle, steer, false);
  car.speed = Math.hypot(car.vx, car.vy);
  if (!car.unloaded && playerOnFoot && d < 210 && car.speed < 50) {
    car.unloaded = true;
    const c = Math.cos(car.angle), s = Math.sin(car.angle);
    spawnFootCop(world, car.x - s * 34, car.y + c * 34);
    spawnFootCop(world, car.x + s * 34, car.y - c * 34);
  }
  if (d > 600) car.unloaded = false;
}

function updateCopPed(world, ped, dt) {
  const focus = worldFocus(world);
  const d = dist(ped.x, ped.y, focus.x, focus.y);
  if (world.wanted.stars === 0) {
    ped.leaveT = (ped.leaveT || 0) + dt;
    const away = Math.atan2(ped.y - focus.y, ped.x - focus.x);
    movePed(world, ped, Math.cos(away) * 90, Math.sin(away) * 90, dt);
    ped.angle = away;
    ped.walkT += dt * 9;
    if (ped.leaveT > 5) ped.dead = true, ped.corpseT = 0;
    return;
  }
  const see = d < 560 && hasLOS(world.city, ped.x, ped.y, focus.x, focus.y);
  if (d > 240 || !see) {
    const a = Math.atan2(focus.y - ped.y, focus.x - ped.x);
    movePed(world, ped, Math.cos(a) * ped.speed, Math.sin(a) * ped.speed, dt);
    ped.angle = a;
    ped.walkT += dt * 9;
  } else {
    ped.orbit += dt * 0.7;
    const gx = focus.x + Math.cos(ped.orbit) * 190, gy = focus.y + Math.sin(ped.orbit) * 190;
    const a = Math.atan2(gy - ped.y, gx - ped.x);
    movePed(world, ped, Math.cos(a) * 95, Math.sin(a) * 95, dt);
    ped.angle = Math.atan2(focus.y - ped.y, focus.x - ped.x);
    ped.walkT += dt * 7;
  }
  ped.shootT -= dt;
  if (ped.shootT <= 0 && see && d < 500) {
    ped.shootT = 0.8 + world.rng.next() * 0.5;
    const aim = Math.atan2(focus.y - ped.y, focus.x - ped.x) + (world.rng.next() - 0.5) * 0.1;
    fireBullet(world, 'cop', ped.x, ped.y, aim, { dmg: 8, speed: 800 });
    world.audio.shot();
  }
}

export function updateCops(world, dt) {
  updateWanted(world, dt);
  if (world.wanted.stars > 0) spawnCopCar(world, dt);
  const focus = worldFocus(world);
  for (let i = world.cars.length - 1; i >= 0; i -= 1) {
    const car = world.cars[i];
    if (car.control === 'cop' && !car.dead) {
      updateCopCar(world, car, dt);
      if (car.gone) world.cars.splice(i, 1);
    }
  }
  let bustNear = false;
  for (const ped of world.peds) {
    if (ped.mode !== 'cop' || ped.dead) continue;
    updateCopPed(world, ped, dt);
    if (world.wanted.stars > 0) {
      const d = dist(ped.x, ped.y, focus.x, focus.y);
      if (!world.player.inCar && d < 48) bustNear = true;
      if (world.player.inCar && Math.hypot(world.player.inCar.vx, world.player.inCar.vy) < 40 && d < 62) bustNear = true;
    }
  }
  const w = world.wanted;
  if (bustNear) {
    w.bustT += dt;
    if (w.bustT > 1.3) world.pendingBusted = true;
  } else w.bustT = Math.max(0, w.bustT - dt * 2);
}

export function clearCops(world) {
  for (let i = world.cars.length - 1; i >= 0; i -= 1) {
    if (world.cars[i].control === 'cop') world.cars.splice(i, 1);
  }
  for (let i = world.peds.length - 1; i >= 0; i -= 1) {
    if (world.peds[i].mode === 'cop') world.peds.splice(i, 1);
  }
}
