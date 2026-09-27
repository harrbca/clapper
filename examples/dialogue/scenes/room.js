// A toon living room behind Pip: flat colours, one shadow tone, ink lines. It sits at depth 0.85,
// so camera moves slide it a little less than Pip.
import { TAU } from '/@kit/core.js';
import { view } from '/@kit/camera.js';
import { focus } from '/@kit/finish.js';

const INK = '#2A1C33', LW = 4;
const inked = (ctx, path, fill, lw = LW) => {
  if (fill) { ctx.fillStyle = fill; ctx.fill(path); }
  ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(path);
};
const rect = (x, y, w, h, r = 0) => { const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; };

export function room(ctx, cam, t, W, H) {
  focus(ctx, cam, 0.85, () => view(ctx, cam, 0.85, () => {
    // the wall, and its shadow towards the left
    ctx.fillStyle = '#8FC3D4'; ctx.fillRect(-400, -300, W + 800, H + 600);
    const g = ctx.createLinearGradient(-400, 0, 700, 0);
    g.addColorStop(0, 'rgba(40,70,110,0.28)'); g.addColorStop(1, 'rgba(40,70,110,0)');
    ctx.fillStyle = g; ctx.fillRect(-400, -300, 1100, H + 600);
    // wainscoting below a chair rail
    ctx.fillStyle = '#6FA2B6'; ctx.fillRect(-400, 780, W + 800, 600);
    inked(ctx, rect(-400, 766, W + 800, 18), '#F4EBDD');
    for (let x = -300; x < W + 400; x += 260) inked(ctx, rect(x, 820, 200, 300, 8), null, 3);

    // the window: an evening sky, a sun going down, clouds drifting
    const win = rect(1260, 130, 470, 470, 14);
    ctx.save(); ctx.clip(win);
    const sky = ctx.createLinearGradient(0, 130, 0, 600);
    sky.addColorStop(0, '#FFB88C'); sky.addColorStop(0.6, '#FFD6A2'); sky.addColorStop(1, '#FFE9C4');
    ctx.fillStyle = sky; ctx.fillRect(1260, 130, 470, 470);
    ctx.fillStyle = '#FFF4D6'; ctx.beginPath(); ctx.arc(1560, 470, 70, 0, TAU); ctx.fill();
    for (const [cx, cy, s] of [[1330, 250, 1], [1640, 330, 0.8], [1450, 400, 0.6]]) {
      const x = cx + ((t * 9 * s) % 600) - 100;
      const cloud = new Path2D();
      cloud.moveTo(x - 60 * s, cy); cloud.arc(x - 30 * s, cy - 8 * s, 30 * s, Math.PI, 0); cloud.arc(x + 14 * s, cy - 20 * s, 38 * s, Math.PI, 0); cloud.arc(x + 58 * s, cy - 4 * s, 24 * s, Math.PI, 0); cloud.closePath();
      inked(ctx, cloud, '#FFFFFF', 3);
    }
    ctx.restore();
    inked(ctx, win, null, 16); inked(ctx, win, null);
    ctx.strokeStyle = '#F4EBDD'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(1495, 130); ctx.lineTo(1495, 600); ctx.moveTo(1260, 365); ctx.lineTo(1730, 365); ctx.stroke();
    inked(ctx, rect(1488, 130, 14, 470), null, 2.5); inked(ctx, rect(1260, 358, 470, 14), null, 2.5);
    inked(ctx, rect(1236, 596, 518, 30, 6), '#F4EBDD');                                  // the sill

    // a framed picture: a little clapperboard
    inked(ctx, rect(180, 170, 250, 200, 6), '#C98A4B');
    inked(ctx, rect(200, 190, 210, 160, 3), '#FFF7EA');
    inked(ctx, rect(245, 245, 120, 80, 4), '#1B2330', 3);
    ctx.save(); ctx.beginPath(); ctx.rect(245, 222, 120, 22); ctx.clip();
    for (let i = -1; i < 6; i++) { ctx.fillStyle = i % 2 ? '#FFFFFF' : '#FF8A1F'; ctx.beginPath(); ctx.moveTo(245 + i * 24, 244); ctx.lineTo(269 + i * 24, 244); ctx.lineTo(281 + i * 24, 222); ctx.lineTo(257 + i * 24, 222); ctx.fill(); }
    ctx.restore();
    inked(ctx, rect(245, 222, 120, 22, 3), null, 3);

    // a plant in a pot, swaying a touch
    const sway = Math.sin(t * 0.9) * 0.03;
    ctx.save(); ctx.translate(250, 760);
    for (const [a, len, w] of [[-0.55, 250, 60], [-0.15, 300, 64], [0.3, 270, 58], [0.7, 220, 50], [-0.9, 190, 46]]) {
      ctx.save(); ctx.rotate(a + sway);
      const leaf = new Path2D(); leaf.moveTo(0, 0); leaf.quadraticCurveTo(w, -len * 0.55, 0, -len); leaf.quadraticCurveTo(-w, -len * 0.55, 0, 0);
      inked(ctx, leaf, '#4DAA6A', 3.5);
      ctx.save(); ctx.clip(leaf); ctx.fillStyle = '#3A8A55'; ctx.fillRect(-w, -len, w, len); ctx.restore();
      inked(ctx, leaf, null, 3.5);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(4, -len * 0.5, 0, -len * 0.92); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.restore();
    }
    const pot = new Path2D(); pot.moveTo(-90, -10); pot.lineTo(90, -10); pot.lineTo(70, 160); pot.lineTo(-70, 160); pot.closePath();
    inked(ctx, pot, '#E9774B');
    ctx.save(); ctx.clip(pot); ctx.fillStyle = '#C95E36'; ctx.fillRect(-90, -10, 60, 180); ctx.restore(); inked(ctx, pot, null);
    inked(ctx, rect(-100, -26, 200, 30, 6), '#F08A5D');
    ctx.restore();
  }), { strength: 3 });
}
