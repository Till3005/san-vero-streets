export function createFx() {
  return { parts: [], floats: [], skids: [], shake: 0, flash: 0 };
}

export function addPart(fx, p) {
  if (fx.parts.length > 420) fx.parts.shift();
  fx.parts.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, life: 0.6, maxLife: 0.6, size: 3, type: 'spark', color: '#f2c14b', grow: 0, drag: 1 }, p));
}

export function sparks(fx, x, y, n, color, speed) {
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random() * 0.9);
    addPart(fx, { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.25 + Math.random() * 0.3, size: 1.5 + Math.random() * 2, type: 'spark', color: color || '#f2c14b', drag: 4 });
  }
}

export function bloodFx(fx, x, y) {
  for (let i = 0; i < 8; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = 30 + Math.random() * 80;
    addPart(fx, { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.3, size: 2 + Math.random() * 2, type: 'blood', color: '#8a1f1f', drag: 3 });
  }
  addPart(fx, { x, y, vx: 0, vy: 0, life: 9, maxLife: 9, size: 5, type: 'pool', color: '#6e1616', grow: 2.2 });
}

export function smokePuff(fx, x, y, big) {
  addPart(fx, { x, y, vx: (Math.random() - 0.5) * 16, vy: (Math.random() - 0.5) * 16 - 8, life: 0.8 + Math.random() * 0.6, size: big ? 7 : 4, type: 'smoke', color: big ? '#6e6e6e' : '#9a9a9a', grow: big ? 9 : 6 });
}

export function fireFx(fx, x, y) {
  addPart(fx, { x, y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20 - 20, life: 0.4 + Math.random() * 0.3, size: 4 + Math.random() * 4, type: 'fire', color: '#e8762e', grow: -2 });
}

export function dustFx(fx, x, y) {
  addPart(fx, { x, y, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.5, size: 4, type: 'smoke', color: 'rgba(180,175,160,0.5)', grow: 9 });
}

export function glassFx(fx, x, y) {
  for (let i = 0; i < 6; i += 1) {
    const a = Math.random() * Math.PI * 2;
    addPart(fx, { x, y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.35, size: 1.6, type: 'spark', color: '#cfe4ef', drag: 2 });
  }
}

export function explosionFx(fx, x, y) {
  addPart(fx, { x, y, vx: 0, vy: 0, life: 0.28, maxLife: 0.28, size: 16, type: 'flash', color: '#ffe9a8', grow: 260 });
  for (let i = 0; i < 26; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 220;
    addPart(fx, { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.5, size: 4 + Math.random() * 5, type: 'fire', color: Math.random() < 0.5 ? '#e8762e' : '#f2b13b', drag: 2.2 });
  }
  for (let i = 0; i < 14; i += 1) {
    const a = Math.random() * Math.PI * 2;
    addPart(fx, { x: x + Math.cos(a) * 12, y: y + Math.sin(a) * 12, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40 - 20, life: 0.9 + Math.random() * 0.7, size: 9, type: 'smoke', color: '#5e5e5e', grow: 12 });
  }
}

export function skid(fx, x, y, angle) {
  if (fx.skids.length > 340) fx.skids.shift();
  fx.skids.push({ x, y, angle, life: 5 });
}

export function float(fx, x, y, text, color, size) {
  fx.floats.push({ x, y, text, color: color || '#57d977', life: 1.4, size: size || 15 });
}

export function shake(fx, amt) {
  fx.shake = Math.min(18, fx.shake + amt);
}

export function updateFx(fx, dt) {
  const parts = fx.parts;
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.drag) {
      const f = Math.max(0, 1 - p.drag * dt);
      p.vx *= f;
      p.vy *= f;
    }
    if (p.grow) p.size = Math.max(0.5, p.size + p.grow * dt);
  }
  const floats = fx.floats;
  for (let i = floats.length - 1; i >= 0; i -= 1) {
    const f = floats[i];
    f.life -= dt;
    f.y -= 26 * dt;
    if (f.life <= 0) floats.splice(i, 1);
  }
  const skids = fx.skids;
  for (let i = skids.length - 1; i >= 0; i -= 1) {
    skids[i].life -= dt;
    if (skids[i].life <= 0) skids.splice(i, 1);
  }
  fx.shake = Math.max(0, fx.shake - dt * 26);
}
