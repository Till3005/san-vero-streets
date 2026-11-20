import { createWorld, step } from '../game/src/world.js';
import { makeCar } from '../game/src/entities.js';
import { driveKinematics } from '../game/src/cars.js';
import { dirAngle } from '../game/src/config.js';
import { angDiff, clamp } from '../game/src/random.js';

const seed = Number(process.argv[2] ?? 7);
for (let t = 5; t <= 8.01; t += 0.25) {
  const world = createWorld(seed);
  world.shotGhost = true;
  const laneX = 81 * 48 + 72;
  const car = makeCar({ x: laneX, y: 3900, angle: dirAngle(3), kind: 'sports', color: '#c23b3b', control: 'off', parked: false });
  world.cars.push(car);
  world.player.inCar = car;
  const steps = Math.floor(t * 60);
  let crashFrame = -1;
  const hp0 = car.hp;
  for (let i = 0; i < steps; i += 1) {
    const desired = -Math.PI / 2 + clamp((laneX - car.x) * 0.004, -0.35, 0.35);
    const steer = clamp(angDiff(car.angle, desired) * 3, -1, 1);
    const speed = Math.hypot(car.vx, car.vy);
    driveKinematics(world, car, 1 / 60, speed > 400 ? 0.15 : 1, steer, false);
    step(world, { up: false, down: false, left: false, right: false, fire: false, sprint: false, handbrake: false, action: false, aimX: car.x, aimY: car.y - 100 }, 1 / 60);
    if ((car.hp < hp0 - 1 || car.dead) && crashFrame === -1) crashFrame = i;
  }
  const sp = Math.hypot(car.vx, car.vy).toFixed(0);
  const wrecks = world.cars.filter((c) => c.dead).length;
  console.log(`t=${t.toFixed(2)} crashFrame=${crashFrame} speed=${sp} y=${car.y.toFixed(0)} hp=${car.hp.toFixed(0)} wrecks=${wrecks}`);
}
