// The studio: a warm wall, a floor, and soft shapes at three depths, so camera moves show parallax.
import { hash, TAU } from '/@kit/core.js';
import { view } from '/@kit/camera.js';
import { focus } from '/@kit/finish.js';

export const FLOOR = 880;          // where the floor meets the wall, and the feet stand
export const WALL = { top: '#FFF4E6', bottom: '#FADFC4' };

// Far away: big soft discs. Nearer: small floating shapes, drifting. `k` fades them for busier shots.
const FAR = [[180, 250, 210, '#FFD8B5'], [1720, 190, 250, '#CDEDE7'], [1180, 120, 120, '#FFE6A6'], [560, 90, 90, '#CDEDE7'], [1500, 560, 150, '#FFD8B5']];
const MID = Array.from({ length: 9 }, (_, i) => ({
  x: 120 + hash(i * 3.1) * 1680, y: 120 + hash(i * 5.7) * 560, kind: i % 3,
  size: 20 + hash(i * 1.9) * 26, spin: (hash(i * 7.3) - 0.5) * 0.6, col: ['#FF8A1F', '#23A89A', '#FFC24A'][i % 3],
}));

export function backdrop(ctx, cam, t, W, H) {
  // the wall and floor are painted far away (depth 0.15), wider than the frame so zooms stay covered
  view(ctx, cam, 0.15, () => {
    const g = ctx.createLinearGradient(0, -200, 0, FLOOR + 100);
    g.addColorStop(0, WALL.top); g.addColorStop(1, WALL.bottom);
    ctx.fillStyle = g; ctx.fillRect(-600, -400, W + 1200, FLOOR + 1400);
  });
  // the far layers are out of focus, more so when the camera pushes in
  focus(ctx, cam, 0.3, () => view(ctx, cam, 0.3, () => {
    for (const [x, y, r, col] of FAR) {
      ctx.fillStyle = col; ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.arc(x + Math.sin(t * 0.15 + x) * 12, y + Math.cos(t * 0.12 + y) * 10, r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }));
  focus(ctx, cam, 0.6, () => view(ctx, cam, 0.6, () => {
    ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const m of MID) {
      const x = m.x + Math.sin(t * 0.3 + m.x) * 18, y = m.y + Math.cos(t * 0.25 + m.y) * 14;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * m.spin + m.x);
      ctx.strokeStyle = m.col; ctx.globalAlpha = 0.45;
      if (m.kind === 0) { ctx.beginPath(); ctx.arc(0, 0, m.size * 0.6, 0, TAU); ctx.stroke(); }
      else if (m.kind === 1) { const s = m.size * 0.55; ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke(); }
      else { ctx.beginPath(); for (let i = 0; i <= 3; i++) ctx.lineTo(-m.size + i * m.size * 0.66, i % 2 ? -m.size * 0.3 : m.size * 0.3); ctx.stroke(); }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }));
  // the floor, on the scene's own plane
  view(ctx, cam, 1, () => {
    const g = ctx.createLinearGradient(0, FLOOR, 0, H + 300);
    g.addColorStop(0, '#F1C79F'); g.addColorStop(1, '#E3AE82');
    ctx.fillStyle = g; ctx.fillRect(-1200, FLOOR, W + 2400, H + 600);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-1200, FLOOR, W + 2400, 3);
    // a soft pool of light where Pip stands
    const s = ctx.createRadialGradient(820, FLOOR + 60, 20, 820, FLOOR + 60, 620);
    s.addColorStop(0, 'rgba(255,248,236,0.55)'); s.addColorStop(1, 'rgba(255,248,236,0)');
    ctx.fillStyle = s; ctx.fillRect(100, FLOOR, 1500, 400);
  });
}

// A soft shadow on the floor under something at height `lift` above it (the higher, the fainter).
export function shadow(ctx, x, w, lift = 0) {
  const k = 1 / (1 + lift / 260);
  ctx.save();
  ctx.translate(x, FLOOR + 22);
  ctx.scale(1, 0.18);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * (1.2 - 0.4 * k));
  g.addColorStop(0, `rgba(120,70,40,${0.32 * k})`); g.addColorStop(1, 'rgba(120,70,40,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, w * 1.3, 0, TAU); ctx.fill();
  ctx.restore();
}
