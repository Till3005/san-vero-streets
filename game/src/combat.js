import { PLAYER } from './config.js';
import { makeBullet } from './entities.js';
import { wallAt, hasLOS } from './city.js';
import { addPart, sparks, bloodFx, glassFx, explosionFx, shake, float } from './fx.js';
import { crime } from './police.js';

export function fireBullet(world, owner, x, y, angle, spec) {
  const s = spec || {};
  const speed = s.speed || 900;
  world.bullets.push(makeBullet(x + Math.cos(angle) * 14, y + Math.sin(angle) * 14, Math.cos(angle) * speed, Math.sin(angle) * speed, s.dmg || 10, owner));
  world.muzzle = { x: x + Math.cos(angle) * 18, y: y + Math.sin(angle) * 18, angle, t: 0.05 };
}

export function playerFire(world, aimX, aimY) {
  const p = world.player;
  if (p.fireT > 0 || p.inCar && p.inCar.dead) return;
  p.fireT = PLAYER.fireDelay;
  const src = p.inCar || p;
  const a = Math.atan2(aimY - src.y, aimX - src.x);
  fireBullet(world, 'player', src.x, src.y, a, { dmg: PLAYER.gunDmg, speed: PLAYER.bulletSpeed });
  world.audio.shot();
  shake(world.fx, 1.2);
  panicArea(world, src.x, src.y, 280);
}

export function panicArea(world, x, y, radius) {
  for (const ped of world.peds) {
    if (ped.dead || ped.mode === 'cop' || ped.mode === 'guard') continue;
    if (Math.hypot(ped.x - x, ped.y - y) < radius) {
      ped.mode = 'flee';
      ped.fleeDir = Math.atan2(ped.y - y, ped.x - x) + (Math.random() - 0.5) * 0.5;
      ped.fleeT = 3 + Math.random() * 2;
    }
  }
  for (const car of world.cars) {
    if (car.control === 'ai' && !car.dead && Math.hypot(car.x - x, car.y - y) < radius * 1.4) car.panicT = 6;
  }
}

function witnessShot(world, x, y) {
  for (const ped of world.peds) {
    if (!ped.dead && Math.hypot(ped.x - x, ped.y - y) < 320) return true;
  }
  return false;
}

export function damageCar(world, car, dmg, src) {
  if (car.dead) return;
  car.hp -= dmg;
  if (car.hp <= car.maxHp * 0.15 && !car.burning && !car.dead) {
    car.burning = true;
    car.burnT = 2.6;
  }
  if (car.hp <= 0) {
    car.dead = true;
    car.burning = false;
    car.hasDriver = false;
    explode(world, car.x, car.y, src === 'player' ? 'player' : 'other');
    if (world.player.inCar === car) damagePlayer(world, 500);
    if (car.kind === 'police' && (src === 'player' || src === 'crash')) crime(world, 80);
    if (car.mission === 'm2car' && world.mission) world.missionFailed = true;
    if (car.kind === 'boss' && world.mission && world.mission.def.id === 'm6') {
      if (car.mission === 'boss') world.mission.bossDown = true;
    }
  }
}

export function damagePed(world, ped, dmg, src) {
  if (ped.dead) return;
  ped.hp -= dmg;
  bloodFx(world.fx, ped.x, ped.y);
  world.audio.hit();
  if (ped.hp <= 0) killPed(world, ped, src);
  else if (ped.mode !== 'cop' && ped.mode !== 'guard') {
    ped.mode = 'flee';
    ped.fleeT = 4;
  }
}

export function killPed(world, ped, src) {
  if (ped.dead) return;
  ped.dead = true;
  ped.corpseT = 24;
  bloodFx(world.fx, ped.x, ped.y);
  panicArea(world, ped.x, ped.y, 240);
  if (src === 'player') {
    world.stats.kills += 1;
    if (ped.mode === 'cop') crime(world, 60);
    else if (ped.mode === 'guard') crime(world, 15);
    else crime(world, 25);
    if (ped.mode !== 'cop' && Math.random() < 0.55) {
      const amt = 10 + Math.floor(Math.random() * 35);
      world.cash += amt;
      float(world.fx, ped.x, ped.y, `+$${amt}`, '#57d977', 13);
    }
  }
}

export function damagePlayer(world, dmg) {
  const p = world.player;
  if (p.hp <= 0) return;
  p.hp -= dmg;
  p.lastHurt = world.time;
  bloodFx(world.fx, p.x, p.y);
  shake(world.fx, 3);
  if (p.hp <= 0) {
    p.hp = 0;
    world.pendingWasted = true;
  }
}

export function explode(world, x, y, src) {
  explosionFx(world.fx, x, y);
  shake(world.fx, 13);
  world.audio.explosion();
  panicArea(world, x, y, 420);
  for (const car of world.cars) {
    if (car.dead) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < 135 && d > 1) damageCar(world, car, 85 * (1 - d / 135), src);
  }
  for (const ped of world.peds) {
    if (ped.dead) continue;
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < 95) damagePed(world, ped, 200, src);
  }
  const p = world.player;
  const pd = Math.hypot(p.x - x, p.y - y);
  if (!p.inCar && pd < 115) damagePlayer(world, 70 * (1 - pd / 115));
  if (src === 'player') crime(world, 12);
  world.explosions = (world.explosions || 0) + 1;
}

export function updateBullets(world, dt) {
  const city = world.city;
  const p = world.player;
  for (let i = world.bullets.length - 1; i >= 0; i -= 1) {
    const b = world.bullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let hit = false;
    if (b.life <= 0) hit = true;
    else if (wallAt(city, b.x, b.y)) {
      sparks(world.fx, b.x, b.y, 4, '#d8d0b8', 90);
      world.audio.hit();
      hit = true;
    }
    if (!hit) {
      for (const car of world.cars) {
        if (car.dead && b.life < 0.7) continue;
        const dx = car.x - b.x, dy = car.y - b.y;
        if (dx * dx + dy * dy > 3600) continue;
        const rel = Math.abs(Math.cos(Math.atan2(dy, dx) - car.angle)) * Math.hypot(dx, dy);
        const rad = rel > car.type.l * 0.33 ? car.type.w * 0.62 : car.type.w * 0.72;
        if (Math.hypot(dx, dy) < rad) {
          if (b.owner !== 'player' || car !== p.inCar) {
            damageCar(world, car, b.dmg, b.owner);
            sparks(world.fx, b.x, b.y, 5, '#f2c14b', 120);
            glassFx(world.fx, b.x, b.y);
            if (car.kind === 'police' && b.owner === 'player') crime(world, 4);
            world.audio.hit();
          }
          hit = true;
          break;
        }
      }
    }
    if (!hit) {
      for (const ped of world.peds) {
        if (ped.dead) continue;
        if (ped.mode === 'cop' && b.owner === 'cop') continue;
        if (Math.hypot(ped.x - b.x, ped.y - b.y) < 11) {
          damagePed(world, ped, b.dmg, b.owner);
          hit = true;
          break;
        }
      }
    }
    if (!hit && b.owner !== 'player' && !p.inCar) {
      if (Math.hypot(p.x - b.x, p.y - b.y) < 12) {
        damagePlayer(world, b.dmg);
        bloodFx(world.fx, b.x, b.y);
        hit = true;
      }
    }
    if (!hit && b.owner !== 'player' && p.inCar) {
      const car = p.inCar;
      if (Math.hypot(car.x - b.x, car.y - b.y) < car.type.l * 0.42) {
        damageCar(world, car, b.dmg * 0.6, b.owner);
        sparks(world.fx, b.x, b.y, 4, '#f2c14b', 100);
        hit = true;
      }
    }
    if (hit) world.bullets.splice(i, 1);
  }
}

export function copCanSee(world, x, y) {
  for (const car of world.cars) {
    if (car.kind === 'police' && car.control === 'cop' && !car.dead && Math.hypot(car.x - x, car.y - y) < 560 && hasLOS(world.city, car.x, car.y, x, y)) return true;
  }
  for (const ped of world.peds) {
    if (ped.mode === 'cop' && !ped.dead && Math.hypot(ped.x - x, ped.y - y) < 520 && hasLOS(world.city, ped.x, ped.y, x, y)) return true;
  }
  return false;
}
