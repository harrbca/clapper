// Bolt, a small hovering robot. Origin at the middle of its body; about 150 px across.
import { clamp, lerp, TAU } from '/@kit/core.js';
import { Puppet } from '/@kit/puppet.js';
import { blink } from '/@kit/life.js';
import { lag } from '/@kit/spring.js';

const PAL = { shell: '#F6F8FC', shellShade: '#C7D1E0', band: '#FF8A1F', screen: '#18202E', glow: '#61F0FF', ball: '#FF8A1F' };

function drawBody(ctx, pose) {
  // the shell: an egg, lit from the upper right, with a rim of light on the dark side
  const shell = new Path2D();
  shell.moveTo(0, -72);
  shell.bezierCurveTo(56, -72, 82, -36, 82, 4);
  shell.bezierCurveTo(82, 48, 46, 70, 0, 70);
  shell.bezierCurveTo(-46, 70, -82, 48, -82, 4);
  shell.bezierCurveTo(-82, -36, -56, -72, 0, -72);
  const g = ctx.createRadialGradient(28, -40, 10, 0, 0, 96);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.55, PAL.shell); g.addColorStop(1, PAL.shellShade);
  ctx.fillStyle = g; ctx.fill(shell);
  ctx.save(); ctx.clip(shell);
  ctx.fillStyle = PAL.band; ctx.fillRect(-90, 34, 180, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-90, 34, 180, 3);
  ctx.restore();
  // the face screen
  const scr = new Path2D(); scr.roundRect(-54, -46, 108, 66, 24);
  const sg = ctx.createLinearGradient(0, -46, 0, 20);
  sg.addColorStop(0, '#26324A'); sg.addColorStop(1, PAL.screen);
  ctx.fillStyle = sg; ctx.fill(scr);
  ctx.save(); ctx.clip(scr);
  drawEyes(ctx, pose);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';                   // glass sheen
  ctx.beginPath(); ctx.moveTo(-54, -46); ctx.lineTo(10, -46); ctx.lineTo(-30, 20); ctx.lineTo(-54, 20); ctx.fill();
  ctx.restore();
}

// Eyes by mood: 0 normal, 1 happy (^ ^), 2 wow (rings). eyes.x looks sideways; mouth.open for beeps.
function drawEyes(ctx, pose) {
  const mood = Math.round(pose['eyes.mood'] ?? 0), shut = clamp(pose['eyes.blink'] ?? 0), gx = (pose['eyes.x'] ?? 0) * 7;
  ctx.save();
  ctx.shadowColor = PAL.glow; ctx.shadowBlur = 14;
  ctx.fillStyle = PAL.glow; ctx.strokeStyle = PAL.glow; ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    const x = s * 22 + gx, y = -16;
    if (mood === 1) {
      ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y + 6, 10, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    } else if (mood === 2) {
      ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 11 * (1 - shut * 0.9), 0, TAU); ctx.stroke();
    } else {
      const h = lerp(26, 3, shut);
      ctx.beginPath(); ctx.roundRect(x - 8, y - h / 2, 16, h, 8); ctx.fill();
    }
  }
  const open = clamp(pose['mouth.open'] ?? 0);
  ctx.lineWidth = 4;
  if (open > 0.05) { ctx.beginPath(); ctx.ellipse(gx, 8, 7 + open * 3, 3 + open * 6, 0, 0, TAU); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(gx, 2, 9, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); }
  ctx.restore();
}

// The antenna points up from its base; the rig swings it.
function drawAntenna(ctx) {
  ctx.strokeStyle = PAL.shellShade; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -40); ctx.stroke();
  ctx.save(); ctx.shadowColor = PAL.ball; ctx.shadowBlur = 16;
  ctx.fillStyle = PAL.ball; ctx.beginPath(); ctx.arc(0, -46, 10, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(3, -49, 3.5, 0, TAU); ctx.fill();
}

const drawHand = ctx => {
  const g = ctx.createRadialGradient(6, -6, 2, 0, 0, 22);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, PAL.shellShade);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill();
  ctx.fillStyle = PAL.band; ctx.beginPath(); ctx.arc(0, 0, 20, Math.PI * 0.15, Math.PI * 0.85); ctx.fill();
};

function drawFlame(ctx, pose) {
  const k = clamp(pose['flame.k'] ?? 0.3), flick = pose['flame.flick'] ?? 0;
  ctx.fillStyle = '#39414F'; ctx.beginPath(); ctx.roundRect(-18, -6, 36, 14, 6); ctx.fill();
  if (k < 0.02) return;
  const len = 18 + 70 * k * (0.85 + 0.15 * flick);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [w, l, col] of [[16, 1, 'rgba(255,120,40,0.75)'], [10, 0.7, 'rgba(255,210,90,0.9)'], [5, 0.45, 'rgba(255,255,230,0.95)']]) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(-w, 8); ctx.quadraticCurveTo(0, 8 + len * l * 1.3, w, 8); ctx.fill();
  }
  ctx.restore();
}

export const bolt = new Puppet([
  { name: 'body', at: [0, 0], z: 1, draw: drawBody },
  { name: 'antenna', parent: 'body', at: [0, -66], z: 0, draw: drawAntenna },
  { name: 'flame', parent: 'body', at: [0, 66], z: 0, draw: drawFlame },
  { name: 'handL', parent: 'body', at: [-100, 16], z: 2, draw: drawHand },
  { name: 'handR', parent: 'body', at: [100, 16], z: 2, draw: drawHand },
]);

// Bolt at t, flying along path(t) -> [x, y]: it tilts into its speed, its thruster burns harder when
// it climbs or rushes, its antenna whips behind, and it hovers with a bob when it is still.
export function boltPose(t, path, extra = {}) {
  const dt = 1 / 120, [x0, y0] = path(t - dt), [x1, y1] = path(t + dt);
  const vx = (x1 - x0) / (2 * dt), vy = (y1 - y0) / (2 * dt), speed = Math.hypot(vx, vy);
  const p = {
    'body.r': clamp(vx * 0.00035, -0.5, 0.5),
    'body.y': Math.sin(t * 2.4) * 7,
    'handL.y': Math.sin(t * 2.4 + 0.8) * 6, 'handR.y': Math.sin(t * 2.4 + 1.3) * 6,
    'handL.x': clamp(vx * 0.004, -30, 30), 'handR.x': clamp(vx * 0.004, -30, 30),
    'flame.k': clamp(0.25 + speed / 2600 - vy / 1600, 0.15, 1),
    'flame.flick': Math.sin(t * 57) * Math.sin(t * 31),
    'eyes.blink': blink(t, 11),
    'eyes.x': clamp(vx / 1200, -1, 1),
    ...extra,
  };
  // lagging behind the motion: moving right, the tip trails to the left
  p['antenna.r'] = clamp(lag('bolt.antenna', t, u => path(u)[0] / 180, { preset: 'wobbly' }) * 0.6, -1.1, 1.1) - p['body.r'] * 0.3;
  return p;
}
