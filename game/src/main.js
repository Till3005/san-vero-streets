import { createWorld, applySave, respawn } from './world.js';
import { step as stepWorld } from './world.js';
import { draw } from './render.js';
import { drawOverlay, menuItems } from './ui.js';
import { buildMinimap } from './minimap.js';
import { loadSave } from './save.js';
import { stageShot } from './shots.js';
import { advanceDialog } from './missions.js';

const MAX_FRAME = 0.25;
const STEP = 1 / 60;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;
const tParam = Number.parseFloat(params.get('t') ?? '');

window.addEventListener('error', (e) => {
  window.__err = String(e.message || e.type || 'unknown error');
});

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const world = createWorld(seed);
const mm = buildMinimap(world.city);
const ui = { state: 'title', sel: 0, rects: [], showControls: false, hasSave: !!loadSave(), reason: 'wasted' };

function fit() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  world.viewW = canvas.width;
  world.viewH = canvas.height;
}
fit();
window.addEventListener('resize', fit);

const keys = {};
const mouse = { x: 0, y: 0, down: false };
const edges = { action: false, pause: false, confirm: false, navUp: false, navDown: false, clicked: false };

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  if (!keys[e.code]) {
    if (e.code === 'Enter') edges.confirm = true;
    if (e.code === 'Escape') edges.pause = true;
    if (e.code === 'KeyE') edges.action = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') edges.navUp = true;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') edges.navDown = true;
    if (e.code === 'KeyM') world.audio.toggleMute();
  }
  keys[e.code] = true;
  world.audio.unlock();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;
});
canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  mouse.down = true;
  edges.clicked = true;
  edges.confirm = true;
  world.audio.unlock();
  e.preventDefault();
});
window.addEventListener('mouseup', () => { mouse.down = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function readInput() {
  const W = canvas.width, H = canvas.height;
  const cam = world.cam;
  return {
    up: !!(keys.KeyW || keys.ArrowUp),
    down: !!(keys.KeyS || keys.ArrowDown),
    left: !!(keys.KeyA || keys.ArrowLeft),
    right: !!(keys.KeyD || keys.ArrowRight),
    fire: !!(mouse.down || keys.Space),
    sprint: !!(keys.ShiftLeft || keys.ShiftRight),
    handbrake: !!(keys.ShiftLeft || keys.ShiftRight),
    action: edges.action && !world.dialog,
    aimX: cam.x + (mouse.x - W / 2) / cam.zoom,
    aimY: cam.y + (mouse.y - H / 2) / cam.zoom,
  };
}

function consumeEdges() {
  const e = { ...edges };
  edges.action = false;
  edges.pause = false;
  edges.confirm = false;
  edges.navUp = false;
  edges.navDown = false;
  edges.clicked = false;
  return e;
}

function activateMenuItem(id) {
  if (ui.state === 'title') {
    if (id === 'new') ui.state = 'play';
    else if (id === 'continue') {
      const sv = loadSave();
      if (sv) applySave(world, sv);
      ui.state = 'play';
    } else if (id === 'controls') ui.showControls = !ui.showControls;
  } else if (ui.state === 'pause') {
    if (id === 'resume') ui.state = 'play';
    else if (id === 'controls') ui.showControls = !ui.showControls;
    else if (id === 'quit') {
      ui.state = 'title';
      ui.showControls = false;
      ui.sel = 0;
    }
  }
}

function handleUiEdges(e) {
  if (e.pause) {
    if (ui.state === 'play') { ui.state = 'pause'; ui.sel = 0; ui.showControls = false; }
    else if (ui.state === 'pause') ui.state = 'play';
    return;
  }
  const confirm = e.confirm;
  const click = e.clicked;
  if (world.dialog) {
    if (confirm) advanceDialog(world);
    return;
  }
  if (ui.state === 'title' || ui.state === 'pause') {
    const items = menuItems(ui);
    const count = items.length;
    let hit = -1;
    if (click) {
      for (const r of ui.rects) {
        if (mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h) { hit = r.idx; break; }
      }
      if (hit >= 0) ui.sel = hit;
    }
    if (e.navUp) ui.sel = ((ui.sel - 1) % count + count) % count;
    if (e.navDown) ui.sel = (ui.sel + 1) % count;
    if (confirm || hit >= 0) activateMenuItem(items[ui.sel].id);
    return;
  }
  if (ui.state === 'over' && confirm) {
    respawn(world, ui.reason);
    ui.state = 'play';
    return;
  }
  if (ui.state === 'win' && confirm) ui.state = 'play';
}

function drain(acc, input) {
  while (acc >= STEP) {
    stepWorld(world, input, STEP);
    acc -= STEP;
  }
  return acc;
}

function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  if (!frame.last) frame.last = now;
  let acc = Math.min((now - frame.last) / 1000, MAX_FRAME);
  frame.last = now;
  const e = consumeEdges();
  if (ui.state === 'play') {
    acc = drain(acc, readInput());
  } else if (ui.state === 'title') {
    acc = drain(acc, { up: false, down: false, left: false, right: false, fire: false, sprint: false, handbrake: false, action: false, aimX: world.player.x + 40, aimY: world.player.y });
  } else {
    acc = 0;
  }
  handleUiEdges(e);
  render();
}

function render() {
  try {
    draw(ctx, world, ui, mm);
    drawOverlay(ctx, world, ui, canvas.width, canvas.height);
  } catch (err) {
    window.__err = String(err.message || err);
    try {
      draw(ctx, world, ui, mm);
      drawOverlay(ctx, world, ui, canvas.width, canvas.height);
    } catch (err2) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#5a1010';
      ctx.fillRect(0, 0, canvas.width, 44);
      ctx.fillStyle = '#fff';
      ctx.font = '14px monospace';
      ctx.fillText(String(err2.message || err2), 10, 28);
    }
  }
}

if (shotName) {
  setTimeout(() => { document.title = 'sv-probe:' + (window.__shotReady ? 'ready' : 'stuck') + ':' + (window.__err || 'noerr') + ':p' + (window.__paints || 0); }, 2500);
  try {
    const tOverride = Number.isFinite(tParam) && tParam > 0 ? tParam : undefined;
    ui.state = stageShot(shotName, world, tOverride);
  } catch (err) {
    window.__err = 'shot: ' + String(err.message || err);
    ui.state = shotName === 'start' ? 'title' : 'play';
  }
  let painted = 0;
  function paintShot() {
    window.__paints = painted;
    render();
    painted += 1;
    if (painted < 3) requestAnimationFrame(paintShot);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paintShot);
} else {
  requestAnimationFrame(frame);
}
