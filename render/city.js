// Street-level city kit for the series.
//
// Layout (all units metres-ish, x runs along the street, camera looks toward -z):
//   plaza        x -15..15, z -6..9          tiled square where stories start
//   near walk    z -7.8..-6                   sidewalk between plaza and road
//   road         z -15.3..-7.8                two lanes each way, crosswalk at x 0
//   far walk     z -17.1..-15.3               sidewalk in front of the shop row
//   shop row     z < -17.1                    buildings with ground-floor storefronts
//   side rows    |x| > 11.4                   buildings flanking the plaza
//   deeper rows  z < -36, z < -58             taller background blocks
// Lamps stand on the kerbs every 8 m, trees between them, traffic lights at the crosswalk.
// People are rounded blocky figures with faces, clothes and shoes; pedestrians keep to lanes with
// fixed spacing so they never pass through each other.
import { THREE, mulberry32, clamp, smooth, lerp, frac, radialTexture } from './common.js';

export const lam = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
export const glowMat = (c, o = 0.5) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
export function solid(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }

/** Box with softened corners: vertices are pulled toward an ellipsoid by `k` (0 = box, 1 = ellipsoid). */
export function roundedBox(w, h, d, k = 0.35, seg = 3) {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg); const p = g.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i) / (w / 2), p.getY(i) / (h / 2), p.getZ(i) / (d / 2));
    const len = v.length(); const s = lerp(1, 1 / len, k);
    p.setXYZ(i, v.x * s * w / 2, v.y * s * h / 2, v.z * s * d / 2);
  }
  g.computeVertexNormals(); return g;
}

export function tileTexture(base, line, nx, ny) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 512, 512); g.strokeStyle = line; g.lineWidth = 3;
  for (let i = 0; i <= nx; i++) { g.beginPath(); g.moveTo(i * 512 / nx, 0); g.lineTo(i * 512 / nx, 512); g.stroke(); }
  for (let j = 0; j <= ny; j++) { g.beginPath(); g.moveTo(0, j * 512 / ny); g.lineTo(512, j * 512 / ny); g.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; return tex;
}

export const L = { plazaZ0: -6, plazaZ1: 9, nearWalk: -6.9, roadZ0: -15.3, roadZ1: -7.8, farWalk: -16.2, shopFront: -17.1, sideX: 11.4, laneA: -9.7, laneB: -13.4 };

/** Plaza, road, sidewalks, kerbs, lane paint and a crosswalk at x = 0. */
export function buildStreets(world, { plazaColor = '#cfc8bc', plazaLine = '#bdb5a8', groundColor = 0x5b6a4c } = {}) {
  const { scene } = world;
  const base = solid(new THREE.PlaneGeometry(400, 400), lam(groundColor), false, true); base.rotation.x = -Math.PI / 2; base.position.y = -0.52; scene.add(base);
  const plazaTex = tileTexture(plazaColor, plazaLine, 6, 6); plazaTex.repeat.set(7, 3.5);
  const plaza = solid(new THREE.BoxGeometry(30, 0.5, 15), lam(0xffffff, { map: plazaTex }), false, true); plaza.position.set(0, -0.75, 1.5); scene.add(plaza);
  const walkTex = tileTexture('#b9b3a8', '#a9a398', 8, 8); walkTex.repeat.set(24, 1);
  const walkMat = lam(0xffffff, { map: walkTex });
  for (const [w, d, x, z] of [[120, 1.8, 0, L.nearWalk], [120, 1.8, 0, L.farWalk]]) { const sw = solid(new THREE.BoxGeometry(w, 0.5, d), walkMat, false, true); sw.position.set(x, -0.75, z); scene.add(sw); }
  const sideTex = tileTexture('#b9b3a8', '#a9a398', 1, 8); sideTex.repeat.set(1, 8);
  for (const x of [-L.sideX + 1.5, L.sideX - 1.5]) { const sw = solid(new THREE.BoxGeometry(1.8, 0.5, 15), lam(0xffffff, { map: sideTex }), false, true); sw.position.set(x, -0.75, 1.5); scene.add(sw); }
  const road = solid(new THREE.BoxGeometry(120, 0.44, L.roadZ1 - L.roadZ0), lam(0x2e3034), false, true); road.position.set(0, -0.78, (L.roadZ0 + L.roadZ1) / 2); scene.add(road);
  const paint = lam(0xe8e4d8, { emissive: 0x222222 }); const midZ = (L.roadZ0 + L.roadZ1) / 2;
  for (let x = -58; x < 58; x += 3) { if (Math.abs(x) < 3.2) continue; const dash = solid(new THREE.BoxGeometry(1.6, 0.02, 0.14), paint, false, false); dash.position.set(x, -0.55, midZ); scene.add(dash); }
  for (let x = -2.4; x <= 2.4; x += 0.8) { const stripe = solid(new THREE.BoxGeometry(0.45, 0.02, L.roadZ1 - L.roadZ0 - 0.4), paint, false, false); stripe.position.set(x, -0.55, midZ); scene.add(stripe); }
  for (const x of [-3.3, 3.3]) { const stop = solid(new THREE.BoxGeometry(0.2, 0.02, 3.4), paint, false, false); stop.position.set(x, -0.55, x < 0 ? L.laneB : L.laneA); scene.add(stop); }
  const kerbMat = lam(0x9a948a);
  for (const z of [L.roadZ1 - 0.08, L.roadZ0 + 0.08]) { const k = solid(new THREE.BoxGeometry(120, 0.2, 0.16), kerbMat, false, true); k.position.set(0, -0.6, z); scene.add(k); }
  return { base, plaza, road };
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------
export function facadeTexture(seed, cols, rows, wall, frame, { storefront = false } = {}) {
  const r = mulberry32(seed); const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = wall; g.fillRect(0, 0, 256, 512);
  const lit = document.createElement('canvas'); lit.width = 256; lit.height = 512; const gl = lit.getContext('2d'); gl.fillStyle = '#000'; gl.fillRect(0, 0, 256, 512);
  const top = storefront ? 512 - 512 / rows : 512;        // ground floor band drawn separately
  const cw = 256 / cols, rh = top / (storefront ? rows - 1 : rows);
  for (let i = 0; i < cols; i++) for (let j = 0; j < (storefront ? rows - 1 : rows); j++) {
    const x = i * cw + cw * 0.22, y = j * rh + rh * 0.22, w = cw * 0.56, h = rh * 0.5;
    g.fillStyle = frame; g.fillRect(x - 3, y - 3, w + 6, h + 6);
    const shade = 0.25 + r() * 0.35; g.fillStyle = `rgb(${Math.round(110 * shade + 40)},${Math.round(130 * shade + 50)},${Math.round(160 * shade + 60)})`; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, y, w, h * 0.35);
    if (r() < 0.55) { const warm = r() < 0.75; gl.fillStyle = warm ? `rgba(255,${200 + r() * 40 | 0},${130 + r() * 60 | 0},${0.6 + r() * 0.4})` : `rgba(170,220,255,${0.5 + r() * 0.5})`; gl.fillRect(x, y, w, h); }
  }
  if (storefront) { // dark glass shop front with a light cornice line
    g.fillStyle = '#2a2d36'; g.fillRect(0, top, 256, 512 - top); g.fillStyle = '#4a5466'; g.fillRect(10, top + 14, 236, 512 - top - 28);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(10, top + 14, 236, 30); g.fillStyle = frame; g.fillRect(0, top - 6, 256, 8);
    gl.fillStyle = 'rgba(255,230,180,0.75)'; gl.fillRect(10, top + 14, 236, 512 - top - 28);
  }
  const mk = cv => { const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return tex; };
  return { map: mk(c), emissiveMap: mk(lit) };
}
const WALLS = ['#b9a99a', '#8e8a86', '#a86f5a', '#cfc4b4', '#7b8794', '#c2b280', '#9a8f9e', '#6f7a86', '#d8c8a8', '#8a6a5a'];

/**
 * Orderly rows: a shop row across the street (storefront ground floors, 1 m gaps), side rows that
 * flank the plaza, and two taller background rows.  Heights vary gently between neighbours.
 */
export function buildBuildings(world, { nearHeights = [5, 9], sideHeights = [5, 8.5], midHeights = [9, 16], farHeights = [14, 26] } = {}) {
  const { scene, rng, R } = world; const pick = arr => arr[Math.floor(rng() * arr.length)];
  const buildings = [];
  function add(x, z, w, d, h, opts = {}) {
    const g = new THREE.Group(); g.position.set(x, -0.5, z);
    const cols = Math.max(2, Math.round(w / 1.7)), rows = Math.max(3, Math.round(h / 1.6));
    const tex = facadeTexture(Math.floor(rng() * 1e6), cols, rows, pick(WALLS), '#3a3a40', { storefront: !!opts.storefront });
    const mat = new THREE.MeshLambertMaterial({ map: tex.map, emissiveMap: tex.emissiveMap, emissive: 0xffd9a0, emissiveIntensity: 0 });
    const body = solid(new THREE.BoxGeometry(w, h, d), mat); body.position.y = h / 2; g.add(body);
    const roof = solid(new THREE.BoxGeometry(w + 0.3, 0.35, d + 0.3), lam(0x4a4a50)); roof.position.y = h + 0.17; g.add(roof);
    const clutter = [];
    for (let k = 0; k < 2 + Math.floor(rng() * 3); k++) { const box = solid(new THREE.BoxGeometry(R(0.6, 1.4), R(0.4, 1.0), R(0.6, 1.2)), lam(0x5a5a62)); box.position.set(R(-w / 2 + 1, w / 2 - 1), h + 0.35 + box.geometry.parameters.height / 2, R(-d / 2 + 1, d / 2 - 1)); g.add(box); clutter.push(box); }
    scene.add(g); const b = { g, body, roof, mat, x, z, w, d, h, rank: rng(), clutter, ...opts }; buildings.push(b); return b;
  }
  // shop row across the street: contiguous with 1 m gaps, storefront ground floors
  let hPrev = R(...nearHeights);
  for (let x = -48; x < 48;) { const w = R(6, 9), d = R(8, 11); const h = clamp(hPrev + R(-1.6, 1.6), nearHeights[0], nearHeights[1]); hPrev = h; add(x + w / 2, L.shopFront - d / 2, w, d, h, { storefront: true, row: 'shop' }); x += w + 1.0; }
  for (const side of [-1, 1]) { let hp = R(...sideHeights); for (let z = -18; z < 15;) { const w = R(6, 8), d = R(5, 7); const h = clamp(hp + R(-1.2, 1.2), sideHeights[0], sideHeights[1]); hp = h; add(side * (L.sideX + w / 2), z + d / 2, w, d, h, { side, row: 'side' }); z += d + 1.0; } }
  for (let x = -64; x < 64;) { const w = R(7, 12), d = R(8, 12), h = R(...midHeights); add(x + w / 2, -36 - d / 2 - R(0, 3), w, d, h, { row: 'mid' }); x += w + R(1.5, 3); }
  for (let x = -84; x < 84;) { const w = R(9, 14), d = R(9, 14), h = R(...farHeights); add(x + w / 2, -58 - d / 2 - R(0, 8), w, d, h, { row: 'far' }); x += w + R(2, 5); }
  return buildings;
}

/** A proper shop front on a shop-row building: awning across the ground floor and a sign board above it. */
export function addStorefront(world, b, { name = 'MARKET', color = '#ff3b2f', awning = 0xb83a30, textColor = '#ffffff' } = {}) {
  const { scene } = world; const zf = b.z + b.d / 2;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 200; const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 1024, 200); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 170, 1024, 30);
  g.fillStyle = textColor; g.font = '700 118px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, 512, 92);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const signW = b.w - 0.8, signH = signW * 200 / 1024;
  const sign = solid(new THREE.BoxGeometry(signW, signH, 0.22), new THREE.MeshLambertMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.25 }));
  sign.position.set(b.x, 3.05 + signH / 2 - 0.5, zf + 0.12); scene.add(sign);
  const aw = solid(new THREE.BoxGeometry(b.w - 0.6, 0.1, 1.4), lam(awning)); aw.position.set(b.x, 2.55 - 0.5, zf + 0.7); scene.add(aw);
  for (let k = 0; k < 3; k++) { const pole = solid(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6), lam(0x3a3a40)); pole.position.set(b.x - (b.w - 0.8) / 2 + k * (b.w - 0.8) / 2, 0.75, zf + 1.3); scene.add(pole); }
  return { sign, awning: aw, material: sign.material };
}

// ---------------------------------------------------------------------------
// Street furniture: lamps on the kerbs every 8 m, trees between them, traffic lights at the crosswalk, benches
// ---------------------------------------------------------------------------
export function buildStreetFurniture(world, { lampSpacing = 8, treeSpacing = 8, plazaTrees = true, benches = true } = {}) {
  const { scene, R, rng } = world; const pick = arr => arr[Math.floor(rng() * arr.length)];
  const lampHeads = [], poleMat = lam(0x3a3f48);
  function lamp(x, z, dirZ) {
    const pole = solid(new THREE.CylinderGeometry(0.07, 0.11, 5.4, 8), poleMat); pole.position.set(x, 2.2, z); scene.add(pole);
    const arm = solid(new THREE.BoxGeometry(0.1, 0.1, 1.4), poleMat); arm.position.set(x, 4.85, z + dirZ * 0.7); scene.add(arm);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.6), new THREE.MeshBasicMaterial({ color: 0x6a6f78, toneMapped: false })); head.position.set(x, 4.82, z + dirZ * 1.35); scene.add(head);
    const cap = solid(new THREE.BoxGeometry(0.6, 0.1, 0.7), poleMat); cap.position.set(x, 4.92, z + dirZ * 1.35); scene.add(cap); lampHeads.push(head);
  }
  for (let x = -56 + lampSpacing / 2; x < 56; x += lampSpacing) { if (Math.abs(x) < 3.5) continue; lamp(x, L.roadZ1 + 0.55, -1); lamp(x + lampSpacing / 2 < 56 ? x + lampSpacing / 2 : x, L.roadZ0 - 0.55, 1); }
  for (const [x, z] of [[-L.sideX + 0.6, 8.2], [L.sideX - 0.6, 8.2], [-L.sideX + 0.6, -4.5], [L.sideX - 0.6, -4.5]]) lamp(x, z, x < 0 ? 0 : 0);
  // traffic lights at the four crosswalk corners, facing oncoming traffic
  const trafficLights = [];
  for (const [x, z, face] of [[3.6, L.roadZ1 + 0.5, Math.PI / 2], [-3.6, L.roadZ0 - 0.5, -Math.PI / 2]]) {
    const pole = solid(new THREE.CylinderGeometry(0.08, 0.11, 5.6, 8), lam(0x2d3138)); pole.position.set(x, 2.3, z); scene.add(pole);
    const arm = solid(new THREE.BoxGeometry(0.14, 0.14, 3.4), lam(0x2d3138)); arm.position.set(x, 5.05, z + (z > -10 ? -1.7 : 1.7)); scene.add(arm);
    const box = solid(new THREE.BoxGeometry(0.34, 0.95, 0.3), lam(0x1e2126)); box.position.set(x, 4.55, z + (z > -10 ? -3.2 : 3.2)); box.rotation.y = face; scene.add(box);
    const lights = [0xff3b2f, 0xffc93c, 0x3bd35a].map((c, i) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 10), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); l.rotation.x = Math.PI / 2; l.position.set(0, 0.3 - i * 0.3, 0.16); box.add(l); return l; });
    trafficLights.push({ lights, phase: z > -10 ? 0 : 0.5 });
  }
  // trees in planters along both kerbs, halfway between lamps, and at the plaza corners
  const treeMats = [lam(0x4f8f4a), lam(0x5aa65a), lam(0x3f7f3f), lam(0x6a9a3a)]; const trees = [];
  function tree(x, z, s = 1) {
    const planter = solid(new THREE.BoxGeometry(1.1, 0.45, 1.1), lam(0x8d7b6a)); planter.position.set(x, -0.28, z); scene.add(planter);
    const trunk = solid(new THREE.CylinderGeometry(0.09, 0.13, 1.5 * s, 7), lam(0x6b4a2e)); trunk.position.set(x, 0.7 * s, z); scene.add(trunk);
    const crown = solid(roundedBox(1.6 * s, 1.7 * s, 1.6 * s, 0.75, 3), pick(treeMats)); crown.position.set(x, 1.95 * s, z); scene.add(crown); trees.push(crown);
  }
  for (let x = -56 + lampSpacing / 2 + treeSpacing / 2; x < 56; x += treeSpacing) { if (Math.abs(x) < 4.5) continue; tree(x, L.roadZ1 + 0.55, R(0.9, 1.15)); tree(x, L.roadZ0 - 0.55, R(0.9, 1.15)); }
  if (plazaTrees) for (const [x, z] of [[-7.5, 7.5], [7.5, 7.5], [-7.5, -4.2], [7.5, -4.2]]) tree(x, z, 1.2);
  const benchList = [];
  if (benches) for (const [x, z, ry] of [[-5.5, 7.6, 0], [5.5, 7.6, 0], [-9.3, 1.5, Math.PI / 2], [9.3, 1.5, -Math.PI / 2]]) {
    const g = new THREE.Group(); g.position.set(x, -0.5, z); g.rotation.y = ry;
    const seat = solid(new THREE.BoxGeometry(1.9, 0.1, 0.5), lam(0x8a6a4a)); seat.position.y = 0.48; g.add(seat);
    const back = solid(new THREE.BoxGeometry(1.9, 0.45, 0.08), lam(0x8a6a4a)); back.position.set(0, 0.78, -0.22); g.add(back);
    for (const sx of [-0.8, 0.8]) { const leg = solid(new THREE.BoxGeometry(0.1, 0.48, 0.5), lam(0x2d3138)); leg.position.set(sx, 0.24, 0); g.add(leg); }
    scene.add(g); benchList.push(g);
  }
  return { lampHeads, trafficLights, trees, benches: benchList };
}
export function updateTrafficLights(trafficLights, t, powered = 1) {
  for (const tl of trafficLights) { const ph = frac(t / 8 + tl.phase); tl.lights.forEach((l, i) => { const on = i === (ph < 0.5 ? 2 : ph < 0.6 ? 1 : 0); l.material.color.set([0xff3b2f, 0xffc93c, 0x3bd35a][i]).multiplyScalar((on ? 1 : 0.18) * powered); }); }
}

// ---------------------------------------------------------------------------
// People: rounded blocky figures with faces, hair styles, clothes, shoes and props
// ---------------------------------------------------------------------------
export const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xa5673f], SHIRTS = [0xd9534f, 0x3b7dd8, 0xf2b134, 0x5aa65a, 0x8e5ad8, 0xf4f1ea, 0x2b2f3a, 0xff8a3d, 0x2fb5a3, 0xd84f8e, 0xe8e2d6, 0x6b8e9f], PANTS = [0x2b3a55, 0x3a3a3a, 0x6b4a2e, 0x8a8f99, 0x1f1f24, 0x4a5a7a], HAIRS = [0x2a1a0e, 0x4a3020, 0x8a6a3a, 0x111111, 0xc9a26a, 0x6a3a2a], JACKETS = [0x2b2f3a, 0x5d6b4a, 0x7a3a2e, 0x3a4a6a];
const GEO = { torso: roundedBox(0.62, 0.8, 0.34, 0.25), head: roundedBox(0.48, 0.5, 0.48, 0.45), arm: roundedBox(0.2, 0.74, 0.2, 0.3), leg: roundedBox(0.26, 0.78, 0.26, 0.25), shoe: roundedBox(0.3, 0.16, 0.42, 0.4), hairCap: roundedBox(0.52, 0.22, 0.52, 0.5), hairLong: roundedBox(0.54, 0.6, 0.5, 0.35), eye: new THREE.BoxGeometry(0.07, 0.07, 0.03), mouth: new THREE.BoxGeometry(0.12, 0.025, 0.03), brow: new THREE.BoxGeometry(0.1, 0.025, 0.03), cap: roundedBox(0.54, 0.2, 0.54, 0.5), peak: new THREE.BoxGeometry(0.4, 0.05, 0.3), bag: roundedBox(0.4, 0.5, 0.22, 0.3), phone: new THREE.BoxGeometry(0.12, 0.22, 0.02) };
/**
 * Build a person (~2.1 tall, feet at y 0).  userData.limbs = { la, ra, ll, rl, head } pivots,
 * userData.mats = { skin, shirt, pants, hair }, userData.torso.
 * opts: skin, shirt, pants, hair, jacket (bool/colour), hairStyle 'short'|'long'|'cap'|'bald', bag, phone.
 */
export function person(world, opts = {}) {
  const { rng } = world; const pick = arr => arr[Math.floor(rng() * arr.length)];
  const g = new THREE.Group();
  const mats = { skin: lam(opts.skin ?? pick(SKINS)), shirt: lam(opts.shirt ?? pick(SHIRTS)), pants: lam(opts.pants ?? pick(PANTS)), hair: lam(opts.hair ?? pick(HAIRS)) };
  const jacket = opts.jacket === undefined ? rng() < 0.35 : opts.jacket; const jacketMat = jacket ? lam(typeof jacket === 'number' ? jacket : pick(JACKETS)) : null;
  const torso = solid(GEO.torso, jacketMat || mats.shirt); torso.position.y = 1.18; g.add(torso);
  if (jacketMat) { const front = solid(new THREE.BoxGeometry(0.22, 0.7, 0.05), mats.shirt); front.position.set(0, 1.18, 0.17); g.add(front); }
  const neck = solid(new THREE.CylinderGeometry(0.1, 0.12, 0.14, 8), mats.skin); neck.position.y = 1.62; g.add(neck);
  const headPiv = new THREE.Group(); headPiv.position.y = 1.64; g.add(headPiv);
  const head = solid(GEO.head, mats.skin); head.position.y = 0.26; headPiv.add(head);
  const dark = lam(0x2a1a14);
  for (const sx of [-1, 1]) { const eye = new THREE.Mesh(GEO.eye, dark); eye.position.set(sx * 0.1, 0.3, 0.235); headPiv.add(eye); const brow = new THREE.Mesh(GEO.brow, mats.hair); brow.position.set(sx * 0.1, 0.38, 0.235); headPiv.add(brow); }
  const mouth = new THREE.Mesh(GEO.mouth, lam(0x7a3a3a)); mouth.position.set(0, 0.15, 0.235); headPiv.add(mouth);
  const style = opts.hairStyle ?? pick(['short', 'short', 'long', 'cap', 'short', 'bald']);
  if (style === 'short') { const h = solid(GEO.hairCap, mats.hair); h.position.set(0, 0.46, -0.02); headPiv.add(h); }
  else if (style === 'long') { const h = solid(GEO.hairLong, mats.hair); h.position.set(0, 0.22, -0.08); headPiv.add(h); const top = solid(GEO.hairCap, mats.hair); top.position.set(0, 0.46, -0.02); headPiv.add(top); }
  else if (style === 'cap') { const capMat = lam(pick(SHIRTS)); const c = solid(GEO.cap, capMat); c.position.set(0, 0.47, 0); headPiv.add(c); const p = solid(GEO.peak, capMat); p.position.set(0, 0.42, 0.33); headPiv.add(p); }
  const limbs = { head: headPiv };
  for (const [name, sx] of [['la', -1], ['ra', 1]]) {
    const piv = new THREE.Group(); piv.position.set(sx * 0.43, 1.52, 0);
    const sleeve = solid(roundedBox(0.21, 0.36, 0.21, 0.3), jacketMat || mats.shirt); sleeve.position.y = -0.18; piv.add(sleeve);
    const fore = solid(roundedBox(0.19, 0.4, 0.19, 0.3), mats.skin); fore.position.y = -0.55; piv.add(fore); g.add(piv); limbs[name] = piv;
  }
  for (const [name, sx] of [['ll', -1], ['rl', 1]]) {
    const piv = new THREE.Group(); piv.position.set(sx * 0.16, 0.78, 0);
    const leg = solid(GEO.leg, mats.pants); leg.position.y = -0.39; piv.add(leg);
    const shoe = solid(GEO.shoe, lam(pick([0x1a1a1a, 0x3a2a1a, 0xf0f0f0, 0x4a4a55]))); shoe.position.set(0, -0.72, 0.06); piv.add(shoe); g.add(piv); limbs[name] = piv;
  }
  if (opts.bag ?? rng() < 0.3) { const bag = solid(GEO.bag, lam(pick([0x8a3a2e, 0x2b3a55, 0x4a4a4a, 0x6b8e9f]))); bag.position.set(0, 1.2, -0.28); g.add(bag); }
  if (opts.phone) { const ph = new THREE.Mesh(GEO.phone, lam(0x1a1d26)); ph.position.set(0, -0.76, 0.1); ph.rotation.x = -0.4; limbs.ra.add(ph); g.userData.phone = ph; }
  g.userData.limbs = limbs; g.userData.mats = mats; g.userData.torso = torso; g.userData.jacket = jacketMat; return g;
}
/** Gait: phase in radians.  mode 'walk' | 'run' | 'shamble' | 'idle'.  amp scales the swing. */
export function animateGait(g, phase, mode = 'walk', amp = 1) {
  const Lb = g.userData.limbs;
  if (mode === 'shamble') {
    const sw = Math.sin(phase) * 0.35 * amp;
    Lb.ll.rotation.x = sw; Lb.rl.rotation.x = -sw; Lb.la.rotation.x = -1.45 + Math.sin(phase * 0.5) * 0.1; Lb.ra.rotation.x = -1.35 + Math.cos(phase * 0.5) * 0.1;
    Lb.la.rotation.z = 0.08; Lb.ra.rotation.z = -0.08; Lb.head.rotation.z = 0.28 + Math.sin(phase * 0.5) * 0.08; Lb.head.rotation.x = 0.15;
    g.userData.torso.rotation.x = 0.18; g.position.y += Math.abs(Math.sin(phase * 0.5)) * 0.03;
  } else if (mode === 'idle') {
    const idle = Math.sin(phase) * 0.04 * amp;
    Lb.ll.rotation.x = 0; Lb.rl.rotation.x = 0; Lb.la.rotation.x = idle; Lb.ra.rotation.x = -idle; Lb.la.rotation.z = 0.04; Lb.ra.rotation.z = -0.04; Lb.head.rotation.z = 0; Lb.head.rotation.x = 0; g.userData.torso.rotation.x = 0;
  } else {
    const run = mode === 'run'; const k = run ? 1.0 : 0.55; const sw = Math.sin(phase) * k * amp;
    Lb.ll.rotation.x = sw; Lb.rl.rotation.x = -sw; Lb.la.rotation.x = -sw * (run ? 1.1 : 0.8) + (run ? -0.3 : 0); Lb.ra.rotation.x = sw * (run ? 1.1 : 0.8) + (run ? -0.3 : 0);
    Lb.la.rotation.z = 0.04; Lb.ra.rotation.z = -0.04; Lb.head.rotation.z = 0; Lb.head.rotation.x = run ? 0.12 : 0;
    g.userData.torso.rotation.x = run ? 0.22 : 0; g.position.y += Math.abs(Math.cos(phase)) * (run ? 0.08 : 0.035);
  }
}

/**
 * Pedestrian lanes with fixed spacing.  Each lane is a straight path; walkers on a lane share one
 * speed and are spaced at least `gap` apart, so nobody overtakes or overlaps.  Opposite directions
 * use separate lanes (offset by `laneOffset`) so they pass side by side.
 * lanes: [{ axis:'x'|'z', at: <fixed coordinate>, from, to, dir, count, speed, offset }]
 */
export function makePedestrians(world, lanes, { gap = 2.4, laneOffset = 0.5 } = {}) {
  const { scene, R } = world; const peds = [];
  for (const lane of lanes) {
    const length = lane.to - lane.from; const n = Math.min(lane.count, Math.floor(length / gap));
    const base = (lane.axis === 'x' ? lane.at : lane.at) + (lane.dir > 0 ? -laneOffset : laneOffset) + (lane.offset || 0);
    const starts = []; let s = R(0, gap); for (let i = 0; i < n; i++) { starts.push(s); s += gap + R(0, (length / n) - gap); }
    for (let i = 0; i < n; i++) {
      const g = person(world, lane.person || {}); scene.add(g);
      peds.push({ g, lane, base, start: starts[i], speed: lane.speed, length, ph: R(0, 6.28), rank: R(0.03, 1) });
    }
  }
  return peds;
}
/** Position a pedestrian for time t given a distance travelled.  Returns the world position. */
export function placePedestrian(p, dist) {
  const { lane, base } = p; const along = ((p.start + dist) % p.length + p.length) % p.length; const coord = lane.dir > 0 ? lane.from + along : lane.to - along;
  if (lane.axis === 'x') { p.g.position.set(coord, -0.5, base); p.g.rotation.y = lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
  else { p.g.position.set(base, -0.5, coord); p.g.rotation.y = lane.dir > 0 ? 0 : Math.PI; }
}

// ---------------------------------------------------------------------------
// Cars (road, along x), with wheels, lights, mirrors
// ---------------------------------------------------------------------------
export function buildCars(world, count = 12) {
  const { scene, R } = world; const cars = [];
  const cols = [0xd9d9d9, 0xc0392b, 0x2c3e50, 0xf2b134, 0x3b7dd8, 0xf4f1ea, 0x7f8c8d, 0x27ae60, 0x1a1a1a, 0x8e5ad8];
  const spacing = 100 / Math.ceil(count / 2);
  for (let i = 0; i < count; i++) {
    const g = new THREE.Group(); const van = i % 5 === 0; const Lc = van ? 3.4 : 2.5, H = van ? 1.35 : 0.72;
    const body = solid(roundedBox(Lc, H, 1.35, 0.18), lam(cols[i % cols.length])); body.position.y = 0.55 + H / 2 - 0.3; g.add(body);
    if (!van) { const cab = solid(roundedBox(Lc * 0.52, 0.52, 1.2, 0.3), lam(0x1f2a3a)); cab.position.set(-0.12, 1.05, 0); g.add(cab); }
    else { const glass = solid(new THREE.BoxGeometry(0.1, 0.5, 1.1), lam(0x1f2a3a)); glass.position.set(Lc / 2 - 0.02, 1.0, 0); g.add(glass); }
    const wheels = [];
    for (const [sx, sz] of [[-0.7, -0.62], [0.7, -0.62], [-0.7, 0.62], [0.7, 0.62]]) { const w = solid(new THREE.CylinderGeometry(0.27, 0.27, 0.22, 12), lam(0x151515)); w.rotation.x = Math.PI / 2; w.position.set(sx * Lc / 2.3, 0.27, sz); g.add(w); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.24, 8), lam(0x9a9a9a)); hub.rotation.x = Math.PI / 2; hub.position.copy(w.position); g.add(hub); wheels.push(w); }
    const lights = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 1.1), new THREE.MeshBasicMaterial({ color: 0xfff2c0, toneMapped: false })); lights.position.set(Lc / 2, 0.62, 0); g.add(lights);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 1.1), new THREE.MeshBasicMaterial({ color: 0xff3b2f, toneMapped: false })); tail.position.set(-Lc / 2, 0.62, 0); g.add(tail);
    const dir = i % 2 ? 1 : -1; const lane = dir > 0 ? L.laneA : L.laneB;
    g.userData = { dir, L: Lc, speed: dir > 0 ? 6.0 : 5.4, x0: Math.floor(i / 2) * spacing + R(-1.5, 1.5), laneZ: lane, wheels, lights, tail, body, bob: R(0, 6.28), rank: R(0, 1) };
    g.position.set(0, -0.5, lane); g.rotation.y = dir > 0 ? 0 : Math.PI;
    scene.add(g); cars.push(g);
  }
  return cars;
}
