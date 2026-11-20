import { TILE, PERIOD, WTILES, COLORS, shade } from './config.js';
import { lightGreenNS } from './city.js';
import { hash2, clamp } from './random.js';
import { missionMarker } from './missions.js';
import { drawHud } from './hud.js';
import { CHARACTERS } from './missions.js';

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawSignalBox(ctx, x, y, nsGreen) {
  ctx.fillStyle = 'rgba(20,23,30,0.85)';
  rr(ctx, x, y, 10, 18, 3);
  ctx.fill();
  ctx.fillStyle = nsGreen ? '#57d977' : '#e05252';
  ctx.beginPath();
  ctx.arc(x + 5, y + 5, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = nsGreen ? '#e05252' : '#57d977';
  ctx.beginPath();
  ctx.arc(x + 5, y + 13, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

export function draw(ctx, world, ui, mm) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const cam = world.cam;
  const zoom = cam.zoom;
  ctx.fillStyle = '#12151c';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-cam.x + cam.sx, -cam.y + cam.sy);
  const vx0 = cam.x - W / 2 / zoom - 60, vy0 = cam.y - H / 2 / zoom - 60;
  const vx1 = cam.x + W / 2 / zoom + 60, vy1 = cam.y + H / 2 / zoom + 60;
  drawGround(ctx, world, vx0, vy0, vx1, vy1);
  drawDecals(ctx, world, vx0, vy0, vx1, vy1);
  drawProps(ctx, world, vx0, vy0, vx1, vy1);
  drawSkids(ctx, world);
  drawCorpses(ctx, world);
  for (const car of world.cars) drawCar(ctx, world, car);
  for (const ped of world.peds) {
    if (!ped.dead) drawPed(ctx, world, ped, false);
  }
  if (!world.player.inCar) drawPed(ctx, world, world.player, true);
  drawBuildings(ctx, world, vx0, vy0, vx1, vy1);
  drawCanopy(ctx, world, vx0, vy0, vx1, vy1);
  drawBullets(ctx, world);
  drawParticles(ctx, world);
  drawBeacons(ctx, world);
  drawFloats(ctx, world);
  ctx.restore();
  ctx.fillStyle = 'rgba(255, 214, 150, 0.05)';
  ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(16,20,28,0)');
  vg.addColorStop(1, 'rgba(16,20,28,0.32)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  if (ui.state === 'play' || ui.state === 'pause' || ui.state === 'over') drawHud(ctx, world, W, H, mm);
  if (markerEdgeArrow(ctx, world, W, H) !== null) {}
}

function tileRange(cam, W, H, zoom) {
  return [0, 0, 0, 0];
}

function drawGround(ctx, world, vx0, vy0, vx1, vy1) {
  const city = world.city;
  const tx0 = Math.max(0, Math.floor(vx0 / TILE));
  const ty0 = Math.max(0, Math.floor(vy0 / TILE));
  const tx1 = Math.min(WTILES - 1, Math.ceil(vx1 / TILE));
  const ty1 = Math.min(WTILES - 1, Math.ceil(vy1 / TILE));
  const codes = city.codes;
  const t = world.time;
  for (let ty = ty0; ty <= ty1; ty += 1) {
    for (let tx = tx0; tx <= tx1; tx += 1) {
      const code = codes[ty * WTILES + tx];
      const x = tx * TILE, y = ty * TILE;
      const h = hash2(tx, ty);
      if (code === 1) {
        ctx.fillStyle = COLORS.road;
        ctx.fillRect(x, y, TILE, TILE);
        if (h > 0.86) {
          ctx.fillStyle = COLORS.roadVar;
          ctx.fillRect(x + 6 + h * 20, y + 8 + h * 16, 18, 14);
        }
        const jx = tx % PERIOD < 2, jy = ty % PERIOD < 2;
        if (!(jx && jy)) {
          if (jx) {
            const c0 = tx - (tx % PERIOD);
            if (ty % 2 === 0) {
              ctx.fillStyle = COLORS.laneYellow;
              ctx.fillRect(c0 * TILE + 46, y + 6, 4, 36);
            }
            if (tx % PERIOD === 0) {
              ctx.fillStyle = 'rgba(220,224,230,0.5)';
              ctx.fillRect(x + 2, y, 2, TILE);
            } else {
              ctx.fillStyle = 'rgba(220,224,230,0.5)';
              ctx.fillRect(x + TILE - 4, y, 2, TILE);
            }
            if (ty % PERIOD === 2 || ty % PERIOD === 8) {
              ctx.fillStyle = 'rgba(225,228,233,0.7)';
              for (let px = 8; px < 40; px += 16) ctx.fillRect(x + px, y + 5, 8, 38);
            }
          } else if (jy) {
            const r0 = ty - (ty % PERIOD);
            if (tx % 2 === 0) {
              ctx.fillStyle = COLORS.laneYellow;
              ctx.fillRect(x + 6, r0 * TILE + 46, 36, 4);
            }
            if (ty % PERIOD === 0) {
              ctx.fillStyle = 'rgba(220,224,230,0.5)';
              ctx.fillRect(x, y + 2, TILE, 2);
            } else {
              ctx.fillStyle = 'rgba(220,224,230,0.5)';
              ctx.fillRect(x, y + TILE - 4, TILE, 2);
            }
            if (tx % PERIOD === 2 || tx % PERIOD === 8) {
              ctx.fillStyle = 'rgba(225,228,233,0.7)';
              for (let py = 8; py < 40; py += 16) ctx.fillRect(x + 5, y + py, 38, 8);
            }
          }
        } else if (h > 0.88) {
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath();
          ctx.arc(x + 24, y + 24, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        if (jx && jy) {
          const nsGreen = lightGreenNS(world.time);
          drawSignalBox(ctx, tx * TILE + TILE * 2 - 16, ty * TILE + 6, nsGreen);
          drawSignalBox(ctx, tx * TILE + 6, ty * TILE + TILE - 24, !nsGreen);
        }
      } else if (code === 2) {
        ctx.fillStyle = COLORS.sidewalk;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = 'rgba(70,75,84,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 24, y);
        ctx.lineTo(x + 24, y + TILE);
        ctx.moveTo(x, y + 24);
        ctx.lineTo(x + TILE, y + 24);
        ctx.stroke();
        ctx.fillStyle = COLORS.curb;
        const wl = world.city.codes;
        if (ty > 0 && (wl[(ty - 1) * WTILES + tx] === 1 || wl[(ty - 1) * WTILES + tx] === 7)) ctx.fillRect(x, y, TILE, 3);
        if (ty < WTILES - 1 && (wl[(ty + 1) * WTILES + tx] === 1 || wl[(ty + 1) * WTILES + tx] === 7)) ctx.fillRect(x, y + TILE - 3, TILE, 3);
        if (tx > 0 && (wl[ty * WTILES + tx - 1] === 1 || wl[ty * WTILES + tx - 1] === 7)) ctx.fillRect(x, y, 3, TILE);
        if (tx < WTILES - 1 && (wl[ty * WTILES + tx + 1] === 1 || wl[ty * WTILES + tx + 1] === 7)) ctx.fillRect(x + TILE - 3, y, 3, TILE);
      } else if (code === 0) {
        ctx.fillStyle = COLORS.grass;
        ctx.fillRect(x, y, TILE, TILE);
        if (h > 0.6) {
          ctx.fillStyle = COLORS.grassDark;
          ctx.fillRect(x + h * 30, y + ((h * 97) % 34), 8, 6);
        }
      } else if (code === 4) {
        const inBlockX = tx % PERIOD === 3 || tx % PERIOD === 7;
        const inBlockY = ty % PERIOD === 3 || ty % PERIOD === 7;
        if (inBlockX || inBlockY) {
          ctx.fillStyle = '#c9b98f';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = 'rgba(120,100,70,0.25)';
          ctx.fillRect(x, y + 22, TILE, 2);
          ctx.fillRect(x + 22, y, 2, TILE);
        } else {
          ctx.fillStyle = COLORS.grass;
          ctx.fillRect(x, y, TILE, TILE);
          if (h > 0.55) {
            ctx.fillStyle = COLORS.grassDark;
            ctx.fillRect(x + 4 + h * 24, y + 6 + ((h * 71) % 28), 9, 5);
          }
        }
      } else if (code === 3) {
        ctx.fillStyle = '#b3ad9f';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = 'rgba(90,86,78,0.3)';
        ctx.strokeRect(x + 0.5, y + 0.5, TILE, TILE);
        if (h > 0.8) {
          ctx.fillStyle = 'rgba(90,86,78,0.18)';
          ctx.fillRect(x + 8, y + 10, 14, 10);
        }
      } else if (code === 9) {
        ctx.fillStyle = COLORS.plaza;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = 'rgba(105,98,86,0.35)';
        ctx.strokeRect(x + 0.5, y + 0.5, TILE / 2, TILE / 2);
        ctx.strokeRect(x + TILE / 2, y + TILE / 2, TILE / 2 - 1, TILE / 2 - 1);
      } else if (code === 8) {
        ctx.fillStyle = COLORS.lot;
        ctx.fillRect(x, y, TILE, TILE);
        if (h > 0.72) {
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.beginPath();
          ctx.ellipse(x + 24, y + 24, 12, 8, h * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (code === 5) {
        ctx.fillStyle = COLORS.sand;
        ctx.fillRect(x, y, TILE, TILE);
        if (h > 0.5) {
          ctx.fillStyle = COLORS.sandDark;
          ctx.fillRect(x + 6 + h * 22, y + 8 + ((h * 53) % 26), 10, 5);
        }
      } else if (code === 6) {
        const deep = tx >= 86 || ty >= 86;
        ctx.fillStyle = deep ? COLORS.waterDeep : COLORS.water;
        ctx.fillRect(x, y, TILE, TILE);
        const ph = Math.sin(t * 1.6 + tx * 0.9 + ty * 1.4);
        if (h > 0.45) {
          ctx.fillStyle = 'rgba(210,235,250,0.28)';
          ctx.fillRect(x + 8, y + 22 + ph * 5, 22, 2.5);
          ctx.fillRect(x + 26, y + 12 + ph * 4, 12, 2);
        }
      } else if (code === 7) {
        ctx.fillStyle = COLORS.bridge;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = 'rgba(0,0,0,0.14)';
        if (tx % PERIOD < 2 && ty % PERIOD >= 2) {
          for (let py = 4; py < TILE; py += 10) ctx.fillRect(x, y + py, TILE, 2);
        } else {
          for (let px = 4; px < TILE; px += 10) ctx.fillRect(x + px, y, 2, TILE);
        }
        ctx.fillStyle = COLORS.bridgeDark;
        const wl = world.city.codes;
        if (tx > 0 && wl[ty * WTILES + tx - 1] === 6) ctx.fillRect(x + 1, y, 3, TILE);
        if (tx < WTILES - 1 && wl[ty * WTILES + tx + 1] === 6) ctx.fillRect(x + TILE - 4, y, 3, TILE);
        if (ty > 0 && wl[(ty - 1) * WTILES + tx] === 6) ctx.fillRect(x, y + 1, TILE, 3);
        if (ty < WTILES - 1 && wl[(ty + 1) * WTILES + tx] === 6) ctx.fillRect(x, y + TILE - 4, TILE, 3);
      }
    }
  }
}

function drawDecals(ctx, world, vx0, vy0, vx1, vy1) {
  for (const d of world.city.decals) {
    if (d.x < vx0 - 200 || d.x > vx1 + 200 || d.y < vy0 - 200 || d.y > vy1 + 200) continue;
    if (d.t === 'label') {
      ctx.font = '800 ' + d.size + 'px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, d.x, d.y);
      ctx.textAlign = 'left';
    } else if (d.t === 'pad') {
      ctx.fillStyle = hexA(d.color, 0.16);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hexA(d.color, 0.5);
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (d.t === 'lotline') {
      ctx.strokeStyle = 'rgba(230,232,236,0.5)';
      ctx.lineWidth = 2;
      if (d.dash) ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(d.x1, d.y1);
      ctx.lineTo(d.x2, d.y2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (d.t === 'pond') {
      ctx.fillStyle = COLORS.water;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7a6a4a';
      ctx.lineWidth = 3;
      ctx.stroke();
      const ph = Math.sin(world.time * 1.4 + d.x * 0.01);
      ctx.fillStyle = 'rgba(210,235,250,0.3)';
      ctx.beginPath();
      ctx.ellipse(d.x - 14, d.y + ph * 4, 18, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(d.x + 16, d.y - ph * 5, 12, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.t === 'pier') {
      ctx.fillStyle = '#8a6b47';
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.fillStyle = 'rgba(60,40,24,0.35)';
      const horiz = d.w > d.h;
      if (horiz) {
        for (let px = 6; px < d.w; px += 14) ctx.fillRect(d.x + px, d.y, 2, d.h);
      } else {
        for (let py = 6; py < d.h; py += 14) ctx.fillRect(d.x, d.y + py, d.w, 2);
      }
      ctx.fillStyle = '#5c4630';
      if (horiz) {
        ctx.fillRect(d.x + 2, d.y - 3, 5, d.h + 6);
        ctx.fillRect(d.x + d.w - 7, d.y - 3, 5, d.h + 6);
      } else {
        ctx.fillRect(d.x - 3, d.y + 2, d.w + 6, 5);
        ctx.fillRect(d.x - 3, d.y + d.h - 7, d.w + 6, 5);
      }
    } else if (d.t === 'flower') {
      ctx.fillStyle = d.c;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(d.x - 1, d.y - 1, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function drawProps(ctx, world, vx0, vy0, vx1, vy1) {
  const overhead = world.renderCache || (world.renderCache = { trees: [], umbrellas: [] });
  overhead.trees.length = 0;
  overhead.umbrellas.length = 0;
  for (const p of world.city.props) {
    if (p.x < vx0 - 40 || p.x > vx1 + 40 || p.y < vy0 - 40 || p.y > vy1 + 40) continue;
    if (p.t === 'lamp') {
      ctx.fillStyle = COLORS.shadow;
      ctx.beginPath();
      ctx.ellipse(p.x + 4, p.y + 5, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a3f46';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8d9a0';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.t === 'hydrant') {
      ctx.fillStyle = '#c23b3b';
      rr(ctx, p.x - 4, p.y - 5, 8, 10, 3);
      ctx.fill();
      ctx.fillStyle = '#e05252';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.t === 'mailbox') {
      ctx.fillStyle = p.c;
      rr(ctx, p.x - 5, p.y - 6, 10, 12, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(p.x - 3, p.y - 3, 6, 2);
    } else if (p.t === 'bin') {
      ctx.fillStyle = COLORS.shadow;
      ctx.beginPath();
      ctx.ellipse(p.x + 3, p.y + 3, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.t === 'bag') {
      ctx.fillStyle = '#2f2f36';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 7, 5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(p.x + 6, p.y + 2, 5, 4, -0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.t === 'bench') {
      ctx.fillStyle = COLORS.shadow;
      ctx.fillRect(p.x - 12, p.y - 2, 26, 8);
      ctx.fillStyle = p.c;
      rr(ctx, p.x - 13, p.y - 5, 26, 9, 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(p.x - 13, p.y - 2, 26, 2);
      ctx.fillRect(p.x - 13, p.y + 1, 26, 2);
    } else if (p.t === 'umbrella') {
      ctx.fillStyle = COLORS.shadow;
      ctx.beginPath();
      ctx.ellipse(p.x + 6, p.y + 8, 16, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c9c2b2';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
      overhead.umbrellas.push(p);
    } else if (p.t === 'towel') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a || 0);
      ctx.fillStyle = p.c;
      ctx.fillRect(-10, -6, 20, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(-10, -2, 20, 2);
      ctx.fillRect(-10, 2, 20, 2);
      ctx.restore();
    } else if (p.t === 'crate') {
      ctx.fillStyle = COLORS.shadow;
      ctx.fillRect(p.x - 8, p.y - 5, 20, 15);
      ctx.fillStyle = '#a8804f';
      ctx.fillRect(p.x - 10, p.y - 10, 20, 20);
      ctx.strokeStyle = 'rgba(60,40,20,0.5)';
      ctx.strokeRect(p.x - 10, p.y - 10, 20, 20);
      ctx.beginPath();
      ctx.moveTo(p.x - 10, p.y - 10);
      ctx.lineTo(p.x + 10, p.y + 10);
      ctx.moveTo(p.x + 10, p.y - 10);
      ctx.lineTo(p.x - 10, p.y + 10);
      ctx.stroke();
    } else if (p.t === 'boat') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a || 0);
      ctx.fillStyle = 'rgba(10,40,70,0.5)';
      ctx.beginPath();
      ctx.ellipse(3, 5, 24, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.moveTo(-24, -8);
      ctx.lineTo(20, -8);
      ctx.quadraticCurveTo(30, 0, 20, 8);
      ctx.lineTo(-24, 8);
      ctx.quadraticCurveTo(-28, 0, -24, -8);
      ctx.fill();
      ctx.fillStyle = '#e8e4da';
      rr(ctx, -6, -5, 14, 10, 3);
      ctx.fill();
      ctx.fillStyle = '#3a4a5c';
      ctx.fillRect(-2, -3, 6, 6);
      ctx.restore();
    } else if (p.t === 'crane') {
      ctx.fillStyle = COLORS.shadow;
      ctx.fillRect(p.x + 6, p.y + 8, 26, 12);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x - 12, p.y - 12, 24, 24);
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 40, p.y - 10);
      ctx.stroke();
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(p.x + 38, p.y - 10, 4, 16);
    }
  }
  for (const tree of world.city.trees) {
    if (tree.x < vx0 - 40 || tree.x > vx1 + 40 || tree.y < vy0 - 40 || tree.y > vy1 + 40) continue;
    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(tree.x + 7, tree.y + 8, tree.r * 0.9, tree.r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.trunk;
    ctx.beginPath();
    ctx.arc(tree.x, tree.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    overhead.trees.push(tree);
  }
  world.renderCache = overhead;
}

function drawSkids(ctx, world) {
  ctx.fillStyle = 'rgba(20,22,26,0.4)';
  for (const s of world.fx.skids) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.globalAlpha = Math.min(0.5, s.life / 5 * 0.5);
    ctx.fillRect(-5, -1.6, 10, 3.2);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawCorpses(ctx, world) {
  for (const ped of world.peds) {
    if (!ped.dead) continue;
    const a = Math.min(1, ped.corpseT / 3);
    ctx.save();
    ctx.translate(ped.x, ped.y);
    ctx.rotate(ped.angle + Math.PI / 2);
    ctx.globalAlpha = a;
    ctx.fillStyle = ped.look.pants;
    ctx.fillRect(-4, -9, 3, 12);
    ctx.fillRect(1, -10, 3, 11);
    ctx.fillStyle = ped.look.shirt;
    rr(ctx, -6, -2, 12, 14, 4);
    ctx.fill();
    ctx.fillStyle = ped.look.skin;
    ctx.beginPath();
    ctx.arc(0, 14, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawCar(ctx, world, car) {
  const l = car.type.l, w = car.type.w;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = COLORS.shadow;
  rr(ctx, -l / 2 + 4, -w / 2 + 5, l, w, 8);
  ctx.fill();
  if (car.dead) {
    ctx.fillStyle = shade(car.style.color, 0.34);
    rr(ctx, -l / 2, -w / 2, l, w, 8);
    ctx.fill();
    ctx.fillStyle = '#17171b';
    rr(ctx, -l * 0.2, -w * 0.38, l * 0.42, w * 0.76, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(120,120,126,0.4)';
    ctx.fillRect(-l / 2 + 4, -w / 2 + 3, l * 0.3, 3);
    ctx.restore();
    return;
  }
  const isPolice = car.kind === 'police';
  const body = isPolice ? '#e8eaee' : car.style.color;
  ctx.fillStyle = body;
  rr(ctx, -l / 2, -w / 2, l, w, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  rr(ctx, l * 0.14, -w / 2 + 2, l * 0.22, w - 4, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  rr(ctx, -l * 0.4, -w / 2 + 2, l * 0.2, w - 4, 5);
  ctx.fill();
  if (isPolice) {
    ctx.fillStyle = '#22262e';
    rr(ctx, l * 0.3, -w / 2, l * 0.2, w, 4);
    ctx.fill();
    rr(ctx, -l * 0.5, -w / 2, l * 0.16, w, 4);
    ctx.fill();
    ctx.fillStyle = '#d9b23b';
    ctx.beginPath();
    ctx.arc(-l * 0.05, -w / 2 + 4, 2.2, 0, Math.PI * 2);
    ctx.arc(-l * 0.05, w / 2 - 4, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#1e2833';
  rr(ctx, l * 0.1, -w * 0.34, l * 0.14, w * 0.68, 3);
  ctx.fill();
  rr(ctx, -l * 0.3, -w * 0.32, l * 0.1, w * 0.64, 3);
  ctx.fill();
  ctx.fillStyle = shade(body, 1.18);
  rr(ctx, -l * 0.2, -w * 0.36, l * 0.3, w * 0.72, 5);
  ctx.fill();
  if (car.kind === 'taxi') {
    ctx.fillStyle = '#e8c33b';
    rr(ctx, -l * 0.1, -w * 0.16, l * 0.16, w * 0.32, 2);
    ctx.fill();
    ctx.fillStyle = '#22262e';
    ctx.fillRect(-l * 0.07, -1.5, l * 0.1, 3);
  }
  if (isPolice) {
    const flash = Math.sin(world.time * 12) > 0;
    ctx.fillStyle = flash ? '#ff5348' : '#7a1f1a';
    ctx.fillRect(-l * 0.05, -w * 0.3, 7, w * 0.26);
    ctx.fillStyle = flash ? '#2a3f8f' : '#4b8ff2';
    ctx.fillRect(-l * 0.05, w * 0.06, 7, w * 0.26);
    if (car.siren) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = flash ? '#ff5348' : '#4b8ff2';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  if (car.kind === 'boss') {
    ctx.strokeStyle = '#3a3f47';
    ctx.lineWidth = 2;
    ctx.strokeRect(-l * 0.42, -w * 0.36, l * 0.84, w * 0.72);
    ctx.fillStyle = '#3a3f47';
    for (const px of [-l * 0.3, 0, l * 0.3]) {
      ctx.fillRect(px - 1.5, -w * 0.42, 3, 3);
      ctx.fillRect(px - 1.5, w * 0.42 - 3, 3, 3);
    }
  }
  ctx.fillStyle = '#f2e9b8';
  ctx.fillRect(l / 2 - 4, -w * 0.36, 3, 5);
  ctx.fillRect(l / 2 - 4, w * 0.36 - 5, 3, 5);
  ctx.fillStyle = '#c23b3b';
  ctx.fillRect(-l / 2 + 1, -w * 0.36, 2.5, 5);
  ctx.fillRect(-l / 2 + 1, w * 0.36 - 5, 2.5, 5);
  if (car.hp < car.maxHp * 0.55) {
    ctx.fillStyle = 'rgba(30,30,34,0.4)';
    ctx.beginPath();
    ctx.ellipse(l * 0.28, -w * 0.2, 8, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-l * 0.15, w * 0.22, 6, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPed(ctx, world, ent, isPlayer) {
  const look = ent.look || { skin: '#e8bfa5', shirt: '#e8e8e8', pants: '#3a4a5c', hair: '#241a12', hat: null };
  ctx.save();
  ctx.translate(ent.x, ent.y);
  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath();
  ctx.ellipse(2, 3, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(ent.angle);
  const legSwing = Math.sin(ent.walkT || 0) * 3;
  ctx.fillStyle = look.pants;
  ctx.fillRect(-2 + legSwing * 0.5, -5, 5, 3.4);
  ctx.fillRect(-2 - legSwing * 0.5, 1.6, 5, 3.4);
  const scale = isPlayer ? 1.4 : 1.28;
  ctx.scale(scale, scale);
  ctx.fillStyle = look.shirt;
  rr(ctx, -5, -5.5, 10.5, 11, 3.5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(-1, -6.6, 1.8, 0, Math.PI * 2);
  ctx.arc(-1, 6.6, 1.8, 0, Math.PI * 2);
  ctx.fill();
  const hasGun = isPlayer || ent.gun;
  if (hasGun) {
    ctx.fillStyle = '#2b2f36';
    ctx.fillRect(2.5, -1.2, 8, 2.4);
    ctx.fillStyle = look.skin;
    ctx.beginPath();
    ctx.arc(3, 0, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(1.6, 0, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = look.hair;
  ctx.beginPath();
  ctx.arc(-0.8, 0, 3.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(2.2, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  if (look.hat) {
    ctx.fillStyle = look.hat;
    ctx.beginPath();
    ctx.arc(0.4, 0, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-3.5, -4.6, 4.4, 9.2);
  }
  ctx.restore();
}

function drawBuildings(ctx, world, vx0, vy0, vx1, vy1) {
  const vis = [];
  for (const b of world.city.buildings) {
    if (b.x + b.w < vx0 - 60 || b.x - b.ox > vx1 + 60 || b.y + b.h < vy0 - 60 || b.y - b.oy > vy1 + 60) continue;
    vis.push(b);
  }
  vis.sort((a, c) => a.y + a.h - (c.y + c.h));
  for (const b of vis) {
    ctx.fillStyle = COLORS.shadow;
    rr(ctx, b.x + 9, b.y + 11, b.w, b.h, 7);
    ctx.fill();
  }
  for (const b of vis) {
    ctx.fillStyle = shade(b.wall, 0.52);
    rr(ctx, b.x, b.y, b.w, b.h, 5);
    ctx.fill();
    ctx.fillStyle = shade(b.wall, 0.7);
    ctx.fillRect(b.x + 2, b.y + b.h - b.oy, b.w - 4, b.oy - 2);
    ctx.fillRect(b.x + b.w - b.ox, b.y + 2, b.ox - 2, b.h - b.oy - 2);
    ctx.fillStyle = '#242c38';
    for (const win of b.winS) {
      ctx.fillRect(b.x + 2 + win.x, b.y + win.y, 13, 7);
      ctx.fillStyle = 'rgba(190,215,235,0.25)';
      ctx.fillRect(b.x + 2 + win.x, b.y + win.y, 13, 2);
      ctx.fillStyle = '#242c38';
    }
    for (const win of b.winE) {
      ctx.fillRect(b.x + win.x, b.y + 2 + win.y, 7, 13);
      ctx.fillStyle = 'rgba(190,215,235,0.25)';
      ctx.fillRect(b.x + win.x, b.y + 2 + win.y, 2, 13);
      ctx.fillStyle = '#242c38';
    }
    if (b.awning) {
      const stripe = 16;
      for (let px = 6, i = 0; px < b.w - 12; px += stripe, i += 1) {
        ctx.fillStyle = i % 2 === 0 ? b.awning : '#e8e8e8';
        ctx.fillRect(b.x + px, b.y + b.h - 3, stripe, 15);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + 6, b.y + b.h + 11, b.w - 20, 4);
    }
    const rx = b.x - b.ox, ry = b.y - b.oy;
    ctx.fillStyle = b.roof;
    rr(ctx, rx, ry, b.w, b.h, 5);
    ctx.fill();
    ctx.strokeStyle = b.trim;
    ctx.lineWidth = 2;
    rr(ctx, rx + 2, ry + 2, b.w - 4, b.h - 4, 4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    rr(ctx, rx + 6, ry + 6, b.w - 12, b.h - 12, 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(rx + 2, ry + 2, b.w - 4, 2);
    ctx.fillRect(rx + 2, ry + 2, 2, b.h - 4);
    for (const d of b.details) {
      const dx = rx + d.x, dy = ry + d.y;
      if (d.t === 'ac') {
        ctx.fillStyle = '#9aa0a8';
        rr(ctx, dx, dy, 18, 14, 2);
        ctx.fill();
        ctx.fillStyle = '#6e747c';
        ctx.beginPath();
        ctx.arc(dx + 9, dy + 7, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(dx + 9, dy + 7, 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (d.t === 'vent') {
        ctx.fillStyle = '#5a5f68';
        ctx.beginPath();
        ctx.arc(dx, dy, d.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(dx - 1, dy - 1, d.r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.t === 'sky') {
        ctx.fillStyle = '#8fc3d8';
        rr(ctx, dx, dy, d.w, d.h, 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.moveTo(dx + 3, dy + d.h - 3);
        ctx.lineTo(dx + d.w - 3, dy + 3);
        ctx.stroke();
      } else if (d.t === 'tank') {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(dx + 3, dy + 5, d.r, d.r * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a6f4f';
        ctx.beginPath();
        ctx.arc(dx, dy, d.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#a5876a';
        ctx.beginPath();
        ctx.arc(dx - d.r * 0.25, dy - d.r * 0.25, d.r * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5c4630';
        ctx.beginPath();
        ctx.moveTo(dx - d.r * 0.7, dy + d.r * 0.5);
        ctx.lineTo(dx - d.r * 0.7, dy + d.r * 1.1);
        ctx.moveTo(dx + d.r * 0.7, dy + d.r * 0.5);
        ctx.lineTo(dx + d.r * 0.7, dy + d.r * 1.1);
        ctx.stroke();
      } else if (d.t === 'box') {
        ctx.fillStyle = shade(b.wall, 0.85);
        ctx.fillRect(dx, dy, 13, 9);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.strokeRect(dx, dy, 13, 9);
      }
    }
    if (b.cross) {
      ctx.fillStyle = '#c8323c';
      const cx = rx + b.w / 2, cy = ry + b.h / 2;
      ctx.fillRect(cx - 26, cy - 8, 52, 16);
      ctx.fillRect(cx - 8, cy - 26, 16, 52);
    }
    if (b.badge) {
      const cx = rx + b.w / 2, cy = ry + b.h / 2;
      ctx.fillStyle = '#d9b23b';
      ctx.beginPath();
      ctx.arc(cx, cy, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2e3f66';
      ctx.beginPath();
      ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      ctx.fill();
      starPath(ctx, cx, cy, 8, '#d9b23b');
    }
    if (b.roofText) {
      ctx.font = '800 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(b.roofText, rx + b.w / 2, ry + b.h / 2 + 7);
      ctx.textAlign = 'left';
    }
  }
}

function starPath(ctx, cx, cy, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr2 = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(a) * rr2;
    const py = cy + Math.sin(a) * rr2;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawCanopy(ctx, world, vx0, vy0, vx1, vy1) {
  const cache = world.renderCache;
  if (!cache) return;
  for (const tree of cache.trees) {
    const sway = Math.sin(world.time * 0.9 + tree.x * 0.05) * 1.6;
    ctx.fillStyle = '#356b33';
    ctx.beginPath();
    ctx.arc(tree.x + sway * 0.4, tree.y, tree.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.tree;
    ctx.beginPath();
    ctx.arc(tree.x + sway * 0.6, tree.y - 1.5, tree.r * 0.82, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.treeLight;
    ctx.beginPath();
    ctx.arc(tree.x + sway - tree.r * 0.25, tree.y - tree.r * 0.3, tree.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tree.x + sway + tree.r * 0.3, tree.y + tree.r * 0.15, tree.r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const p of cache.umbrellas) {
    const sway = Math.sin(world.time * 0.7 + p.x * 0.03) * 1.2;
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(p.x + sway, p.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(p.x + sway - 4, p.y - 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x + sway, p.y, 15, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBullets(ctx, world) {
  ctx.strokeStyle = 'rgba(250,235,170,0.9)';
  ctx.lineWidth = 2;
  for (const b of world.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.014, b.y - b.vy * 0.014);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  if (world.muzzle) {
    const m = world.muzzle;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.angle);
    ctx.fillStyle = 'rgba(255,233,168,0.95)';
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(12, 0);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawParticles(ctx, world) {
  const parts = world.fx.parts;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of parts) {
    const lf = p.life / p.maxLife;
    if (p.type === 'spark') {
      ctx.globalAlpha = Math.min(1, lf * 1.6);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    } else if (p.type === 'fire') {
      ctx.globalAlpha = Math.min(0.85, lf * 1.2);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'flash') {
      ctx.globalAlpha = lf * 0.9;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const p of parts) {
    const lf = p.life / p.maxLife;
    if (p.type === 'smoke') {
      ctx.globalAlpha = Math.min(0.34, lf * 0.45);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.min(22, Math.max(1, p.size)), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'blood') {
      ctx.globalAlpha = Math.min(0.9, lf * 1.4);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'pool') {
      ctx.globalAlpha = Math.min(0.55, lf) * 0.8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size * 1.6, p.size * 1.1, 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'dust') {
      ctx.globalAlpha = Math.min(0.3, lf * 0.5);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawBeacons(ctx, world) {
  const marker = missionMarker(world);
  if (!marker) return;
  const pulse = Math.sin(world.time * 4.5);
  const col = marker.kind === 'giver' ? '#f2c14b' : '#f06060';
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(marker.x, marker.y, 30 + pulse * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = col;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(marker.x, marker.y, 26 + pulse * 3, 0, Math.PI * 2);
  ctx.stroke();
  const grad = ctx.createLinearGradient(marker.x, marker.y - 90, marker.x, marker.y);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(1, hexA(col, 0.4));
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = grad;
  ctx.fillRect(marker.x - 9, marker.y - 90, 18, 90);
  ctx.globalAlpha = 1;
  ctx.translate(marker.x, marker.y - 58 + pulse * 4);
  ctx.rotate(world.time * 2.2);
  ctx.fillStyle = col;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.lineTo(10, 0);
  ctx.lineTo(0, 13);
  ctx.lineTo(-10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFloats(ctx, world) {
  ctx.textAlign = 'center';
  for (const f of world.fx.floats) {
    ctx.globalAlpha = Math.min(1, f.life / 0.6);
    ctx.font = '800 ' + f.size + 'px Arial';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 3;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function markerEdgeArrow(ctx, world, W, H) {
  const marker = missionMarker(world);
  if (!marker) return null;
  const cam = world.cam;
  const zoom = cam.zoom;
  const sx = W / 2 + (marker.x - cam.x) * zoom;
  const sy = H / 2 + (marker.y - cam.y) * zoom;
  const margin = 70;
  if (sx > margin && sx < W - margin - 214 && sy > margin + 20 && sy < H - margin) return null;
  const cx = W / 2 - 100, cy = H / 2;
  const a = Math.atan2(sy - cy, sx - cx);
  const rx = Math.min(W - 60 - 210, Math.max(50, W / 2 + Math.cos(a) * 340));
  const ry = Math.min(H - 70, Math.max(90, H / 2 + Math.sin(a) * 260));
  const col = marker.kind === 'giver' ? '#f2c14b' : '#f06060';
  ctx.save();
  ctx.translate(rx, ry);
  ctx.rotate(a);
  ctx.fillStyle = col;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-8, -9);
  ctx.lineTo(-8, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  const focus = world.player.inCar || world.player;
  const d = Math.round(Math.hypot(marker.x - focus.x, marker.y - focus.y) / 16);
  ctx.font = '800 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = 3;
  ctx.strokeText(d + 'm', rx, ry + 26);
  ctx.fillText(d + 'm', rx, ry + 26);
  ctx.textAlign = 'left';
  return true;
}
