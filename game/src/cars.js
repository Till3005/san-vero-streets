import { TILE, PERIOD, dirAngle, dirVec, CIV_TYPES, CAR_COLORS, CAR_TYPES } from './config.js';
import { isRoadTile, isJunction, solidAt, nearestLanePoint, randomRoadSpawn, laneCoord, lightGreenNS, tileCodeAt } from './city.js';
import { makeCar } from './entities.js';
import { sparks, smokePuff, fireFx, skid, dustFx, shake } from './fx.js';
import { damageCar, explode } from './combat.js';
import { angDiff, clamp, dist } from './random.js';

export function spawnParkedCars(world) {
  const rng = world.rng;
  for (const lot of world.city.lots) {
    for (const bay of lot.bays) {
      if (!rng.chance(0.62)) continue;
      const kind = rng.pick(CIV_TYPES);
      const car = makeCar({ x: bay.x, y: bay.y, angle: bay.angle, kind, color: rng.pick(CAR_COLORS), control: 'off', parked: true });
      world.cars.push(car);
    }
  }
}

export function spawnTraffic(world, dt) {
  world.spawnT = (world.spawnT || 0) - dt;
  const focus = worldFocus(world);
  let alive = 0;
  for (const car of world.cars) if (car.control === 'ai' && !car.dead) alive += 1;
  if (world.spawnT <= 0 && alive < 32) {
    world.spawnT = 0.35;
    const playerCar = world.player.inCar;
    const driving = playerCar && Math.hypot(playerCar.vx, playerCar.vy) > 60;
    let spot = null;
    for (let tries = 0; tries < 5 && !spot; tries += 1) {
      const cand = randomRoadSpawn(world.city, focus.x, focus.y, 420, 1000, world.rng);
      if (!cand) continue;
      if (driving) {
        const dx = cand.x - playerCar.x, dy = cand.y - playerCar.y;
        const along = dx * Math.cos(playerCar.angle) + dy * Math.sin(playerCar.angle);
        const side = Math.abs(-dx * Math.sin(playerCar.angle) + dy * Math.cos(playerCar.angle));
        if (along > -150 && along < 900 && side < 130) continue;
      }
      spot = cand;
    }
    if (spot) {
      const kind = world.rng.pick(CIV_TYPES);
      const cruise = CAR_TYPES[kind].max * (0.45 + world.rng.next() * 0.15);
      world.cars.push(makeCar({ x: spot.x, y: spot.y, angle: dirAngle(spot.dir), kind, color: world.rng.pick(CAR_COLORS), control: 'ai', parked: false, hasDriver: true, dir: spot.dir, cruise }));
    }
  }
}

export function worldFocus(world) {
  const p = world.player;
  return p.inCar ? p.inCar : p;
}

function lanePointFor(dir, base, along) {
  if (dir === 0) return { x: along, y: laneCoord(0, base) };
  if (dir === 2) return { x: along, y: laneCoord(2, base) };
  if (dir === 1) return { x: laneCoord(1, base), y: along };
  return { x: laneCoord(3, base), y: along };
}

export function updateTraffic(world, car, dt) {
  const city = world.city;
  const tx = Math.floor(car.x / TILE), ty = Math.floor(car.y / TILE);
  const jx = tx % PERIOD < 2, jy = ty % PERIOD < 2;
  const inJunction = isJunction(city, tx, ty);
  if (inJunction && !car.plan) {
    const jid = (tx - (tx % PERIOD)) * 100 + (ty - (ty % PERIOD));
    if (car.lastJ !== jid) {
      car.lastJ = jid;
      const c0 = tx - (tx % PERIOD), r0 = ty - (ty % PERIOD);
      const cx = c0 * TILE + TILE, cy = r0 * TILE + TILE;
      const options = [];
      const cand = [[car.dir, 0.55], [(car.dir + 1) % 4, 0.25], [(car.dir + 3) % 4, 0.2]];
      for (const [d, w] of cand) {
        const v = dirVec(d);
        if (isRoadTile(city, Math.floor((cx + v[0] * TILE * 1.8) / TILE), Math.floor((cy + v[1] * TILE * 1.8) / TILE))) options.push([d, w]);
      }
      if (options.length === 0) {
        car.dir = (car.dir + 2) % 4;
      } else {
        let total = 0;
        for (const o of options) total += o[1];
        let roll = world.rng.next() * total, exitDir = options[0][0];
        for (const o of options) { roll -= o[1]; if (roll <= 0) { exitDir = o[0]; break; } }
        if (exitDir !== car.dir) {
          let corner;
          if (car.dir === 0 || car.dir === 2) {
            const exitLaneX = exitDir === 1 ? laneCoord(1, c0) : laneCoord(3, c0);
            corner = { x: exitLaneX, y: car.y };
          } else {
            const exitLaneY = exitDir === 0 ? laneCoord(0, r0) : laneCoord(2, r0);
            corner = { x: car.x, y: exitLaneY };
          }
          car.plan = { x: corner.x, y: corner.y, exitDir };
        }
      }
    }
  }
  if (car.plan && dist(car.x, car.y, car.plan.x, car.plan.y) < 18) {
    car.dir = car.plan.exitDir;
    car.plan = null;
  }
  let target;
  if (car.plan) target = car.plan;
  else {
    const v = dirVec(car.dir);
    if (car.dir === 0 || car.dir === 2) {
      const base = Math.floor(car.y / TILE) - (Math.floor(car.y / TILE) % PERIOD);
      target = lanePointFor(car.dir, base, car.x + v[0] * 56);
    } else {
      const base = Math.floor(car.x / TILE) - (Math.floor(car.x / TILE) % PERIOD);
      target = lanePointFor(car.dir, base, car.y + v[1] * 56);
    }
  }
  const desired = Math.atan2(target.y - car.y, target.x - car.x);
  const diff = angDiff(car.angle, desired);
  const turnRate = 2.6;
  car.angle += clamp(diff, -turnRate * dt, turnRate * dt) * clamp(Math.abs(car.speed) / 60, 0.4, 1.4);
  if (car.dir === 0 || car.dir === 2) {
    const base = Math.floor(car.y / TILE) - (Math.floor(car.y / TILE) % PERIOD);
    const ly = laneCoord(car.dir === 0 ? 0 : 2, base);
    car.y += (ly - car.y) * Math.min(1, 3 * dt);
  } else {
    const base = Math.floor(car.x / TILE) - (Math.floor(car.x / TILE) % PERIOD);
    const lx = laneCoord(car.dir === 1 ? 1 : 3, base);
    car.x += (lx - car.x) * Math.min(1, 3 * dt);
  }
  let cruise = car.cruise * (car.panicT > 0 ? 1.6 : 1);
  if (car.panicT > 0) car.panicT -= dt;
  if (Math.abs(diff) > 0.5) cruise *= 0.45;
  if (!inJunction && car.plan === null && !(car.panicT > 0)) {
    const ahead = nextJunctionDist(car);
    if (ahead !== null && ahead < 84) {
      const nsGreen = lightGreenNS(world.time);
      const myAxisNS = car.dir === 1 || car.dir === 3;
      const green = myAxisNS ? nsGreen : !nsGreen;
      if (!green) cruise = Math.min(cruise, clamp((ahead - 18) * 3.2, 0, cruise));
    }
  }
  const hx = Math.cos(car.angle), hy = Math.sin(car.angle);
  const probeX = car.x + hx * (44 + car.speed * 0.4), probeY = car.y + hy * (44 + car.speed * 0.4);
  for (const other of world.cars) {
    if (other === car || other.dead && other.deadT > 8) continue;
    const d = dist(probeX, probeY, other.x, other.y);
    if (d < 36) {
      const toOther = Math.atan2(other.y - car.y, other.x - car.x);
      if (Math.abs(angDiff(car.angle, toOther)) < 1.1) cruise = Math.min(cruise, Math.max(0, other.speed - 30));
    }
  }
  for (const ped of world.peds) {
    if (ped.dead) continue;
    if (dist(probeX, probeY, ped.x, ped.y) < 30) cruise = 0;
    const closeX = car.x + hx * 30, closeY = car.y + hy * 30;
    if (dist(closeX, closeY, ped.x, ped.y) < 22) cruise = 0;
  }
  if (car.speed < cruise) car.speed = Math.min(cruise, car.speed + 200 * dt);
  else car.speed = Math.max(cruise, car.speed - 480 * dt);
  car.vx = hx * car.speed;
  car.vy = hy * car.speed;
}

function nextJunctionDist(car) {
  const tx = Math.floor(car.x / TILE), ty = Math.floor(car.y / TILE);
  if (car.dir === 0) {
    const c0 = (Math.floor(tx / PERIOD) + 1) * PERIOD;
    if (tx % PERIOD >= 2) return c0 * TILE - car.x;
    return null;
  }
  if (car.dir === 2) {
    const c0 = (Math.ceil(tx / PERIOD) - 1) * PERIOD;
    if (tx % PERIOD >= 2) return car.x - (c0 + 2) * TILE;
    return null;
  }
  if (car.dir === 1) {
    const r0 = (Math.floor(ty / PERIOD) + 1) * PERIOD;
    if (ty % PERIOD >= 2) return r0 * TILE - car.y;
    return null;
  }
  const r0 = (Math.ceil(ty / PERIOD) - 1) * PERIOD;
  if (ty % PERIOD >= 2) return car.y - (r0 + 2) * TILE;
  return null;
}

export function driveKinematics(world, car, dt, throttle, steerInput, handbrake) {
  const t = car.type;
  const cos = Math.cos(car.angle), sin = Math.sin(car.angle);
  let fwd = car.vx * cos + car.vy * sin;
  let lat = -car.vx * sin + car.vy * cos;
  if (throttle > 0) fwd += t.accel * throttle * dt * (fwd < 0 ? 2 : 1);
  else if (throttle < 0) {
    if (fwd > 10) fwd += t.accel * 2.4 * throttle * dt;
    else fwd += t.accel * 0.65 * throttle * dt;
  }
  fwd -= fwd * 0.5 * dt;
  fwd = clamp(fwd, -t.max * 0.35, t.max);
  const grip = handbrake ? 2.4 : t.grip;
  lat *= Math.max(0, 1 - grip * dt);
  if (handbrake) fwd *= Math.max(0, 1 - 1.4 * dt);
  car.angle += steerInput * 2.5 * clamp(fwd / 240, -1, 1) * dt;
  car.vx = Math.cos(car.angle) * fwd - Math.sin(car.angle) * lat;
  car.vy = Math.sin(car.angle) * fwd + Math.cos(car.angle) * lat;
  car.speed = fwd;
  if (handbrake && Math.abs(fwd) > 110) {
    const bx = car.x - cos * t.l * 0.3, by = car.y - sin * t.l * 0.3;
    skid(world.fx, bx - sin * t.w * 0.32, by + cos * t.w * 0.32, car.angle);
    skid(world.fx, bx + sin * t.w * 0.32, by - cos * t.w * 0.32, car.angle);
    if (Math.random() < 0.3) dustFx(world.fx, bx, by);
  }
}

function carCircles(car) {
  const c = Math.cos(car.angle), s = Math.sin(car.angle);
  const o = car.type.l * 0.28;
  return [
    { x: car.x + c * o, y: car.y + s * o, r: car.type.w * 0.58 },
    { x: car.x - c * o, y: car.y - s * o, r: car.type.w * 0.58 },
  ];
}

function collideCarTiles(world, car) {
  const cos = Math.cos(car.angle), sin = Math.sin(car.angle);
  for (const circ of carCircles(car)) {
    const tx = Math.floor(circ.x / TILE), ty = Math.floor(circ.y / TILE);
    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        const cx = tx + ox, cy = ty + oy;
        if (!solidAt(world.city, (cx + 0.5) * TILE, (cy + 0.5) * TILE)) continue;
        const rx0 = cx * TILE, ry0 = cy * TILE;
        const nx = clamp(circ.x, rx0, rx0 + TILE), ny = clamp(circ.y, ry0, ry0 + TILE);
        let dx = circ.x - nx, dy = circ.y - ny;
        let d = Math.hypot(dx, dy);
        if (d >= circ.r) continue;
        if (d < 0.001) {
          dx = Math.sin(car.angle); dy = -Math.cos(car.angle); d = 0.001;
        }
        const ux = dx / d, uy = dy / d;
        const push = circ.r - d;
        car.x += ux * push;
        car.y += uy * push;
        const vn = car.vx * ux + car.vy * uy;
        if (vn < 0) {
          const impact = -vn;
          car.vx -= ux * vn * 1.5;
          car.vy -= uy * vn * 1.5;
          car.vx *= 0.72;
          car.vy *= 0.72;
          car.speed *= 0.5;
          if (impact > 130) {
            const dmg = (impact - 130) * 0.14;
            damageCar(world, car, dmg, 'crash');
            sparks(world.fx, circ.x, circ.y, 6, '#d8d0b8', 130);
            world.audio.crash(impact);
            if (world.player.inCar === car) shake(world.fx, Math.min(10, impact * 0.02));
          }
        }
      }
    }
  }
  const M = 60;
  if (car.x < M) { car.x = M; car.vx = Math.max(0, car.vx); }
  if (car.y < M) { car.y = M; car.vy = Math.max(0, car.vy); }
  if (car.x > 90 * TILE - M) { car.x = 90 * TILE - M; car.vx = Math.min(0, car.vx); }
  if (car.y > 90 * TILE - M) { car.y = 90 * TILE - M; car.vy = Math.min(0, car.vy); }
}

function collideCars(world) {
  const cars = world.cars;
  for (let i = 0; i < cars.length; i += 1) {
    const a = cars[i];
    if (a.dead && a.deadT > 6) continue;
    for (let j = i + 1; j < cars.length; j += 1) {
      const b = cars[j];
      if (b.dead && b.deadT > 6) continue;
      if (Math.abs(a.x - b.x) > 150 || Math.abs(a.y - b.y) > 150) continue;
      const ca = carCircles(a), cb = carCircles(b);
      const ma = a.type.mass * (a.parked && Math.hypot(a.vx, a.vy) < 10 ? 1.7 : 1);
      const mb = b.type.mass * (b.parked && Math.hypot(b.vx, b.vy) < 10 ? 1.7 : 1);
      for (const pa of ca) {
        for (const pb of cb) {
          const dx = pb.x - pa.x, dy = pb.y - pa.y;
          const d = Math.hypot(dx, dy);
          const rr = pa.r + pb.r;
          if (d >= rr || d < 0.001) continue;
          const ux = dx / d, uy = dy / d;
          const overlap = rr - d;
          const total = ma + mb;
          a.x -= ux * overlap * (mb / total);
          a.y -= uy * overlap * (mb / total);
          b.x += ux * overlap * (ma / total);
          b.y += uy * overlap * (ma / total);
          const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
          const vn = rvx * ux + rvy * uy;
          if (vn < 0) {
            const jimp = -vn * 1.1 / total;
            a.vx -= ux * jimp * mb;
            a.vy -= uy * jimp * mb;
            b.vx += ux * jimp * ma;
            b.vy += uy * jimp * ma;
            const impact = -vn;
            if (impact > 140) {
              const dmg = (impact - 140) * 0.12;
              const src = world.player.inCar === a || world.player.inCar === b ? 'player' : 'crash';
              damageCar(world, a, dmg, a.kind === 'police' && src === 'player' ? 'player' : 'crash');
              damageCar(world, b, dmg, b.kind === 'police' && src === 'player' ? 'player' : 'crash');
              sparks(world.fx, (pa.x + pb.x) / 2, (pa.y + pb.y) / 2, 7, '#d8d0b8', 150);
              world.audio.crash(impact);
              if (src === 'player') shake(world.fx, Math.min(12, impact * 0.03));
            }
            a.parked = false;
            b.parked = false;
          }
        }
      }
    }
  }
}

export function updateCars(world, dt) {
  const focus = worldFocus(world);
  for (let i = world.cars.length - 1; i >= 0; i -= 1) {
    const car = world.cars[i];
    if (car.dead) {
      car.deadT += dt;
      if (Math.random() < 0.12) smokePuff(world.fx, car.x + (Math.random() - 0.5) * 20, car.y + (Math.random() - 0.5) * 20, true);
      if (car.deadT > 26 && car.mission !== 'boss' && dist(car.x, car.y, focus.x, focus.y) > 900) world.cars.splice(i, 1);
      continue;
    }
    if (car.burning) {
      car.burnT -= dt;
      fireFx(world.fx, car.x + (Math.random() - 0.5) * car.type.l * 0.5, car.y + (Math.random() - 0.5) * car.type.w * 0.5);
      if (car.burnT <= 0) {
        car.dead = true;
        car.burning = false;
        car.hasDriver = false;
        explode(world, car.x, car.y, world.player.inCar === car ? 'player' : 'other');
        if (world.player.inCar === car) world.pendingWasted = true;
        continue;
      }
    } else if (car.hp < car.maxHp * 0.45 && Math.random() < 0.35) {
      smokePuff(world.fx, car.x + Math.cos(car.angle) * car.type.l * 0.35, car.y + Math.sin(car.angle) * car.type.l * 0.35, car.hp < car.maxHp * 0.2);
    }
    const moving = Math.hypot(car.vx, car.vy) > 4;
    if (car.control === 'ai' && car.hasDriver) updateTraffic(world, car, dt);
    if (!car.parked || moving) {
      car.x += car.vx * dt;
      car.y += car.vy * dt;
      collideCarTiles(world, car);
    }
    const d = dist(car.x, car.y, focus.x, focus.y);
    if (d > 2300 && car.control === 'ai') world.cars.splice(i, 1);
  }
  collideCars(world);
}
