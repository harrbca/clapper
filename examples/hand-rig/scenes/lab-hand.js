// The hand rig, still: six shapes in a row, palm towards us (t = 0) and from the back (t = 1), and
// close-ups of the grip (2) and the OK sign (3), and both from the thumb's side (4, 5).
// A second row of shapes, from the palm (6) and from the thumb's side (7).
//   clap still 0 1 2 3 4 5 6 7 --entry scenes/lab-hand.js
import { gradient } from '/@kit/draw.js';
import { layer3d, THREE } from '/@kit/scene3d.js';
import { HAND } from '/@kit/hand3d.js';
import { hand, handle } from './hand.js';

const ROW1 = [['relaxed', HAND.relaxed], ['open', HAND.open], ['fist', HAND.fist], ['point', HAND.point], ['ok', HAND.ok], ['grasp', HAND.grasp]];
const ROW2 = [['thumbs up', HAND.thumbsUp], ['peace', HAND.peace], ['claw', HAND.claw], ['three', h => HAND.count(h, 3)], ['touch little', h => HAND.touch(h, 3)], ['flat', HAND.flat]];
let SHAPES = ROW1;
const S = 1.9, GAP = 300;
let L, hands, bar;
export function setup(stage) {
  L = layer3d(stage, { fov: 24 });
  L.lights = L.studioLights({ fill: 0.8, key: 2.8 });
  hands = SHAPES.map(() => hand(L, { side: 1 }));
  bar = handle(L, 16, 150);
}

export function render({ ctx, W, H }, t) {
  gradient(ctx, 0, 0, W, H, '#EEF3F5', '#CBDCE4');
  const view = Math.round(t);
  // 6, 7: a second row of shapes, from the palm and from the thumb's side
  SHAPES = view >= 6 ? ROW2 : ROW1;
  const back = view === 1;
  hands.forEach((H3, i) => {
    const x = (i - 2.5) * GAP;
    H3.group.position.set(x, 120, 0);
    H3.group.scale.setScalar(S);
    // palm to the camera: the hand's palm faces -x, so turn it a quarter round y (the back: the other way)
    H3.group.rotation.set(0, back ? -Math.PI / 2 : view === 7 ? 0.35 : Math.PI / 2, 0);
    H3.sk.reset();
    const [name, shape] = SHAPES[i];
    const p = shape(H3.h);
    if (name === 'grasp') {
      H3.group.updateMatrixWorld(true);
      // the handle across the palm, from the index side down to the little finger's
      const at = H3.group.localToWorld(new THREE.Vector3(-26, -262, 2));
      const axis = new THREE.Vector3(0.12, -0.35, 1).applyQuaternion(H3.group.quaternion);
      bar.place(at, axis, S);
      H3.rig.pose(p, { hold: bar.hold });
    } else H3.rig.pose(p);
    if (name === 'ok' && globalThis.DEBUG_HAND !== view) {
      globalThis.DEBUG_HAND = view;
      H3.group.updateMatrixWorld(true);
      const a = H3.rig.pad('t'), b = H3.rig.pad(0);
      const ang = n => H3.sk.by[`handR.${n}`].rotation.toArray().slice(0, 3).map(x => x.toFixed(2)).join(',');
      console.warn(`ok: thumb pad ${a.toArray().map(x => x.toFixed(0))} index pad ${b.toArray().map(x => x.toFixed(0))} gap ${(a.distanceTo(b) / S).toFixed(1)} mm; t1 ${ang('t1')} t2 ${ang('t2')} t3 ${ang('t3')}`);
    }
  });
  // 2, 3: the grip and the OK sign, close; 4, 5: the same from the thumb's side
  const close = view >= 2 && view < 6 ? hands[view % 2 === 0 ? 5 : 4] : null;
  hands.forEach(H3 => { H3.group.visible = !close || H3 === close; });
  bar.group.visible = view < 6 && (!close || close === hands[5]);
  if (close) {
    const c = close.group.localToWorld(new THREE.Vector3(-10, -250, 0));
    if (view < 4) L.camera.position.set(c.x + 120, c.y + 90, c.z + 900);
    else L.camera.position.set(c.x + 900, c.y + 150, c.z + 120);
    L.camera.lookAt(c);
  } else {
    L.camera.position.set(0, -150, 3600); L.camera.lookAt(0, -150, 0);
  }
  L.camera.near = 50; L.camera.far = 20000; L.camera.updateProjectionMatrix();
  L.lights.rig.position.set(0, 0, 0);
  L.draw(ctx);
  ctx.font = '500 26px Roboto'; ctx.fillStyle = '#35505E'; ctx.textAlign = 'center';
  if (!close) SHAPES.forEach(([n], i) => ctx.fillText(n, W / 2 + (i - 2.5) * GAP * 0.57, H - 60));
}
