import { COLORS, STAR_PTS } from './config.js';
import { missionMarker } from './missions.js';
import { drawMinimap } from './minimap.js';
import { dist } from './random.js';

function panel(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx, cx, cy, r, fill, stroke) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
}

function wrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export function drawHud(ctx, world, W, H, mm) {
  const p = world.player;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.beginPath();
  panel(ctx, 14, 14, 232, 96, 10);
  ctx.fillStyle = COLORS.hudBg;
  ctx.fill();
  ctx.strokeStyle = COLORS.hudBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.font = '700 11px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText('HEALTH', 28, 36);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(28, 42, 150, 12);
  const hpFrac = Math.max(0, p.hp / p.maxHp);
  const hpColor = hpFrac > 0.5 ? COLORS.green : hpFrac > 0.25 ? COLORS.gold : COLORS.red;
  ctx.fillStyle = hpColor;
  ctx.fillRect(29, 43, 148 * hpFrac, 10);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(28.5, 42.5, 150, 12);
  ctx.font = '700 18px "Courier New", monospace';
  ctx.fillStyle = '#7ee79a';
  ctx.fillText(`$${Math.round(world.cash).toLocaleString('en-US')}`, 190, 54);
  const heatPulse = world.wanted.heat ? 0.6 + 0.4 * Math.sin(world.time * 8) : 1;
  for (let i = 0; i < 5; i += 1) {
    const filled = i < world.wanted.stars;
    star(ctx, 34 + i * 26, 86, 10, filled ? `rgba(242,193,75,${heatPulse})` : 'rgba(255,255,255,0.13)', filled ? '#8a6a20' : 'rgba(255,255,255,0.25)');
  }
  drawMinimap(ctx, world, mm, W - 214, 14, 200);
  const marker = missionMarker(world);
  const focus = p.inCar || p;
  if (p.inCar) {
    const mph = Math.round(Math.hypot(p.inCar.vx, p.inCar.vy) * 0.16);
    ctx.font = '800 34px Arial';
    ctx.fillStyle = COLORS.hudBg;
    ctx.beginPath();
    panel(ctx, W - 150, H - 66, 136, 52, 10);
    ctx.fill();
    ctx.strokeStyle = COLORS.hudBorder;
    ctx.stroke();
    ctx.fillStyle = '#f2f2f2';
    ctx.textAlign = 'right';
    ctx.fillText(String(mph), W - 62, H - 28);
    ctx.font = '700 13px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('MPH', W - 28, H - 28);
    ctx.textAlign = 'left';
  }
  const obj = world.objective || 'Explore San Vero';
  ctx.font = '700 14px Arial';
  const lines = wrap(ctx, obj, 330);
  const boxW = 360;
  const boxH = 30 + lines.length * 18 + (world.mission && world.mission.timer !== null ? 22 : 0) + (marker && marker.kind === 'target' ? 18 : 0);
  ctx.beginPath();
  panel(ctx, 14, H - boxH - 14, boxW, boxH, 10);
  ctx.fillStyle = COLORS.hudBg;
  ctx.fill();
  ctx.strokeStyle = COLORS.hudBorder;
  ctx.stroke();
  ctx.font = '800 11px Arial';
  ctx.fillStyle = COLORS.gold;
  ctx.fillText('OBJECTIVE', 28, H - boxH + 4);
  ctx.font = '700 14px Arial';
  ctx.fillStyle = '#f2f4f8';
  lines.forEach((line, i) => {
    ctx.fillText(line, 28, H - boxH + 24 + i * 18);
  });
  let yy = H - boxH + 24 + lines.length * 18;
  if (world.mission && world.mission.timer !== null) {
    const t = Math.max(0, world.mission.timer);
    const urgent = t < 11;
    ctx.font = '800 ' + (urgent ? '20' : '16') + 'px "Courier New", monospace';
    ctx.fillStyle = urgent ? (Math.sin(world.time * 10) > 0 ? COLORS.red : '#ffd9d9') : COLORS.gold;
    ctx.fillText(`TIME ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`, 28, yy + 10);
    yy += urgent ? 24 : 18;
  }
  if (marker && marker.kind === 'target') {
    const d = Math.round(dist(focus.x, focus.y, marker.x, marker.y) / 16);
    ctx.font = '700 13px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`${d} m to target`, 28, yy + 12);
  }
  if (world.wanted.bustT > 0.15) {
    const frac = Math.min(1, world.wanted.bustT / 1.3);
    ctx.font = '800 15px Arial';
    ctx.fillStyle = `rgba(90,150,255,${0.5 + 0.5 * Math.sin(world.time * 12)})`;
    ctx.textAlign = 'center';
    ctx.fillText('SVPD IS CLOSING IN — RUN!', W / 2, 60);
    ctx.textAlign = 'left';
  }
  if (world.banner) {
    const b = world.banner;
    const a = b.age < 0.3 ? b.age / 0.3 : b.age > b.dur - 0.5 ? (b.dur - b.age) / 0.5 : 1;
    ctx.globalAlpha = Math.max(0, a);
    ctx.textAlign = 'center';
    ctx.font = '800 42px "Arial Black", Arial';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(b.text, W / 2 + 2, H * 0.3 + 2);
    ctx.fillStyle = b.color;
    ctx.fillText(b.text, W / 2, H * 0.3);
    if (b.sub) {
      ctx.font = '700 17px Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(b.sub, W / 2, H * 0.3 + 30);
    }
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
