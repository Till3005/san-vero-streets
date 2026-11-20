import { TILE, dirVec } from './config.js';
import { T_SIDE } from './city.js';
import { tileCodeAt, solidAt, hasLOS } from './city.js';
import { makePed } from './entities.js';
import { makePedLook } from './city.js';
import { killPed, fireBullet } from './combat.js';
import { worldFocus } from './cars.js';
import { dist, clamp } from './random.js';

export function movePed(world, ped, vx, vy, dt) {
  const nx = ped.x + vx * dt;
  const ny = ped.y + vy * dt;
  let blockedX = false;
  let blockedY = false;
  if (!pedSolid(world, nx, ped.y)) ped.x = nx; else blockedX = true;
  if (!pedSolid(world, ped.x, ny)) ped.y = ny; else blockedY = true;
  return !blockedX || !blockedY;
}

function pedSolid(world, x, y) {
  if (solidAt(world.city, x, y)) return true;
  for (const tree of world.city.trees) {
    if (Math.abs(tree.x - x) > 30 || Math.abs(tree.y - y) > 30) continue;
    if (Math.hypot(tree.x - x, tree.y - y) < tree.r * 0.5 + 8) return true;
  }
  for (const car of world.cars) {
    if (Math.abs(car.x - x) > 70 || Math.abs(car.y - y) > 70) continue;
    const rel = Math.abs(Math.cos(Math.atan2(y - car.y, x - car.x) - car.angle)) * Math.hypot(x - car.x, y - car.y);
    const rad = rel > car.type.l * 0.32 ? car.type.w * 0.6 : car.type.w * 0.72;
    if (Math.hypot(car.x - x, car.y - y) < rad) return true;
  }
  return false;
}

function validWalkDirs(world, ped) {
  const out = [];
  const tx = Math.floor(ped.x / TILE), ty = Math.floor(ped.y / TILE);
  for (let d = 0; d < 4; d += 1) {
    const v = dirVec(d);
    const nx = tx + Math.round(v[0]), ny = ty + Math.round(v[1]);
    if (tileCodeAt(world.city, (nx + 0.5) * TILE, (ny + 0.5) * TILE) === T_SIDE) out.push(d);
  }
  return out;
}

function pickWalkDir(world, ped) {
  const opts = validWalkDirs(world, ped);
  if (opts.length === 0) return (ped.wdir + 2) % 4;
  if (opts.includes(ped.wdir) && world.rng.chance(0.68)) return ped.wdir;
  return world.rng.pick(opts);
}

function headToSidewalk(world, ped) {
  const tx = Math.floor(ped.x / TILE), ty = Math.floor(ped.y / TILE);
  let best = null;
  for (let oy = -4; oy <= 4; oy += 1) {
    for (let ox = -4; ox <= 4; ox += 1) {
      const cx = (tx + ox + 0.5) * TILE, cy = (ty + oy + 0.5) * TILE;
      if (tileCodeAt(world.city, cx, cy) !== T_SIDE) continue;
      const d = Math.hypot(cx - ped.x, cy - ped.y);
      if (!best || d < best.d) best = { d, x: cx, y: cy };
    }
  }
  if (!best) return false;
  const a = Math.atan2(best.y - ped.y, best.x - ped.x);
  movePed(world, ped, Math.cos(a) * 70, Math.sin(a) * 70, 1 / 60);
  return true;
}

export function spawnPeds(world, dt) {
  world.pedSpawnT = (world.pedSpawnT || 0) - dt;
  const focus = worldFocus(world);
  let alive = 0;
  for (const ped of world.peds) if (!ped.dead && ped.mode !== 'cop' && ped.mode !== 'guard') alive += 1;
  if (world.pedSpawnT <= 0 && alive < 44) {
    world.pedSpawnT = 0.3;
    const spot = randomSidewalkSpot(world, focus.x, focus.y, 320, 900);
    if (spot) {
      const ped = makePed({ x: spot.x, y: spot.y, look: makePedLook(world.rng), mode: 'walk' });
      ped.wdir = world.rng.int(0, 3);
      ped.speed = 44 + world.rng.next() * 22;
      ped.idleT = 0;
      world.peds.push(ped);
    }
  }
}

function randomSidewalkSpot(world, cx, cy, minD, maxD) {
  for (let i = 0; i < 40; i += 1) {
    const a = world.rng.next() * Math.PI * 2;
    const r = minD + world.rng.next() * (maxD - minD);
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 1 || ty < 1 || tx >= 89 || ty >= 89) continue;
    if (tileCodeAt(world.city, (tx + 0.5) * TILE, (ty + 0.5) * TILE) !== T_SIDE) continue;
    return { x: (tx + 0.5) * TILE + world.rng.range(-10, 10), y: (ty + 0.5) * TILE + world.rng.range(-10, 10) };
  }
  return null;
}

export function spawnPigeons(world, dt) {
  world.pigeonT = (world.pigeonT || 0) - dt;
  world.pigeons = world.pigeons || [];
  const focus = worldFocus(world);
  let alive = 0;
  for (const b of world.pigeons) if (!b.gone) alive += 1;
  if (world.pigeonT <= 0 && alive < 10) {
    world.pigeonT = 0.6;
    const spot = randomSidewalkSpot(world, focus.x, focus.y, 100, 520);
    if (spot) world.pigeons.push({ x: spot.x, y: spot.y, wander: world.rng.next() * Math.PI * 2, hopT: 0, fly: 0, gone: false });
  }
}

export function updatePigeons(world, dt) {
  const focus = worldFocus(world);
  const list = world.pigeons || [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const b = list[i];
    if (b.gone) { list.splice(i, 1); continue; }
    if (b.fly > 0) {
      b.fly -= dt;
      b.x += Math.cos(b.wander) * 300 * dt;
      b.y += Math.sin(b.wander) * 300 * dt;
      if (b.fly <= 0) b.gone = true;
      continue;
    }
    if (Math.hypot(b.x - focus.x, b.y - focus.y) < 74) {
      b.fly = 1.1;
      b.wander = Math.atan2(b.y - focus.y, b.x - focus.x);
      continue;
    }
    if (world.rng.chance(0.02)) b.wander += (world.rng.next() - 0.5) * 1.6;
    b.hopT = Math.max(0, (b.hopT || 0) - dt);
    if (b.hopT <= 0 && world.rng.chance(0.04)) b.hopT = 0.35;
    if (b.hopT > 0) {
      b.x += Math.cos(b.wander) * 42 * dt;
      b.y += Math.sin(b.wander) * 42 * dt;
    }
  }
}

export function spawnGang(world, x, y, n, tag) {
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + world.rng.next();
    const r = 26 + world.rng.next() * 60;
    const gx = x + Math.cos(a) * r, gy = y + Math.sin(a) * r;
    const ped = makePed({ x: gx, y: gy, look: makePedLook(world.rng), mode: 'guard', gun: true, hp: 40, mission: tag });
    ped.look.shirt = world.rng.pick(['#6a2f9e', '#54297e', '#8a3fc2']);
    ped.home = { x: gx, y: gy };
    ped.shootT = world.rng.range(0.5, 1.4);
    world.peds.push(ped);
  }
}

export function updatePeds(world, dt) {
  const focus = worldFocus(world);
  for (let i = world.peds.length - 1; i >= 0; i -= 1) {
    const ped = world.peds[i];
    if (ped.dead) {
      ped.corpseT -= dt;
      if (ped.corpseT <= 0) world.peds.splice(i, 1);
      continue;
    }
    if (ped.mode === 'cop') continue;
    if (ped.mode === 'stand') { runoverCheck(world, ped); continue; }
    const d = dist(ped.x, ped.y, focus.x, focus.y);
    if (ped.mode !== 'guard' && d > 1500) { world.peds.splice(i, 1); continue; }
    if (ped.mode === 'guard') { updateGuard(world, ped, dt); runoverCheck(world, ped); continue; }
    if (ped.fleeT > 0) {
      ped.fleeT -= dt;
      const speed = 165;
      ped.angle = ped.fleeDir;
      ped.walkT += dt * 14;
      movePed(world, ped, Math.cos(ped.fleeDir) * speed, Math.sin(ped.fleeDir) * speed, dt);
      if (ped.fleeT <= 0) { ped.mode = 'walk'; ped.wdir = pickWalkDir(world, ped); }
    } else if (ped.idleT > 0) {
      ped.idleT -= dt;
    } else {
      const onSidewalk = tileCodeAt(world.city, ped.x, ped.y) === T_SIDE;
      if (!onSidewalk) {
        if (!headToSidewalk(world, ped)) {
          ped.wdir = (ped.wdir + 2) % 4;
          const v = dirVec(ped.wdir);
          movePed(world, ped, v[0] * ped.speed, v[1] * ped.speed, dt);
        }
        ped.angle = ped.wdir * Math.PI / 2;
        ped.walkT += dt * 9;
      } else {
        const v = dirVec(ped.wdir);
        const aheadX = ped.x + v[0] * 22, aheadY = ped.y + v[1] * 22;
        const aheadOk = tileCodeAt(world.city, aheadX, aheadY) === T_SIDE;
        if (!aheadOk) ped.wdir = pickWalkDir(world, ped);
        else if (world.rng.chance(0.004)) { ped.idleT = 1 + world.rng.next() * 2; }
        else if (world.rng.chance(0.006)) ped.wdir = pickWalkDir(world, ped);
        const nv = dirVec(ped.wdir);
        const moved = movePed(world, ped, nv[0] * ped.speed, nv[1] * ped.speed, dt);
        ped.angle = Math.atan2(nv[1], nv[0]);
        ped.walkT += dt * 9;
        if (!moved) ped.wdir = pickWalkDir(world, ped);
      }
    }
    runoverCheck(world, ped);
  }
}

function runoverCheck(world, ped) {
  for (const car of world.cars) {
    const sp = Math.hypot(car.vx, car.vy);
    if (sp < 80 || car.dead) continue;
    if (Math.abs(car.x - ped.x) > 70 || Math.abs(car.y - ped.y) > 70) continue;
    const c = Math.cos(car.angle), s = Math.sin(car.angle);
    const fx = car.x + c * car.type.l * 0.32, fy = car.y + s * car.type.l * 0.32;
    if (Math.hypot(fx - ped.x, fy - ped.y) < car.type.w * 0.6 + 7 || Math.hypot(car.x - ped.x, car.y - ped.y) < car.type.w * 0.62) {
      killPed(world, ped, car.control === 'player' ? 'player' : 'traffic');
      world.audio.crash(sp);
      car.speed *= 0.92;
      return;
    }
  }
}

function updateGuard(world, ped, dt) {
  const focus = worldFocus(world);
  const d = dist(ped.x, ped.y, focus.x, focus.y);
  const see = d < 520 && hasLOS(world.city, ped.x, ped.y, focus.x, focus.y);
  if (see) {
    ped.angle = Math.atan2(focus.y - ped.y, focus.x - ped.x);
    ped.strafe += dt * 1.4;
    const side = Math.sin(ped.strafe) * 40;
    const px = -Math.sin(ped.angle), py = Math.cos(ped.angle);
    const want = d > 260 ? 60 : d < 150 ? -40 : 0;
    movePed(world, ped, Math.cos(ped.angle) * want + px * side * 0.6, Math.sin(ped.angle) * want + py * side * 0.6, dt);
    ped.walkT += dt * 8;
    ped.shootT -= dt;
    if (ped.shootT <= 0 && d < 460) {
      ped.shootT = 0.85 + world.rng.next() * 0.5;
      fireBullet(world, 'gang', ped.x + Math.cos(ped.angle) * 14, ped.y + Math.sin(ped.angle) * 14, ped.angle + (world.rng.next() - 0.5) * 0.14, { dmg: 9, speed: 820 });
      world.audio.shot();
      world.muzzle = { x: ped.x + Math.cos(ped.angle) * 18, y: ped.y + Math.sin(ped.angle) * 18, angle: ped.angle, t: 0.05 };
    }
  } else {
    ped.shootT = Math.max(ped.shootT, 0.4);
    const hd = dist(ped.x, ped.y, ped.home.x, ped.home.y);
    if (hd > 90) {
      const a = Math.atan2(ped.home.y - ped.y, ped.home.x - ped.x);
      movePed(world, ped, Math.cos(a) * 50, Math.sin(a) * 50, dt);
      ped.angle = a;
      ped.walkT += dt * 8;
    } else if (world.rng.chance(0.01)) {
      ped.angle = world.rng.next() * Math.PI * 2;
    }
  }
}
