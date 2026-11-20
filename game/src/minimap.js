import { WTILES, TILE, COLORS } from './config.js';
import { hash2 } from './random.js';
import { missionMarker } from './missions.js';

const SCALE = 4;

export function buildMinimap(city) {
  const canvas = document.createElement('canvas');
  canvas.width = WTILES * SCALE;
  canvas.height = WTILES * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#12151c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let ty = 0; ty < WTILES; ty += 1) {
    for (let tx = 0; tx < WTILES; tx += 1) {
      const code = city.codes[ty * WTILES + tx];
      let color = null;
      if (code === 1) color = '#5d626b';
      else if (code === 2) color = '#848a93';
      else if (code === 6) color = '#2b5d8f';
      else if (code === 7) color = '#565b63';
      else if (code === 5) color = '#b3a276';
      else if (code === 4) color = '#3e6b42';
      else if (code === 8) color = '#4c515a';
      else if (code === 9) color = '#6e6a5e';
      else color = '#3a3f47';
      ctx.fillStyle = color;
      ctx.fillRect(tx * SCALE, ty * SCALE, SCALE, SCALE);
    }
  }
  ctx.fillStyle = '#2f343c';
  for (const b of city.buildings) {
    ctx.fillRect(b.x / TILE * SCALE, b.y / TILE * SCALE, Math.max(2, b.w / TILE * SCALE), Math.max(2, b.h / TILE * SCALE));
  }
  ctx.strokeStyle = '#1a1e26';
  ctx.lineWidth = 1;
  for (const b of city.buildings) {
    ctx.strokeRect(b.x / TILE * SCALE, b.y / TILE * SCALE, Math.max(2, b.w / TILE * SCALE), Math.max(2, b.h / TILE * SCALE));
  }
  for (const key of Object.keys(city.sites)) {
    const s = city.sites[key];
    ctx.fillStyle = '#f2c14b';
    ctx.beginPath();
    ctx.arc(s.x / TILE * SCALE, s.y / TILE * SCALE, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

export function drawMinimap(ctx, world, mm, x, y, size) {
  const focus = world.player.inCar || world.player;
  const range = 620;
  const srcW = range * SCALE / TILE;
  const sx = focus.x / TILE * SCALE - srcW / 2;
  const sy = focus.y / TILE * SCALE - srcW / 2;
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, x, y, size, size, 12);
  ctx.fillStyle = 'rgba(10, 13, 20, 0.78)';
  ctx.fill();
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(mm, sx, sy, srcW, srcW, x, y, size, size);
  const k = size / srcW;
  const toX = (wx) => x + (wx / TILE * SCALE - sx) * k;
  const toY = (wy) => y + (wy / TILE * SCALE - sy) * k;
  for (const car of world.cars) {
    if (car.dead || car === world.player.inCar) continue;
    const mx = toX(car.x), my = toY(car.y);
    if (mx < x || my < y || mx > x + size || my > y + size) continue;
    if (car.kind === 'police' && car.control === 'cop') {
      const pulse = 0.6 + 0.4 * Math.sin(world.time * 9);
      ctx.fillStyle = `rgba(90, 150, 255, ${pulse})`;
      ctx.beginPath();
      ctx.arc(mx, my, 3.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(225, 228, 233, 0.85)';
      ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
    }
  }
  const marker = missionMarker(world);
  if (marker) {
    const mx = toX(marker.x), my = toY(marker.y);
    const pulse = 0.7 + 0.3 * Math.sin(world.time * 5);
    ctx.fillStyle = marker.kind === 'giver' ? `rgba(242, 193, 75, ${pulse})` : `rgba(240, 96, 96, ${pulse})`;
    ctx.beginPath();
    ctx.moveTo(mx, my - 5);
    ctx.lineTo(mx + 5, my);
    ctx.lineTo(mx, my + 5);
    ctx.lineTo(mx - 5, my);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  const px = toX(focus.x), py = toY(focus.y);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate((focus.angle || 0) + Math.PI / 2);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(4.5, 5);
  ctx.lineTo(-4.5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = COLORS.hudBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundRectPath(ctx, x, y, size, size, 12);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '700 10px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('SAN VERO', x + size / 2, y + 14);
  ctx.textAlign = 'left';
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
