import { generateCity } from './city.js';
import { WORLD_PX } from './config.js';
import { createRandom, clamp } from './random.js';
import { createFx, updateFx, float } from './fx.js';
import { createAudio } from './audio.js';
import { spawnParkedCars, spawnTraffic, updateCars, worldFocus } from './cars.js';
import { spawnPeds, updatePeds } from './peds.js';
import { updateCops, clearCops, resetWanted } from './police.js';
import { updatePlayer, exitCar } from './player.js';
import { updateBullets } from './combat.js';
import { updateMissions, updateConvoy, objectiveText, MISSION_COUNT } from './missions.js';
import { writeSave } from './save.js';

const CITY = { diner: { x: 1008, y: 2136 } };

export function createWorld(seed) {
  const city = generateCity(seed);
  const site = city.sites.diner;
  const world = {
    seed,
    city,
    rng: createRandom((seed ^ 0xbeef11) >>> 0),
    audio: createAudio(),
    player: {
      x: site.x + 96, y: site.y + 4,
      angle: Math.PI, hp: 100, maxHp: 100,
      inCar: null, fireT: 0, walkT: 0, lastHurt: -99,
    },
    cars: [],
    peds: [],
    bullets: [],
    fx: createFx(),
    cam: { x: site.x + 96, y: site.y + 4, zoom: 1.1, sx: 0, sy: 0 },
    viewW: 1280,
    viewH: 800,
    time: 0,
    cash: 250,
    missionIdx: 0,
    mission: null,
    missionFailed: false,
    wins: false,
    wanted: { pts: 0, stars: 0, heat: false, evadeT: 0, bustT: 0 },
    dialog: null,
    banner: null,
    muzzle: null,
    stats: { kills: 0, jacked: 0 },
    pendingWasted: false,
    pendingBusted: false,
    pendingWin: false,
  };
  spawnParkedCars(world);
  for (let i = 0; i < 26; i += 1) spawnTraffic(world, 0.5);
  for (let i = 0; i < 30; i += 1) spawnPeds(world, 0.4);
  world.cam.x = world.player.x;
  world.cam.y = world.player.y;
  return world;
}

export function applySave(world, sv) {
  world.cash = sv.cash;
  world.missionIdx = Math.min(sv.mission || 0, MISSION_COUNT);
  world.wins = !!sv.wins;
  world.stats.kills = sv.kills || 0;
  world.stats.jacked = sv.jacked || 0;
  world.audio.muted = !!sv.muted;
  if (world.audio.master) world.audio.master.gain.value = world.audio.muted ? 0 : 0.5;
  const site = world.city.sites.diner;
  world.player.x = site.x + 96;
  world.player.y = site.y + 4;
  world.player.hp = 100;
  world.cam.x = world.player.x;
  world.cam.y = world.player.y;
}

export function respawn(world, reason) {
  const p = world.player;
  if (p.inCar) exitCar(world, true);
  const key = reason === 'busted' ? 'pd' : 'hospital';
  const site = world.city.sites[key];
  p.x = site.x + 20;
  p.y = site.y + 6;
  p.hp = 100;
  p.lastHurt = world.time;
  const fee = reason === 'busted' ? 250 : 150;
  const lost = Math.min(world.cash, fee);
  world.cash -= lost;
  resetWanted(world);
  clearCops(world);
  for (let i = world.bullets.length - 1; i >= 0; i -= 1) world.bullets.splice(i, 1);
  world.cam.x = p.x;
  world.cam.y = p.y;
  world.banner = null;
  float(world.fx, p.x, p.y, `-$${lost}`, '#e05252', 16);
  writeSave(world);
}

export function step(world, input, dt) {
  world.time += dt;
  updatePlayer(world, input, dt);
  updateCops(world, dt);
  spawnTraffic(world, dt);
  updateCars(world, dt);
  updateConvoy(world, dt);
  spawnPeds(world, dt);
  updatePeds(world, dt);
  updateBullets(world, dt);
  updateMissions(world, dt);
  if (world.muzzle) {
    world.muzzle.t -= dt;
    if (world.muzzle.t <= 0) world.muzzle = null;
  }
  updateFx(world.fx, dt);
  if (world.banner) {
    world.banner.age += dt;
    if (world.banner.age > world.banner.dur) world.banner = null;
  }
  const focus = worldFocus(world);
  const cam = world.cam;
  const lead = focus === world.player ? 0 : 0.28;
  const tx = focus.x + (focus.vx || 0) * lead;
  const ty = focus.y + (focus.vy || 0) * lead;
  cam.x += (tx - cam.x) * Math.min(1, 4 * dt);
  cam.y += (ty - cam.y) * Math.min(1, 4 * dt);
  const halfW = world.viewW / 2 / cam.zoom;
  const halfH = world.viewH / 2 / cam.zoom;
  cam.x = clamp(cam.x, halfW, WORLD_PX - halfW);
  cam.y = clamp(cam.y, halfH, WORLD_PX - halfH);
  const speed = Math.hypot(focus.vx || 0, focus.vy || 0);
  const targetZoom = world.player.inCar ? clamp(1.04 - speed / 2400, 0.82, 1.04) : 1.12;
  cam.zoom += (targetZoom - cam.zoom) * Math.min(1, 2.4 * dt);
  const sh = world.fx.shake;
  cam.sx = (Math.random() - 0.5) * sh;
  cam.sy = (Math.random() - 0.5) * sh;
  world.audio.update(world);
  world.objective = objectiveText(world);
}
