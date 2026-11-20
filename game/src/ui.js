import { CHARACTERS } from './missions.js';

function panel(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function drawPortrait(ctx, who, x, y, s) {
  const ch = CHARACTERS[who] || CHARACTERS.rico;
  ctx.save();
  ctx.beginPath();
  panel(ctx, x, y, s, s, 10);
  ctx.clip();
  ctx.fillStyle = '#1a2029';
  ctx.fillRect(x, y, s, s);
  ctx.fillStyle = ch.shirt;
  ctx.beginPath();
  ctx.ellipse(x + s / 2, y + s + s * 0.18, s * 0.42, s * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ch.skin;
  ctx.beginPath();
  ctx.arc(x + s / 2, y + s * 0.46, s * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ch.hair;
  const variant = hashName(who) % 3;
  ctx.beginPath();
  ctx.arc(x + s / 2, y + s * 0.36, s * 0.27, Math.PI, Math.PI * 2);
  ctx.fill();
  if (variant === 0) {
    ctx.fillRect(x + s / 2 - s * 0.27, y + s * 0.34, s * 0.08, s * 0.3);
    ctx.fillRect(x + s / 2 + s * 0.19, y + s * 0.34, s * 0.08, s * 0.3);
  } else if (variant === 1) {
    ctx.fillRect(x + s / 2 - s * 0.28, y + s * 0.3, s * 0.56, s * 0.1);
  }
  if (ch.hat) {
    ctx.fillStyle = ch.hat;
    ctx.fillRect(x + s / 2 - s * 0.3, y + s * 0.2, s * 0.6, s * 0.12);
    ctx.fillRect(x + s / 2 - s * 0.22, y + s * 0.08, s * 0.44, s * 0.14);
  }
  ctx.fillStyle = '#141821';
  ctx.fillRect(x + s / 2 - s * 0.14, y + s * 0.42, s * 0.08, s * 0.05);
  ctx.fillRect(x + s / 2 + s * 0.06, y + s * 0.42, s * 0.08, s * 0.05);
  ctx.fillRect(x + s / 2 - s * 0.07, y + s * 0.56, s * 0.14, s * 0.03);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  panel(ctx, x, y, s, s, 10);
  ctx.stroke();
}

export function menuItems(ui) {
  if (ui.state === 'pause') {
    return [
      { id: 'resume', label: 'RESUME' },
      { id: 'controls', label: ui.showControls ? 'BACK' : 'HOW TO PLAY' },
      { id: 'quit', label: 'QUIT TO TITLE' },
    ];
  }
  const items = [{ id: 'new', label: 'NEW GAME' }];
  if (ui.hasSave) items.push({ id: 'continue', label: 'CONTINUE' });
  items.push({ id: 'controls', label: ui.showControls ? 'BACK' : 'HOW TO PLAY' });
  return items;
}

export function drawOverlay(ctx, world, ui, W, H) {
  if (world.dialog) { drawDialog(ctx, world, W, H); return; }
  if (ui.state === 'title') drawTitle(ctx, ui, W, H, world);
  else if (ui.state === 'pause') drawPause(ctx, ui, W, H);
  else if (ui.state === 'over') drawOver(ctx, ui, W, H, world);
  else if (ui.state === 'win') drawWin(ctx, W, H, world);
  if (world.audio.muted) {
    ctx.font = '700 12px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('MUTED (M)', 16, H - 10);
  }
  if (window.__err) {
    ctx.fillStyle = 'rgba(120,10,10,0.85)';
    ctx.fillRect(0, 0, W, 26);
    ctx.fillStyle = '#fff';
    ctx.font = '700 13px monospace';
    ctx.fillText('ERROR: ' + window.__err, 10, 18);
  }
}

function drawTitle(ctx, ui, W, H, world) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(10,12,18,0.78)');
  g.addColorStop(0.45, 'rgba(10,12,18,0.42)');
  g.addColorStop(1, 'rgba(10,12,18,0.8)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = '900 104px "Arial Black", Arial';
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillText('SAN VERO', W / 2 + 5, 205 + 5);
  const grad = ctx.createLinearGradient(W / 2 - 300, 120, W / 2 + 300, 240);
  grad.addColorStop(0, '#f8e08e');
  grad.addColorStop(0.55, '#f2c14b');
  grad.addColorStop(1, '#c8871e');
  ctx.fillStyle = grad;
  ctx.fillText('SAN VERO', W / 2, 205);
  ctx.font = '700 30px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('S T R E E T S', W / 2, 250);
  ctx.font = 'italic 600 16px Georgia, serif';
  ctx.fillStyle = 'rgba(255,255,255,0.66)';
  ctx.fillText('Six jobs. One city. No way out clean.', W / 2, 290);
  ui.rects = [];
  const items = menuItems(ui);
  let y = 386;
  items.forEach((item, i) => {
    const sel = i === ui.sel;
    ctx.font = '800 26px Arial';
    const tw = ctx.measureText(item.label).width;
    const x = W / 2 - tw / 2;
    if (sel) {
      ctx.fillStyle = 'rgba(242,193,75,0.12)';
      panel(ctx, x - 30, y - 30, tw + 60, 42, 8);
      ctx.fill();
    }
    ctx.fillStyle = sel ? '#f2c14b' : 'rgba(255,255,255,0.72)';
    if (sel) {
      ctx.beginPath();
      ctx.moveTo(x - 18, y - 22);
      ctx.lineTo(x - 8, y - 15);
      ctx.lineTo(x - 18, y - 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillText(item.label, W / 2, y);
    ui.rects.push({ x: x - 30, y: y - 30, w: tw + 60, h: 42, idx: i });
    y += 52;
  });
  if (ui.showControls) {
    ctx.fillStyle = 'rgba(10,13,20,0.92)';
    panel(ctx, W / 2 - 260, H - 330, 520, 260, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(242,193,75,0.5)';
    ctx.stroke();
    const lines = [
      ['WASD / Arrows', 'walk & drive'],
      ['Mouse + Click / Space', 'aim & fire'],
      ['E', 'enter / exit cars'],
      ['Shift', 'sprint / handbrake'],
      ['Esc', 'pause'],
      ['M', 'mute'],
    ];
    ctx.textAlign = 'left';
    lines.forEach((l, i) => {
      ctx.font = '800 15px "Courier New", monospace';
      ctx.fillStyle = '#f2c14b';
      ctx.fillText(l[0], W / 2 - 230, H - 300 + i * 34);
      ctx.font = '600 15px Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(l[1], W / 2 - 20, H - 300 + i * 34);
    });
    ctx.textAlign = 'center';
  }
  ctx.font = '700 13px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('UP/DOWN to choose — ENTER or CLICK to play', W / 2, H - 58);
  ctx.font = '600 12px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText('© 2026 San Vero Interactive — an original open-world crime story', W / 2, H - 32);
  ctx.textAlign = 'left';
}

function drawPause(ctx, ui, W, H) {
  ctx.fillStyle = 'rgba(8,10,16,0.62)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = '900 52px "Arial Black", Arial';
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillText('PAUSED', W / 2 + 3, H / 2 - 103);
  ctx.fillStyle = '#f2f2f2';
  ctx.fillText('PAUSED', W / 2, H / 2 - 106);
  ui.rects = [];
  const items = menuItems(ui);
  let y = H / 2 - 40;
  items.forEach((item, i) => {
    const sel = i === ui.sel;
    ctx.font = '800 24px Arial';
    const tw = ctx.measureText(item.label).width;
    if (sel) ctx.fillStyle = '#f2c14b';
    else ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fillText(item.label, W / 2, y);
    ui.rects.push({ x: W / 2 - tw / 2 - 24, y: y - 28, w: tw + 48, h: 40, idx: i });
    y += 54;
  });
  if (ui.showControls) {
    ctx.fillStyle = 'rgba(10,13,20,0.92)';
    panel(ctx, W / 2 - 230, 90, 460, 230, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(242,193,75,0.5)';
    ctx.stroke();
    const lines = [
      ['WASD / Arrows', 'walk & drive'],
      ['Mouse + Click / Space', 'aim & fire'],
      ['E', 'enter / exit cars'],
      ['Shift', 'sprint / handbrake'],
      ['M', 'mute'],
    ];
    ctx.textAlign = 'left';
    lines.forEach((l, i) => {
      ctx.font = '800 15px "Courier New", monospace';
      ctx.fillStyle = '#f2c14b';
      ctx.fillText(l[0], W / 2 - 204, 124 + i * 34);
      ctx.font = '600 15px Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(l[1], W / 2, 124 + i * 34);
    });
    ctx.textAlign = 'center';
  }
  ctx.font = '700 13px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('ESC to resume — M to mute', W / 2, H - 40);
  ctx.textAlign = 'left';
}

function drawOver(ctx, ui, W, H, world) {
  const busted = ui.reason === 'busted';
  ctx.fillStyle = busted ? 'rgba(10,16,48,0.6)' : 'rgba(58,8,12,0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = '900 92px "Arial Black", Arial';
  const text = busted ? 'BUSTED' : 'WASTED';
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillText(text, W / 2 + 4, H / 2 + 4);
  ctx.fillStyle = busted ? '#7ea2f2' : '#e05252';
  ctx.fillText(text, W / 2, H / 2);
  ctx.font = '700 20px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(busted ? 'SVPD took $250 and your afternoon.' : 'Mercy General took $150 and patched you up.', W / 2, H / 2 + 52);
  const blink = Math.sin(Date.now() / 300) > -0.2;
  if (blink) {
    ctx.font = '800 18px Arial';
    ctx.fillStyle = '#f2c14b';
    ctx.fillText('PRESS ENTER OR CLICK TO KEEP GOING', W / 2, H / 2 + 100);
  }
  ctx.textAlign = 'left';
}

function drawWin(ctx, W, H, world) {
  ctx.fillStyle = 'rgba(24,18,6,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = '900 72px "Arial Black", Arial';
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillText('SAN VERO IS YOURS', W / 2 + 4, H / 2 - 80);
  const grad = ctx.createLinearGradient(W / 2 - 300, 0, W / 2 + 300, 0);
  grad.addColorStop(0, '#f8e08e');
  grad.addColorStop(1, '#d99a2b');
  ctx.fillStyle = grad;
  ctx.fillText('SAN VERO IS YOURS', W / 2, H / 2 - 84);
  ctx.font = '700 20px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const stats = [
    `Jobs done: ${Math.min(6, world.missionIdx)} / 6`,
    `Bank: $${Math.round(world.cash).toLocaleString('en-US')}`,
    `Bodies dropped: ${world.stats.kills}`,
    `Cars borrowed: ${world.stats.jacked}`,
  ];
  stats.forEach((s, i) => ctx.fillText(s, W / 2, H / 2 - 10 + i * 34));
  const blink = Math.sin(Date.now() / 300) > -0.2;
  if (blink) {
    ctx.font = '800 18px Arial';
    ctx.fillStyle = '#f2c14b';
    ctx.fillText('PRESS ENTER OR CLICK TO ROAM FREE', W / 2, H / 2 + 130);
  }
  ctx.textAlign = 'left';
}

function drawDialog(ctx, world, W, H) {
  const d = world.dialog;
  const line = d.lines[d.idx];
  const pw = 740, ph = 176;
  const px = W / 2 - pw / 2, py = H - ph - 26;
  ctx.fillStyle = 'rgba(8,11,17,0.55)';
  ctx.fillRect(0, py - 30, W, ph + 56);
  ctx.fillStyle = 'rgba(12,15,22,0.94)';
  panel(ctx, px, py, pw, ph, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(242,193,75,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawPortrait(ctx, line.who, px + 20, py + 20, 88);
  ctx.textAlign = 'left';
  ctx.font = '800 17px Arial';
  ctx.fillStyle = '#f2c14b';
  ctx.fillText((CHARACTERS[line.who] || CHARACTERS.rico).name, px + 126, py + 42);
  ctx.font = '600 17px Georgia, serif';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  const words = line.text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > pw - 160 && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, px + 126, py + 72 + i * 26));
  for (let i = 0; i < d.lines.length; i += 1) {
    ctx.fillStyle = i === d.idx ? '#f2c14b' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(px + 132 + i * 16, py + ph - 18, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = '700 13px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'right';
  ctx.fillText('ENTER / CLICK — CONTINUE', px + pw - 18, py + ph - 16);
  ctx.textAlign = 'left';
}
