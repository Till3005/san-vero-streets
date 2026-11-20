import { makeCar, makePed } from './entities.js';
import { makePedLook } from './city.js';
import { driveKinematics, worldFocus } from './cars.js';
import { crime } from './police.js';
import { hasLOS, solidAt } from './city.js';
import { fireBullet } from './combat.js';
import { writeSave } from './save.js';
import { dist, clamp, angDiff } from './random.js';

export const CHARACTERS = {
  rico: { name: 'RICO', skin: '#d9a276', hair: '#241a12', shirt: '#e8e8e8', hat: null },
  yara: { name: 'YARA', skin: '#c98850', hair: '#1a1212', shirt: '#c23b5a', hat: null },
  rufus: { name: 'RUFUS', skin: '#e8bfa5', hair: '#8a8a8a', shirt: '#4a5560', hat: null },
  dispatch: { name: 'DISPATCH', skin: '#8a5a3b', hair: '#111', shirt: '#7a5fc2', hat: null },
  gold: { name: 'MR. GOLD', skin: '#f0d6c0', hair: '#c9b26a', shirt: '#d9b23b', hat: null },
};

function startDialog(world, lines, onDone) {
  world.dialog = { lines, idx: 0, onDone };
}

export function advanceDialog(world) {
  const d = world.dialog;
  if (!d) return;
  d.idx += 1;
  if (d.idx >= d.lines.length) {
    world.dialog = null;
    if (d.onDone) d.onDone();
  }
}

const MISSIONS = [
  {
    id: 'm1', title: 'Fresh Start', giver: 'diner', reward: 300,
    brief: [
      { who: 'yara', text: "Rico Camara. Nine months in County and you still walk like you own the sidewalk." },
      { who: 'rico', text: "Good to see you too, Yara. Chico's coffee hasn't gotten better." },
      { who: 'yara', text: "There's a car out front, on my tab. I need a ride to Vero Docks — no detours, no drama. Drive." },
    ],
    setup(world, m) {
      const site = world.city.sites.diner;
      m.data.yara = makePed({ x: site.x + 30, y: site.y, look: { skin: CHARACTERS.yara.skin, shirt: CHARACTERS.yara.shirt, pants: '#3a2a3a', hair: CHARACTERS.yara.hair, hat: null }, mode: 'stand' });
      world.peds.push(m.data.yara);
      m.data.car = makeCar({ x: site.x + 14, y: site.y - 92, angle: -Math.PI / 2, kind: 'sedan', color: '#b0b6bd', control: 'off', parked: true });
      world.cars.push(m.data.car);
    },
    stages: [
      {
        text: () => 'Get in the car outside Chico\'s Diner',
        target: (world, m) => m.data.car,
        done: (world, m) => world.player.inCar === m.data.car,
        advance(world, m) { removeIf(world.peds, (ped) => ped === m.data.yara); },
      },
      {
        text: () => 'Drive Yara to Vero Docks',
        target: (world, m) => world.city.sites.docks,
        done: (world, m) => dist(worldFocus(world).x, worldFocus(world).y, world.city.sites.docks.x, world.city.sites.docks.y) < 95 && Math.hypot(worldFocus(world).vx || 0, worldFocus(world).vy || 0) < 90,
      },
    ],
    completeDialog: [
      { who: 'yara', text: "Not bad, Camara. Smooth as Chico's budget coffee. I'll be in touch — there's more where that came from." },
    ],
    cleanup(world, m) {
      removeIf(world.peds, (ped) => ped === m.data.yara);
      if (m.data.car && !m.data.car.dead) { m.data.car.control = 'off'; m.data.car.parked = true; }
    },
  },
  {
    id: 'm2', title: 'Borrowed Wheels', giver: 'chop', reward: 450,
    brief: [
      { who: 'rufus', text: "Rufus Kane, Auto Body. I need a clean 550 Spider for a client by sundown." },
      { who: 'rufus', text: "Yellow one, parked at the Palm Court Motel lot. Bring it shiny or don't bring it at all." },
    ],
    setup(world, m) {
      const site = world.city.sites.motel;
      m.data.car = makeCar({ x: site.x + 60, y: site.y - 64, angle: -Math.PI / 2, kind: 'sports', color: '#d9b23b', control: 'off', parked: true });
      m.data.car.mission = 'm2car';
      world.cars.push(m.data.car);
    },
    stages: [
      {
        text: () => 'Steal the yellow Coupe at Palm Court Motel',
        target: (world, m) => m.data.car,
        done: (world, m) => world.player.inCar === m.data.car,
      },
      {
        text: (world, m) => `Deliver the Coupe to Rufus Auto Body — ${Math.max(0, Math.round(m.data.car.hp / m.data.car.maxHp * 100))}% condition`,
        target: (world, m) => world.city.sites.chop,
        done: (world, m) => dist(worldFocus(world).x, worldFocus(world).y, world.city.sites.chop.x, world.city.sites.chop.y) < 95 && Math.hypot(worldFocus(world).vx || 0, worldFocus(world).vy || 0) < 90,
      },
    ],
    cleanup(world, m) {
      if (m.data.car && !m.data.car.dead) { m.data.car.control = 'off'; m.data.car.parked = true; m.data.car.mission = null; }
    },
  },
  {
    id: 'm3', title: 'Rush Hour', giver: 'courier', reward: 550,
    brief: [
      { who: 'dispatch', text: "Swift Couriers, priority parcel. Freezer box, faint ticking — ignore that part." },
      { who: 'dispatch', text: "Grab it here, drop it at Salty's Marina. You have eighty seconds. Traffic is not your problem." },
    ],
    setup(world, m) {},
    stages: [
      {
        text: () => 'Grab the parcel at Swift Couriers',
        target: (world) => world.city.sites.courier,
        done: (world) => dist(worldFocus(world).x, worldFocus(world).y, world.city.sites.courier.x, world.city.sites.courier.y) < 46,
      },
      {
        text: () => 'Deliver the parcel to Salty\'s Marina',
        target: (world) => world.city.sites.marina,
        timer: 80,
        done: (world) => dist(worldFocus(world).x, worldFocus(world).y, world.city.sites.marina.x, world.city.sites.marina.y) < 95,
      },
    ],
    cleanup(world, m) {},
  },
  {
    id: 'm4', title: 'Pest Control', giver: 'pawn', reward: 650,
    brief: [
      { who: 'gold', text: "The Viper crew jumped my shop and squats on the motel's back lot like they own it." },
      { who: 'gold', text: "Goldline pays cash for quiet. Five of them, all carrying. Make it loud if you have to." },
    ],
    setup(world, m) {
      const site = world.city.sites.motel;
      m.data.count = 5;
      spawnGangAt(world, site.x + 118, site.y - 118, 5, 'm4');
    },
    stages: [
      {
        text: (world, m) => `Take out the Vipers at the motel back lot (${gangLeft(world)} left)`,
        target: (world) => world.city.sites.motel,
        done: (world) => gangLeft(world) === 0,
      },
    ],
    cleanup(world, m) {},
  },
  {
    id: 'm5', title: 'Smash & Grab', giver: 'diner', reward: 800,
    brief: [
      { who: 'yara', text: "Mr. Gold wants his own vault emptied before the insurance audit. Delicate, right?" },
      { who: 'yara', text: "The second that safe opens, the alarm rings SVPD. Whole city on you. Lose the heat, keep the take." },
    ],
    setup(world, m) {},
    stages: [
      {
        text: () => 'Hit the safe at Goldline Pawn',
        target: (world) => world.city.sites.pawn,
        done: (world) => dist(worldFocus(world).x, worldFocus(world).y, world.city.sites.pawn.x, world.city.sites.pawn.y) < 46,
        advance(world) {
          crime(world, 180);
          world.audio.alarm();
          setBanner(world, 'THE ALARM IS RINGING', 'Lose the heat before SVPD corners you', '#e05252');
        },
      },
      {
        text: () => 'Lose the heat before you\'re arrested',
        target: () => null,
        timer: 100,
        done: (world) => world.wanted.stars === 0 && world.wanted.evadeT > 3,
      },
    ],
    failText: () => 'The heat boxed you in before the take was clean',
    cleanup(world, m) {},
  },
  {
    id: 'm6', title: 'The Last Deal', giver: 'docks', reward: 1500,
    brief: [
      { who: 'yara', text: "It was Marcus Vane. He sold your brother's route to the crew that got him arrested — and he's running the take right now." },
      { who: 'yara', text: "Black armored car, northbound. Two gun cars riding shotgun. The Warhound stops for no one. End it, Rico." },
    ],
    setup(world, m) {
      const start = { x: 9 * 48 + 48, y: 18 * 48 + 48 };
      m.data.wps = [[9, 18], [36, 18], [36, 45], [63, 45], [63, 72], [27, 72], [27, 36], [9, 36]].map(([c, r]) => ({ x: c * 48 + 48, y: r * 48 + 48 }));
      m.data.boss = makeCar({ x: start.x, y: start.y, angle: 0, kind: 'boss', color: '#1b1d22', control: 'convoy', parked: false });
      m.data.boss.mission = 'boss';
      m.data.boss.wp = 0;
      world.cars.push(m.data.boss);
      m.data.guards = [];
      for (let i = 0; i < 2; i += 1) {
        const g = makeCar({ x: start.x - (i + 1) * 90, y: start.y, angle: 0, kind: 'sedan', color: '#2b2b30', control: 'convoy', parked: false, armed: true });
        g.mission = 'guard';
        g.wp = (i + 1) % m.data.wps.length;
        g.shootT = 1.5 + i;
        m.data.guards.push(g);
        world.cars.push(g);
      }
    },
    stages: [
      {
        text: () => 'Destroy the Warhound — Vane\'s armored car',
        target: (world, m) => (m.data.boss.dead ? null : m.data.boss),
        done: (world, m) => m.data.boss.dead,
      },
    ],
    completeDialog: [
      { who: 'rico', text: "Warhound's scrap metal. Vane's empire just became a smoking crater." },
      { who: 'yara', text: "San Vero's yours, Rico Camara. Try to keep it." },
    ],
    finale: true,
    cleanup(world, m) {
      for (const g of m.data.guards) g.retire = true;
    },
  },
];

function removeIf(list, fn) {
  for (let i = list.length - 1; i >= 0; i -= 1) if (fn(list[i])) list.splice(i, 1);
}

function spawnGangAt(world, x, y, n, tag) {
  const peds = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + world.rng.next();
    const r = 26 + world.rng.next() * 60;
    const gx = x + Math.cos(a) * r, gy = y + Math.sin(a) * r;
    const ped = makePed({ x: solidAt(world.city, gx, gy) ? x : gx, y: solidAt(world.city, gx, gy) ? y : gy, look: makePedLook(world.rng), mode: 'guard', gun: true, hp: 40, mission: tag });
    ped.look.shirt = world.rng.pick(['#6a2f9e', '#54297e', '#8a3fc2']);
    ped.home = { x: gx, y: gy };
    ped.shootT = world.rng.range(0.5, 1.6);
    world.peds.push(ped);
    peds.push(ped);
  }
  return peds;
}

function gangLeft(world) {
  let n = 0;
  for (const ped of world.peds) if (ped.mode === 'guard' && !ped.dead) n += 1;
  return n;
}

export function setBanner(world, text, sub, color) {
  world.banner = { text, sub: sub || '', color: color || '#f2c14b', age: 0, dur: 3.2 };
}

export function startMission(world, idx) {
  const def = MISSIONS[idx];
  const m = { def, stage: 0, timer: null, timerMax: null, data: {} };
  startDialog(world, def.brief, () => {
    world.mission = m;
    def.setup(world, m);
    world.audio.ding();
  });
}

export function missionMarker(world) {
  if (world.mission) {
    const stage = world.mission.def.stages[world.mission.stage];
    const t = stage.target(world, world.mission);
    return t ? { x: t.x, y: t.y, kind: 'target' } : null;
  }
  if (world.missionIdx < MISSIONS.length) {
    const site = world.city.sites[MISSIONS[world.missionIdx].giver];
    return { x: site.x, y: site.y, kind: 'giver' };
  }
  return null;
}

export function objectiveText(world) {
  if (world.mission) {
    const stage = world.mission.def.stages[world.mission.stage];
    return stage.text(world, world.mission);
  }
  if (world.missionIdx < MISSIONS.length) return `Next job: "${MISSIONS[world.missionIdx].title}" — follow the marker`;
  if (world.wins) return 'San Vero is yours — free roam';
  return 'Explore San Vero';
}

function failMission(world, msg) {
  const def = world.mission.def;
  setBanner(world, 'MISSION FAILED', msg, '#e05252');
  world.audio.fail();
  def.cleanup(world, world.mission);
  world.mission = null;
  world.missionFailed = false;
  writeSave(world);
}

function completeMission(world) {
  const m = world.mission;
  const def = m.def;
  world.cash += def.reward;
  world.missionIdx += 1;
  setBanner(world, 'MISSION PASSED', `${def.title} — $${def.reward} earned`, '#57d977');
  world.audio.ding();
  def.cleanup(world, m);
  world.mission = null;
  writeSave(world);
  if (def.completeDialog) {
    startDialog(world, def.completeDialog, () => {
      if (def.finale) {
        world.wins = true;
        world.pendingWin = true;
        writeSave(world);
      }
    });
  } else if (def.finale) {
    world.wins = true;
    world.pendingWin = true;
  }
}

export function updateMissions(world, dt) {
  if (!world.mission && world.missionIdx < MISSIONS.length) {
    const site = world.city.sites[MISSIONS[world.missionIdx].giver];
    const focus = worldFocus(world);
    if (dist(focus.x, focus.y, site.x, site.y) < 40 && !world.dialog) {
      startMission(world, world.missionIdx);
    }
    return;
  }
  const m = world.mission;
  if (!m) return;
  if (world.missionFailed) {
    failMission(world, m.def.failText ? m.def.failText() : 'You blew the job');
    return;
  }
  const stage = m.def.stages[m.stage];
  if (stage.timer && m.timer === null) {
    m.timer = stage.timer;
    m.timerMax = stage.timer;
  }
  if (m.timer !== null) {
    m.timer -= dt;
    if (m.timer <= 0) {
      failMission(world, 'Time ran out');
      return;
    }
  }
  if (stage.done(world, m)) {
    if (stage.advance) stage.advance(world, m);
    m.stage += 1;
    m.timer = null;
    if (m.stage >= m.def.stages.length) completeMission(world);
  }
}

export function updateConvoy(world, dt) {
  const m = world.mission;
  if (!m || m.def.id !== 'm6') return;
  const drive = (car, wpOffset, speedCap) => {
    if (car.dead || car.retire) {
      if (car.retire && !car.dead) {
        car.vx *= 1 - 2 * dt;
        car.vy *= 1 - 2 * dt;
      }
      return;
    }
    const wps = m.data.wps;
    const wp = wps[(car.wp + wpOffset) % wps.length];
    const d = dist(car.x, car.y, wp.x, wp.y);
    if (d < 50) car.wp += 1;
    const desired = Math.atan2(wp.y - car.y, wp.x - car.x);
    const diff = angDiff(car.angle, desired);
    let throttle = 1;
    if (Math.abs(diff) > 1) throttle = 0.45;
    const maxSpeed = car.type.max * speedCap;
    if (Math.hypot(car.vx, car.vy) > maxSpeed) throttle = 0;
    driveKinematics(world, car, dt, throttle, clamp(diff * 2.2, -1, 1), false);
    if (car.armed) {
      const focus = worldFocus(world);
      const pd = dist(car.x, car.y, focus.x, focus.y);
      car.shootT -= dt;
      if (car.shootT <= 0 && pd < 430 && hasLOS(world.city, car.x, car.y, focus.x, focus.y)) {
        car.shootT = 1.1 + world.rng.next() * 0.6;
        const aim = Math.atan2(focus.y - car.y, focus.x - car.x) + (world.rng.next() - 0.5) * 0.12;
        fireBullet(world, 'gang', car.x, car.y, aim, { dmg: 8, speed: 820 });
        world.audio.shot();
      }
    }
  };
  drive(m.data.boss, 0, 0.62);
  drive(m.data.guards[0], 1, 0.66);
  drive(m.data.guards[1], 2, 0.66);
}

export const MISSION_COUNT = MISSIONS.length;
export function missionList() {
  return MISSIONS.map((m) => ({ title: m.title, giver: m.giver, reward: m.reward }));
}
