// Street-level city kit for the series: plaza + road + sidewalks, window-textured buildings,
// lamps, traffic lights, planter trees, blocky people and box cars.  Everything is deterministic
// through the world's rng.  Scenes call the build functions once and the update helpers per frame.
import { THREE, mulberry32, clamp, smooth, lerp, frac, radialTexture } from './common.js';

export const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
export const glowMat = (c, o = 0.5) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
export function solid(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }

export function tileTexture(base, line, nx, ny) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 512, 512); g.strokeStyle = line; g.lineWidth = 3;
  for (let i = 0; i <= nx; i++) { g.beginPath(); g.moveTo(i * 512 / nx, 0); g.lineTo(i * 512 / nx, 512); g.stroke(); }
  for (let j = 0; j <= ny; j++) { g.beginPath(); g.moveTo(0, j * 512 / ny); g.lineTo(512, j * 512 / ny); g.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; return tex;
}

/** Plaza in the middle (z -6..9), road along x at z -8..-15, sidewalks on both sides and flanking the plaza. */
export function buildStreets(world, { plazaColor = '#c9c2b6', plazaLine = '#b3aca0', groundColor = 0x5b6a4c } = {}) {
  const { scene } = world;
  const base = solid(new THREE.PlaneGeometry(400, 400), lam(groundColor), false, true); base.rotation.x = -Math.PI / 2; base.position.y = -0.52; scene.add(base);
  const plazaTex = tileTexture(plazaColor, plazaLine, 6, 6); plazaTex.repeat.set(7, 4);
  const plaza = solid(new THREE.BoxGeometry(30, 0.5, 16), lam(0xffffff, { map: plazaTex }), false, true); plaza.position.set(0, -0.75, 1); scene.add(plaza);
  const walkMat = lam(0xb9b3a8);
  for (const [w, d, x, z] of [[100, 1.8, 0, -6.9], [100, 1.8, 0, -16.1], [1.8, 30, -8.6, -2], [1.8, 30, 8.6, -2]]) { const sw = solid(new THREE.BoxGeometry(w, 0.5, d), walkMat, false, true); sw.position.set(x, -0.75, z); scene.add(sw); }
  const road = solid(new THREE.BoxGeometry(100, 0.44, 7.6), lam(0x2e3034), false, true); road.position.set(0, -0.78, -11.5); scene.add(road);
  const paint = lam(0xe8e4d8, { emissive: 0x222222 });
  for (let x = -48; x < 48; x += 3) { const dash = solid(new THREE.BoxGeometry(1.6, 0.02, 0.14), paint, false, false); dash.position.set(x, -0.55, -11.5); scene.add(dash); }
  for (let x = -2.4; x <= 2.4; x += 0.8) { const stripe = solid(new THREE.BoxGeometry(0.45, 0.02, 7.2), paint, false, false); stripe.position.set(x, -0.55, -11.5); scene.add(stripe); }
  const kerbMat = lam(0x9a948a);
  for (const z of [-7.9, -15.1]) { const k = solid(new THREE.BoxGeometry(100, 0.2, 0.2), kerbMat, false, true); k.position.set(0, -0.6, z); scene.add(k); }
  return { base, plaza, road };
}

export function facadeTexture(seed, cols, rows, wall, frame) {
  const r = mulberry32(seed); const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = wall; g.fillRect(0, 0, 256, 512);
  const lit = document.createElement('canvas'); lit.width = 256; lit.height = 512; const gl = lit.getContext('2d'); gl.fillStyle = '#000'; gl.fillRect(0, 0, 256, 512);
  const cw = 256 / cols, rh = 512 / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = i * cw + cw * 0.22, y = j * rh + rh * 0.2, w = cw * 0.56, h = rh * 0.55;
    g.fillStyle = frame; g.fillRect(x - 3, y - 3, w + 6, h + 6);
    const shade = 0.25 + r() * 0.35; g.fillStyle = `rgb(${Math.round(110 * shade + 40)},${Math.round(130 * shade + 50)},${Math.round(160 * shade + 60)})`; g.fillRect(x, y, w, h);
    if (r() < 0.55) { const warm = r() < 0.75; gl.fillStyle = warm ? `rgba(255,${200 + r() * 40 | 0},${130 + r() * 60 | 0},${0.6 + r() * 0.4})` : `rgba(170,220,255,${0.5 + r() * 0.5})`; gl.fillRect(x, y, w, h); }
  }
  const mk = cv => { const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return tex; };
  return { map: mk(c), emissiveMap: mk(lit) };
}
const WALLS = ['#b9a99a', '#8e8a86', '#a86f5a', '#cfc4b4', '#7b8794', '#c2b280', '#9a8f9e', '#6f7a86'];

/** Four rows of buildings: across the street, flanking the plaza, and two deeper rows. */
export function buildBuildings(world, { nearHeights = [4.5, 9], sideHeights = [4, 8.5], midHeights = [8, 16], farHeights = [12, 26] } = {}) {
  const { scene, rng, R } = world; const pick = arr => arr[Math.floor(rng() * arr.length)];
  const buildings = [];
  function add(x, z, w, d, h) {
    const g = new THREE.Group(); g.position.set(x, -0.5, z);
    const cols = Math.max(2, Math.round(w / 1.6)), rows = Math.max(3, Math.round(h / 1.5));
    const tex = facadeTexture(Math.floor(rng() * 1e6), cols, rows, pick(WALLS), '#3a3a40');
    const mat = new THREE.MeshLambertMaterial({ map: tex.map, emissiveMap: tex.emissiveMap, emissive: 0xffd9a0, emissiveIntensity: 0 });
    const body = solid(new THREE.BoxGeometry(w, h, d), mat); body.position.y = h / 2; g.add(body);
    const roof = solid(new THREE.BoxGeometry(w + 0.3, 0.35, d + 0.3), lam(0x4a4a50)); roof.position.y = h + 0.17; g.add(roof);
    scene.add(g); const b = { g, body, roof, mat, x, z, w, d, h, rank: rng() }; buildings.push(b); return b;
  }
  for (let x = -46; x < 46;) { const w = R(5, 9), d = R(7, 11), h = R(...nearHeights); add(x + w / 2, -19.5 - d / 2, w, d, h); x += w + R(0.4, 1.2); }
  for (const side of [-1, 1]) for (let z = -18; z < 14;) { const w = R(6, 9), d = R(5, 8), h = R(...sideHeights); add(side * (11.4 + w / 2), z + d / 2, w, d, h).side = side; z += d + R(0.4, 1.0); }
  for (let x = -60; x < 60;) { const w = R(7, 12), d = R(8, 12), h = R(...midHeights); add(x + w / 2, -36 - d / 2 - R(0, 6), w, d, h); x += w + R(0.5, 2.5); }
  for (let x = -80; x < 80;) { const w = R(9, 14), d = R(9, 14), h = R(...farHeights); add(x + w / 2, -58 - d / 2 - R(0, 12), w, d, h); x += w + R(1, 4); }
  return buildings;
}

export function buildStreetFurniture(world) {
  const { scene, R, rng } = world; const pick = arr => arr[Math.floor(rng() * arr.length)];
  const lampHeads = [];
  for (const [x, z] of [[-6, -6.9], [6, -6.9], [-14, -6.9], [14, -6.9], [-10, -16.1], [10, -16.1], [-8.6, 4], [8.6, 4], [-8.6, -4], [8.6, -4]]) {
    const pole = solid(new THREE.CylinderGeometry(0.08, 0.11, 5.2, 6), lam(0x3a3f48)); pole.position.set(x, 2.1, z); scene.add(pole);
    const arm = solid(new THREE.BoxGeometry(0.1, 0.1, 1.1), lam(0x3a3f48)); arm.position.set(x, 4.6, z + (z < -10 ? 0.5 : -0.5)); scene.add(arm);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0xffe9c0, toneMapped: false })); head.position.set(x, 4.6, z + (z < -10 ? 1.0 : -1.0)); scene.add(head); lampHeads.push(head);
  }
  const trafficLights = [];
  for (const [x, z, rotY] of [[3.6, -7.3, 0], [-3.6, -15.7, Math.PI]]) {
    const pole = solid(new THREE.CylinderGeometry(0.09, 0.11, 5.4, 6), lam(0x2d3138)); pole.position.set(x, 2.2, z); scene.add(pole);
    const arm = solid(new THREE.BoxGeometry(3.6, 0.14, 0.14), lam(0x2d3138)); arm.position.set(x - 1.8 * (rotY ? -1 : 1), 4.9, z); scene.add(arm);
    const box = solid(new THREE.BoxGeometry(0.34, 0.95, 0.3), lam(0x1e2126)); box.position.set(x - 3.2 * (rotY ? -1 : 1), 4.4, z); box.rotation.y = rotY; scene.add(box);
    const lights = [0xff3b2f, 0xffc93c, 0x3bd35a].map((c, i) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 8), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); l.rotation.x = Math.PI / 2; l.position.set(0, 0.3 - i * 0.3, 0.16); box.add(l); return l; });
    trafficLights.push({ lights, phase: rotY ? 0.5 : 0 });
  }
  const treeMats = [lam(0x4f8f4a), lam(0x5aa65a), lam(0x3f7f3f)]; const trees = [];
  for (const [x, z] of [[-6.5, 6.5], [6.5, 6.5], [-6.5, -4.5], [6.5, -4.5], [-18, -6.0], [18, -6.0], [-24, -6.0], [24, -6.0], [-18, -17], [18, -17], [-30, -17], [30, -17]]) {
    const planter = solid(new THREE.BoxGeometry(1.2, 0.5, 1.2), lam(0x8d7b6a)); planter.position.set(x, -0.3, z); scene.add(planter);
    const trunk = solid(new THREE.CylinderGeometry(0.1, 0.14, 1.6, 6), lam(0x6b4a2e)); trunk.position.set(x, 0.7, z); scene.add(trunk);
    const crown = solid(new THREE.IcosahedronGeometry(R(0.9, 1.3), 1), pick(treeMats)); crown.position.set(x, 2.1, z); crown.scale.y = 1.15; scene.add(crown); trees.push(crown);
  }
  return { lampHeads, trafficLights, trees };
}
export function updateTrafficLights(trafficLights, t, powered = 1) {
  for (const tl of trafficLights) { const ph = frac(t / 8 + tl.phase); tl.lights.forEach((l, i) => { const on = i === (ph < 0.5 ? 2 : ph < 0.6 ? 1 : 0); l.material.color.set([0xff3b2f, 0xffc93c, 0x3bd35a][i]).multiplyScalar((on ? 1 : 0.18) * powered); }); }
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------
export const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac], SHIRTS = [0xd9534f, 0x3b7dd8, 0xf2b134, 0x5aa65a, 0x8e5ad8, 0xffffff, 0x2b2f3a, 0xff8a3d, 0x2fb5a3, 0xd84f8e, 0xe8e2d6], PANTS = [0x2b3a55, 0x3a3a3a, 0x6b4a2e, 0x8a8f99, 0x1f1f24], HAIRS = [0x2a1a0e, 0x4a3020, 0x8a6a3a, 0x111111, 0xc9a26a];
/** Blocky person, ~2.1 units tall, feet at y=0.  userData.limbs = { la, ra, ll, rl } pivots; userData.mats = { skin, shirt, pants, hair }. */
export function person(world, { skin, shirt, pants, hair } = {}) {
  const { rng } = world; const pick = arr => arr[Math.floor(rng() * arr.length)];
  const g = new THREE.Group(); const mats = { skin: lam(skin ?? pick(SKINS)), shirt: lam(shirt ?? pick(SHIRTS)), pants: lam(pants ?? pick(PANTS)), hair: lam(hair ?? pick(HAIRS)) };
  const torso = solid(new THREE.BoxGeometry(0.62, 0.78, 0.32), mats.shirt); torso.position.y = 1.17; g.add(torso);
  const headPiv = new THREE.Group(); headPiv.position.y = 1.62; g.add(headPiv);
  const head = solid(new THREE.BoxGeometry(0.46, 0.46, 0.46), mats.skin); head.position.y = 0.24; headPiv.add(head);
  const hairM = solid(new THREE.BoxGeometry(0.5, 0.14, 0.5), mats.hair); hairM.position.y = 0.5; headPiv.add(hairM);
  const limbs = { head: headPiv };
  for (const [name, sx] of [['la', -1], ['ra', 1]]) { const piv = new THREE.Group(); piv.position.set(sx * 0.42, 1.52, 0); const arm = solid(new THREE.BoxGeometry(0.2, 0.74, 0.2), mats.shirt); arm.position.y = -0.37; piv.add(arm); g.add(piv); limbs[name] = piv; }
  for (const [name, sx] of [['ll', -1], ['rl', 1]]) { const piv = new THREE.Group(); piv.position.set(sx * 0.16, 0.78, 0); const leg = solid(new THREE.BoxGeometry(0.26, 0.78, 0.26), mats.pants); leg.position.y = -0.39; piv.add(leg); g.add(piv); limbs[name] = piv; }
  g.userData.limbs = limbs; g.userData.mats = mats; g.userData.torso = torso; return g;
}
/** Walk cycle: phase in radians, amp 0..1.  mode 'walk' | 'run' | 'shamble'. */
export function animateGait(g, phase, mode = 'walk', amp = 1) {
  const L = g.userData.limbs;
  if (mode === 'shamble') {
    const sw = Math.sin(phase) * 0.35 * amp;
    L.ll.rotation.x = sw; L.rl.rotation.x = -sw; L.la.rotation.x = -1.45 + Math.sin(phase * 0.5) * 0.1; L.ra.rotation.x = -1.35 + Math.cos(phase * 0.5) * 0.1;
    L.la.rotation.z = 0.08; L.ra.rotation.z = -0.08; L.head.rotation.z = 0.28 + Math.sin(phase * 0.5) * 0.08; L.head.rotation.x = 0.15;
    g.userData.torso.rotation.x = 0.18; g.position.y += Math.abs(Math.sin(phase * 0.5)) * 0.03;
  } else {
    const k = mode === 'run' ? 1.0 : 0.55; const sw = Math.sin(phase) * k * amp;
    L.ll.rotation.x = sw; L.rl.rotation.x = -sw; L.la.rotation.x = -sw * (mode === 'run' ? 1.1 : 0.8); L.ra.rotation.x = sw * (mode === 'run' ? 1.1 : 0.8);
    L.la.rotation.z = 0; L.ra.rotation.z = 0; L.head.rotation.z = 0; L.head.rotation.x = mode === 'run' ? 0.12 : 0;
    g.userData.torso.rotation.x = mode === 'run' ? 0.22 : 0; g.position.y += Math.abs(Math.cos(phase)) * (mode === 'run' ? 0.08 : 0.04);
  }
}

// ---------------------------------------------------------------------------
// Cars (road, along x)
// ---------------------------------------------------------------------------
export function buildCars(world, count = 12) {
  const { scene, R } = world; const cars = [];
  const cols = [0xd9d9d9, 0xc0392b, 0x2c3e50, 0xf2b134, 0x3b7dd8, 0xffffff, 0x7f8c8d, 0x27ae60];
  for (let i = 0; i < count; i++) {
    const g = new THREE.Group(); const van = i % 5 === 0; const L = van ? 3.2 : 2.3, H = van ? 1.3 : 0.75;
    const body = solid(new THREE.BoxGeometry(L, H, 1.3), lam(cols[i % cols.length])); body.position.y = 0.55 + H / 2 - 0.3; g.add(body);
    if (!van) { const cab = solid(new THREE.BoxGeometry(L * 0.5, 0.5, 1.15), lam(0x1f2a3a)); cab.position.set(-0.1, 1.05, 0); g.add(cab); }
    const wheels = [];
    for (const [sx, sz] of [[-0.7, -0.6], [0.7, -0.6], [-0.7, 0.6], [0.7, 0.6]]) { const w = solid(new THREE.CylinderGeometry(0.26, 0.26, 0.2, 8), lam(0x111111)); w.rotation.x = Math.PI / 2; w.position.set(sx * L / 2.2, 0.26, sz); g.add(w); wheels.push(w); }
    const lights = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 1.0), new THREE.MeshBasicMaterial({ color: 0xfff2c0, toneMapped: false })); lights.position.set(L / 2, 0.6, 0); g.add(lights);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 1.0), new THREE.MeshBasicMaterial({ color: 0xff3b2f, toneMapped: false })); tail.position.set(-L / 2, 0.6, 0); g.add(tail);
    const dir = i % 2 ? 1 : -1;
    g.userData = { dir, L, speed: R(4, 7), x0: R(-50, 50), laneZ: dir > 0 ? -9.6 : -13.4, wheels, lights, tail, body, bob: R(0, 6.28), rank: R(0, 1) };
    g.position.set(0, -0.5, g.userData.laneZ); g.rotation.y = dir > 0 ? 0 : Math.PI;
    scene.add(g); cars.push(g);
  }
  return cars;
}
