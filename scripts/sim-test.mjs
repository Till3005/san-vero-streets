import { createWorld, step, respawn, applySave } from '../game/src/world.js';
import { advanceDialog, missionMarker, MISSION_COUNT } from '../game/src/missions.js';
import { jackCar } from '../game/src/player.js';
import { damageCar, damagePed } from '../game/src/combat.js';
import { crime, resetWanted } from '../game/src/police.js';
import { writeSave } from '../game/src/save.js';
import { dist } from '../game/src/random.js';

const world = createWorld(7);
const p = world.player;
const input = (o) => Object.assign({ up: false, down: false, left: false, right: false, fire: false, sprint: false, handbrake: false, action: false, aimX: 0, aimY: 0 }, o);
let failures = 0;
function check(name, cond) {
  if (cond) console.log('PASS', name);
  else { console.log('FAIL', name); failures += 1; }
}
function run(seconds, inp) {
  for (let i = 0; i < seconds * 60; i += 1) step(world, inp || input({}), 1 / 60);
}
function drainDialog() {
  let guard = 0;
  while (world.dialog && guard < 10) { advanceDialog(world); guard += 1; }
}
function beginJob(site, id) {
  p.inCar = null;
  p.x = site.x;
  p.y = site.y;
  run(0.4);
  drainDialog();
  run(0.4);
  drainDialog();
  run(0.3);
  check(`${id} active`, !!world.mission && world.mission.def.id === id);
}

check('city has sites', world.city.sites.diner && world.city.sites.pd && world.city.sites.docks);
check('parked cars spawned', world.cars.length > 8);
check('mission marker at diner', dist(missionMarker(world).x, missionMarker(world).y, world.city.sites.diner.x, world.city.sites.diner.y) < 2);

p.x = world.city.sites.diner.x;
p.y = world.city.sites.diner.y;
run(0.4);
check('m1 dialog opened', !!world.dialog);
drainDialog();
run(0.4);
check('m1 active', !!world.mission && world.mission.def.id === 'm1');
const m1car = world.mission.data.car;
jackCar(world, m1car);
run(0.5);
check('m1 stage 1 (drive yara)', world.mission.stage === 1);
p.inCar.x = world.city.sites.docks.x + 20;
p.inCar.y = world.city.sites.docks.y;
p.inCar.vx = 10; p.inCar.vy = 0;
run(1.5);
check('m1 completed, cash +300', world.missionIdx === 1 && world.cash >= 550);
check('writeSave safe', (() => { try { writeSave(world); return true; } catch { return false; } })());

beginJob(world.city.sites.chop, 'm2');
const m2car = world.mission.data.car;
jackCar(world, m2car);
run(0.2);
check('m2 stage 1 (deliver coupe)', world.mission.stage === 1);
p.inCar.x = world.city.sites.chop.x + 10; p.inCar.y = world.city.sites.chop.y + 10; p.inCar.vx = 5; p.inCar.vy = 0;
run(1.5);
check('m2 completed', world.missionIdx === 2);

beginJob(world.city.sites.courier, 'm3');
run(0.2);
p.x = world.city.sites.marina.x; p.y = world.city.sites.marina.y;
run(0.5);
check('m3 completed', world.missionIdx === 3);

beginJob(world.city.sites.pawn, 'm4');
const gang = world.peds.filter((ped) => ped.mode === 'guard' && !ped.dead);
check('5 gang spawned', gang.length === 5);
for (const g of gang) damagePed(world, g, 100, 'player');
run(1);
check('m4 completed', world.missionIdx === 4);

beginJob(world.city.sites.diner, 'm5');
p.x = world.city.sites.pawn.x; p.y = world.city.sites.pawn.y;
run(1);
check('alarm raised 3 stars', world.wanted.stars >= 3);
const car0 = world.cars.find((c) => c.control === 'ai' && !c.dead);
if (car0) { p.x = car0.x; p.y = car0.y; jackCar(world, car0); }
resetWanted(world);
run(6);
check('stars decayed to 0', world.wanted.stars === 0);
check('m5 completed', world.missionIdx === 5);

beginJob(world.city.sites.docks, 'm6');
check('boss car spawned', !!world.mission.data.boss);
run(3);
check('boss driving (moved)', dist(world.mission.data.boss.x, world.mission.data.boss.y, 9 * 48 + 48, 18 * 48 + 48) > 100);
damageCar(world, world.mission.data.boss, 500, 'player');
run(1.5);
drainDialog();
run(0.3);
check('m6 completed -> win', world.missionIdx === 6 && world.wins);
check('win pending flagged', world.pendingWin === true);
world.pendingWin = false;

crime(world, 200);
run(4);
const copCar = world.cars.find((c) => c.control === 'cop' && !c.dead);
check('cop cars spawned', !!copCar);
p.inCar = null;
run(8);
const copPed = world.peds.find((ped) => ped.mode === 'cop' && !ped.dead);
check('foot cops deployed', !!copPed);
if (copPed) { p.x = copPed.x + 10; p.y = copPed.y; damagePed(world, copPed, 100, 'player'); }
run(0.5);
check('killing cop raises wanted', world.wanted.pts > 0);
p.hp = 0;
world.pendingWasted = true;
respawn(world, 'wasted');
check('respawn at hospital', dist(p.x, p.y, world.city.sites.hospital.x, world.city.sites.hospital.y) < 60 && p.hp === 100);
check('cash penalty applied', world.cash < 4500);
resetWanted(world);
run(2);
check('no cops after reset', !world.cars.some((c) => c.control === 'cop' && !c.dead));

applySave(world, { cash: 1234, mission: 3, wins: false, kills: 2, jacked: 5, muted: false });
check('applySave restores progress', world.cash === 1234 && world.missionIdx === 3);
check('MISSION_COUNT is 6', MISSION_COUNT === 6);

console.log(failures === 0 ? 'ALL TESTS PASSED' : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
