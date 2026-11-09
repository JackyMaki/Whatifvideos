// Shared world for the what-if series: deterministic helpers, a low-poly valley with sky,
// sun/moon, stars, clouds, mountains and trees, a full day cycle driven by time t (seconds),
// plus the caption / clock / title overlay logic.  Every video builds its own props on top.
import * as THREE from './lib/three.module.min.js';
export { THREE };

// ---------------------------------------------------------------------------
// Deterministic helpers (frames may render in any order on any worker)
// ---------------------------------------------------------------------------
export function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
export const lerp = (a, b, x) => a + (b - a) * x;
export const frac = x => x - Math.floor(x);
export function kf(t, keys, ease = smooth) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [t0, v0] = keys[i], [t1, v1] = keys[i + 1]; if (t <= t1) return lerp(v0, v1, ease((t - t0) / (t1 - t0))); }
  return keys[keys.length - 1][1];
}
const _ca = new THREE.Color(), _cb = new THREE.Color();
export function kfColor(t, keys) {
  if (t <= keys[0][0]) return new THREE.Color(keys[0][1]);
  for (let i = 0; i < keys.length - 1; i++) { const [t0, c0] = keys[i], [t1, c1] = keys[i + 1]; if (t <= t1) { _ca.set(c0); _cb.set(c1); return _ca.clone().lerp(_cb, smooth((t - t0) / (t1 - t0))); } }
  return new THREE.Color(keys[keys.length - 1][1]);
}
export const win = (t, a, b, fi = 0.4, fo = 0.4) => t < a || t > b ? 0 : Math.min(smooth((t - a) / fi), smooth((b - t) / fo));

// ---------------------------------------------------------------------------
// Textures
// ---------------------------------------------------------------------------
export function radialTexture(stops = [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128); stops.forEach(([o, col]) => grad.addColorStop(o, col)); g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
export function textSprite(scene, text, { color = '#ffffff', size = 150, weight = 800, font = 'Inter, "Inter Display", IPAPGothic, sans-serif', stroke = 'rgba(0,0,0,0.35)' } = {}) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 384; const g = c.getContext('2d');
  g.font = `${weight} ${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 18; g.strokeStyle = stroke; g.strokeText(text, 512, 200); g.fillStyle = color; g.fillText(text, 512, 200);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
  s.scale.set(4, 1.5, 1); scene.add(s); return s;
}
export function photoTexture(seed) {
  const r = mulberry32(seed); const c = document.createElement('canvas'); c.width = 384; c.height = 288; const g = c.getContext('2d');
  const skies = ['#7cc4ff', '#ffb98a', '#3a4a8a', '#bfe3ff']; const grounds = ['#5aa65a', '#b9c47a', '#2c7a5a', '#8a5a3a'];
  g.fillStyle = '#fff'; g.fillRect(0, 0, 384, 288); g.fillStyle = skies[Math.floor(r() * 4)]; g.fillRect(20, 20, 344, 200);
  g.fillStyle = grounds[Math.floor(r() * 4)]; g.beginPath(); g.moveTo(20, 220); for (let x = 20; x <= 364; x += 43) g.lineTo(x, 150 + r() * 60); g.lineTo(364, 220); g.closePath(); g.fill();
  g.fillStyle = '#ffd166'; g.beginPath(); g.arc(80 + r() * 220, 70 + r() * 40, 18 + r() * 14, 0, 6.28); g.fill();
  for (let k = 0; k < 2 + Math.floor(r() * 3); k++) { g.fillStyle = '#2c7a5a'; const x = 50 + r() * 280, y = 190 + r() * 20; g.beginPath(); g.moveTo(x, y - 50 - r() * 30); g.lineTo(x - 22, y); g.lineTo(x + 22, y); g.closePath(); g.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

// ---------------------------------------------------------------------------
// Default day cycle (video time 0..60 s = sunrise .. 3 AM)
// ---------------------------------------------------------------------------
export const DAY = {
  SKY: {
    top: [[0, '#2a3f6e'], [7, '#3b7dd8'], [24, '#2f73d6'], [34, '#4a4f9a'], [39, '#4a3a7a'], [44, '#1b1f4a'], [49, '#060a1f'], [60, '#050816']],
    mid: [[0, '#8a6aa6'], [7, '#78b4ee'], [24, '#78b8f0'], [34, '#b07aa0'], [39, '#ff8a5a'], [44, '#5a3d6e'], [49, '#141c3a'], [60, '#101a36']],
    bot: [[0, '#f29e6b'], [7, '#cfe9ff'], [24, '#d6eeff'], [34, '#ffc08a'], [39, '#ff6a3d'], [44, '#6a3d6e'], [49, '#1a2140'], [60, '#182040']],
  },
  sunElev: t => kf(t, [[0, 0.8], [6, 7], [24, 21], [34, 9], [39.5, -0.6], [60, -20]]) * Math.PI / 180,
  sunAz: t => kf(t, [[0, -15], [24, 0], [39.5, 14], [60, 18]]) * Math.PI / 180,
  moonElev: t => kf(t, [[36, -4], [44, 10], [52, 19], [60, 21]]) * Math.PI / 180,
  moonAz: t => kf(t, [[36, -13], [60, 3]]) * Math.PI / 180,
  night: t => kf(t, [[36, 0], [41, 0.55], [46, 1]]),
  sunColor: [[0, '#ff9a5a'], [8, '#ffd96b'], [24, '#ffe28a'], [34, '#ffb050'], [39.5, '#ff6a3a']],
  haloColor: [[0, '#ff7a3d'], [8, '#ffd27a'], [34, '#ff9a4a'], [39.5, '#ff4a2a']],
  haloOpacity: [[0, 0.55], [8, 0.3], [34, 0.38], [40, 0.6]],
  lightColor: [[0, '#ffb07a'], [7, '#fff2dc'], [24, '#ffffff'], [34, '#ffb080'], [39, '#ff8a5a'], [44, '#8fa8e8'], [60, '#9fb4ff']],
  hemiSky: [[0, '#8a7ab8'], [7, '#bfd8ff'], [34, '#e0b0b0'], [44, '#2a3a7a'], [60, '#1e2a5a']],
  hemiGround: [[0, '#4a3a3a'], [7, '#3a5a2a'], [44, '#101a30'], [60, '#0c1426']],
  cloudColor: [[0, '#ffd2b8'], [7, '#ffffff'], [34, '#ffc89a'], [39, '#b86a7a'], [44, '#3a3a5a'], [60, '#1a2240']],
};
export function clockFor(t) {
  const h = t < 24 ? lerp(6, 12, t / 24) : t < 36 ? lerp(12, 18.5, (t - 24) / 12) : t < 48 ? lerp(18.5, 24, (t - 36) / 12) : lerp(0, 3, (t - 48) / 12);
  const hh = Math.floor(h) % 24, mm = Math.floor((h - Math.floor(h)) * 60);
  const label = t < 6 ? 'SUNRISE' : t < 22 ? 'MORNING' : t < 31 ? 'NOON' : t < 40.5 ? 'SUNSET' : t < 46 ? 'DUSK' : t < 52.5 ? 'MIDNIGHT' : 'NIGHT';
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · ${label}`;
}

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------
export function createWorld({ seed = 1337, canvas, flatRadius = 2.5, treeKeepOut = (x, z) => Math.hypot(x, z) < 7 || (Math.abs(x) < 4 && z > -20), mountains = true, trees = 70, clouds = 9, horizonRise = 0.12, ground = 'valley', shadows = false, shadowExtent = 30, fog = 0 } = {}) {
  const rng = mulberry32(seed); const R = (a = 0, b = 1) => a + (b - a) * rng();
  const W = 1080, H = 1920;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  if (shadows) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
  const scene = new THREE.Scene();
  if (fog > 0) scene.fog = new THREE.FogExp2(0xc8d8e8, fog);
  const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 500);

  // sky quad
  const skyMat = new THREE.ShaderMaterial({
    depthWrite: false, depthTest: false,
    uniforms: { top: { value: new THREE.Color('#2a3f6e') }, mid: { value: new THREE.Color('#7a6aa6') }, bot: { value: new THREE.Color('#f29e6b') }, horizon: { value: 0.42 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform vec3 top, mid, bot; uniform float horizon;
      void main(){ float y = vUv.y; vec3 c = y > horizon ? mix(mid, top, smoothstep(horizon, 1.0, y)) : mix(bot, mid, smoothstep(horizon - 0.25, horizon, y)); gl_FragColor = vec4(c, 1.0); }`
  });
  const skyQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMat); skyQuad.frustumCulled = false; skyQuad.renderOrder = -10; scene.add(skyQuad);

  // stars
  const starCount = 1400, starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) { const az = R(-Math.PI, Math.PI), el = Math.asin(R(0.02, 1)), r = 300; starPos[i * 3] = r * Math.cos(el) * Math.sin(az); starPos[i * 3 + 1] = r * Math.sin(el) + 10; starPos[i * 3 + 2] = -r * Math.cos(el) * Math.cos(az); R(0, 6.28); /* keeps the series' random layout stable */ }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 3.8, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const stars = new THREE.Points(starGeo, starMat); scene.add(stars);

  // lights
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x3a5a2a, 0.8); scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.0); sunLight.position.set(-30, 20, -10); scene.add(sunLight);
  if (shadows) { sunLight.castShadow = true; sunLight.shadow.mapSize.set(2048, 2048); const sc = sunLight.shadow.camera; sc.left = -shadowExtent; sc.right = shadowExtent; sc.top = shadowExtent; sc.bottom = -shadowExtent; sc.near = 1; sc.far = 220; sunLight.shadow.bias = -0.0006; sunLight.shadow.normalBias = 0.02; sunLight.shadow.radius = 3; }

  // sun & moon
  const sun = new THREE.Mesh(new THREE.IcosahedronGeometry(7, 1), new THREE.MeshBasicMaterial({ color: 0xffe08a, toneMapped: false, fog: false }));
  const sunHalo = new THREE.Mesh(new THREE.IcosahedronGeometry(12, 1), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
  sun.add(sunHalo); scene.add(sun);
  const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(5, 1), new THREE.MeshLambertMaterial({ color: 0xdfe7ff, emissive: 0x8ea4d6, emissiveIntensity: 0.6, flatShading: true, fog: false }));
  const moonHalo = new THREE.Mesh(new THREE.IcosahedronGeometry(9, 1), new THREE.MeshBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  moon.add(moonHalo); scene.add(moon);

  // terrain
  function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v); }
  function terrainH(x, z) {
    let h = vnoise(x * 0.08, z * 0.08) * 2.4 + vnoise(x * 0.2 + 7, z * 0.2) * 0.9;
    const d = Math.hypot(x, z); h *= smooth((d - flatRadius) / 7);
    h += Math.max(0, d - 22) * horizonRise;
    return h - 0.6;
  }
  if (ground === 'valley') {
    const g = new THREE.PlaneGeometry(140, 140, 56, 56).toNonIndexed(); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position; const col = new Float32Array(p.count * 3); const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) p.setY(i, terrainH(p.getX(i), p.getZ(i)));
    for (let f = 0; f < p.count; f += 3) {
      const y = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3;
      c.set(y > 1.6 ? '#b9c47a' : '#5aa65a').offsetHSL(R(-0.02, 0.02), R(-0.08, 0.08), R(-0.06, 0.06));
      for (let k = 0; k < 3; k++) { col[(f + k) * 3] = c.r; col[(f + k) * 3 + 1] = c.g; col[(f + k) * 3 + 2] = c.b; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const terrain = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })); terrain.receiveShadow = shadows; scene.add(terrain);
  }
  // mountains
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x6f7aa0, flatShading: true });
  const snowMat = new THREE.MeshLambertMaterial({ color: 0xf1f5ff, flatShading: true });
  if (mountains && ground === 'valley') for (let i = 0; i < 26; i++) {
    const az = R(-Math.PI * 0.95, Math.PI * 0.95); if (Math.abs(az) > Math.PI * 0.72 && rng() < 0.5) continue;
    const dist = R(48, 70), h = R(10, 26), r = h * R(0.55, 0.9);
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, Math.floor(R(5, 8)), 1), rockMat);
    m.position.set(Math.sin(az) * dist, h / 2 - 1.5, -Math.cos(az) * dist); m.rotation.y = R(0, 6.28);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.34, h * 0.34, m.geometry.parameters.radialSegments, 1), snowMat); cap.position.y = h * 0.33 + 0.02; m.add(cap); scene.add(m);
  }
  // trees
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a4a2b, flatShading: true });
  const leafMats = ['#2f8f4e', '#3fa35b', '#6bb04a', '#2c7a5a', '#8bbf4a'].map(c => new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
  for (let i = 0; i < (ground === 'valley' ? trees : 0); i++) {
    const x = R(-45, 45), z = R(-45, 12); if (treeKeepOut(x, z)) continue;
    const s = R(0.8, 1.7); const g = new THREE.Group(); g.position.set(x, terrainH(x, z) - 0.1, z); g.scale.setScalar(s);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.2, 5), trunkMat); trunk.position.y = 0.6; g.add(trunk);
    const lm = leafMats[Math.floor(R(0, leafMats.length))]; let y = 1.1;
    for (let k = 0; k < 3; k++) { const rad = 1.1 - k * 0.25, hh = 1.3 - k * 0.15; const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, hh, 6), lm); cone.position.y = y + hh / 2; g.add(cone); y += hh * 0.62; }
    g.rotation.y = R(0, 6.28); scene.add(g);
  }
  // clouds
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, transparent: true, opacity: 0.95 });
  const cloudList = [];
  for (let i = 0; i < clouds; i++) {
    const g = new THREE.Group(); const n = Math.floor(R(3, 6));
    for (let k = 0; k < n; k++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(R(1.2, 2.4), 0), cloudMat); m.position.set(R(-3, 3), R(-0.4, 0.6), R(-1, 1)); m.scale.y = 0.55; g.add(m); }
    g.userData = { x: R(-50, 50), y: R(18, 34), z: R(-70, -35), speed: R(0.25, 0.6), s: R(1, 1.9) };
    g.scale.setScalar(g.userData.s); scene.add(g); cloudList.push(g);
  }

  const tmpV = new THREE.Vector3();
  /** Drive sky, sun, moon, lights and clouds for time t.  opts: { cloudDrop, cloudScale } */
  function updateEnvironment(t, D = DAY, opts = {}) {
    skyMat.uniforms.top.value.copy(kfColor(t, D.SKY.top)); skyMat.uniforms.mid.value.copy(kfColor(t, D.SKY.mid)); skyMat.uniforms.bot.value.copy(kfColor(t, D.SKY.bot));
    const nt = D.night(t);
    starMat.opacity = nt * (0.75 + 0.25 * Math.sin(t * 3.1)); stars.rotation.y = t * 0.004;
    const se = D.sunElev(t), sa = D.sunAz(t);
    sun.position.set(Math.sin(sa) * Math.cos(se) * 130, Math.sin(se) * 130 + 2, -Math.cos(sa) * Math.cos(se) * 130);
    sun.visible = se > -0.08; sun.rotation.y = t * 0.15;
    sun.material.color.copy(kfColor(t, D.sunColor)); sunHalo.material.color.copy(kfColor(t, D.haloColor)); sunHalo.material.opacity = kf(t, D.haloOpacity);
    const me = D.moonElev(t), ma = D.moonAz(t);
    moon.position.set(Math.sin(ma) * Math.cos(me) * 130, Math.sin(me) * 130 + 2, -Math.cos(ma) * Math.cos(me) * 130);
    moon.visible = t > 36; moon.rotation.y = t * 0.1; moonHalo.material.opacity = 0.16 * nt;
    const dayI = clamp(Math.sin(se) * 4, 0, 1);
    tmpV.copy(se > 0.02 ? sun.position : moon.position).normalize(); sunLight.position.set(tmpV.x * 50, Math.max(tmpV.y * 50, 10) + 12, 38);
    sunLight.color.copy(kfColor(t, D.lightColor)); sunLight.intensity = lerp(0.55, 2.4, dayI) * (1 - nt * 0.75);
    hemi.color.copy(kfColor(t, D.hemiSky)); hemi.groundColor.copy(kfColor(t, D.hemiGround)); hemi.intensity = lerp(1.0, 0.55, nt);
    renderer.toneMappingExposure = lerp(1.08, 0.9, nt);
    if (scene.fog) scene.fog.color.copy(skyMat.uniforms.bot.value).lerp(skyMat.uniforms.mid.value, 0.35);
    cloudMat.color.copy(kfColor(t, D.cloudColor));
    const drop = opts.cloudDrop || 0, cs = opts.cloudScale || 1;
    cloudList.forEach(c => { const u = c.userData; c.position.set(((u.x + t * u.speed + 60) % 120) - 60, u.y - drop, u.z); c.scale.setScalar(u.s * cs); });
    return { nt, se, dayI };
  }

  return { rng, R, renderer, scene, camera, skyMat, stars, starMat, hemi, sunLight, sun, sunHalo, moon, moonHalo, cloudMat, clouds: cloudList, terrainH, rockMat, snowMat, trunkMat, leafMats, updateEnvironment, shadows };
}

// ---------------------------------------------------------------------------
// Overlay: title card, captions, clock, footer.  Per-video code handles its own HUD.
// ---------------------------------------------------------------------------
/**
 * Overlay in the series' house style: the question stays on screen in a classic serif with one
 * phrase in red (#title, big for the opening seconds, then smaller and higher), narration lines
 * appear as bare serif captions lower in the frame (#cap), and a minimal stat block sits top-left
 * (#hud with #hudLabel / #hudValue / #hudSub; the sub line shows the clock unless the video sets it).
 */
export function createOverlay({ highlight = /$^/, titleEnd = 5.6, skipCaptionIds = [1], lastCaptionHold = 60.5, hudFrom = null } = {}) {
  let CAPTIONS = [];
  const el = id => document.getElementById(id);
  const ui = { title: el('title'), cap: el('cap'), capInner: el('capInner'), footer: el('footer'), hud: el('hud'), hudSub: el('hudSub') };
  window.setCaptions = lines => { CAPTIONS = lines; };
  function update(t) {
    if (ui.title) {
      const inU = smooth((t - 0.25) / 1.1); const shrink = smooth((t - titleEnd) / 1.4);
      ui.title.style.opacity = inU * (t > 59.4 ? smooth((60.5 - t) / 1.1) : 1);
      ui.title.style.transform = `translateY(${(1 - inU) * 30 - shrink * 150}px) scale(${lerp(lerp(0.97, 1, inU), 0.72, shrink)})`;
    }
    const hudOn = win(t, hudFrom == null ? titleEnd : hudFrom, 60.5, 0.8, 0.1);
    if (ui.hud) ui.hud.style.opacity = hudOn;
    if (ui.hudSub && !ui.hudSub.dataset.custom) ui.hudSub.textContent = clockFor(t);
    let capOp = 0, capText = '';
    const last = CAPTIONS.length ? CAPTIONS[CAPTIONS.length - 1].id : -1;
    for (const c of CAPTIONS) { if (skipCaptionIds.includes(c.id)) continue; const end = c.id === last ? lastCaptionHold : c.end + 0.55; const o = win(t, c.start - 0.25, end, 0.35, 0.45); if (o > capOp) { capOp = o; capText = c.text; } }
    ui.cap.style.opacity = capOp; if (capText !== ui.cap.dataset.text) { ui.cap.dataset.text = capText; ui.capInner.innerHTML = capText.replace(highlight, '<em>$1</em>'); }
    ui.cap.style.transform = `translateY(${(1 - capOp) * 14}px)`;
    if (ui.footer) ui.footer.style.opacity = win(t, 57.2, 60.5, 0.8, 0.1) * 0.7;
    return hudOn;
  }
  return { ui, update };
}

export const BASE_CSS = `
  @font-face { font-family: "EB Garamond"; font-style: normal; font-weight: 400 800; src: url("../../render/fonts/EBGaramond-latin.woff2") format("woff2"); }
  @font-face { font-family: "EB Garamond"; font-style: italic; font-weight: 400 800; src: url("../../render/fonts/EBGaramond-italic-latin.woff2") format("woff2"); }
  html, body { margin: 0; padding: 0; width: 1080px; height: 1920px; overflow: hidden; background: #000; }
  #c { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; display: block; }
  #ui { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; pointer-events: none; color: #fff; font-family: "EB Garamond", "Liberation Serif", serif; }
  .abs { position: absolute; }
  .label { font-family: "Inter", sans-serif; font-weight: 500; font-size: 26px; letter-spacing: .26em; text-transform: uppercase; opacity: .88; text-shadow: 0 2px 10px rgba(0,0,0,.6); }
  #title { left: 70px; right: 70px; top: 660px; text-align: center; opacity: 0; transform-origin: 50% 0; font-size: 104px; line-height: 1.12; font-weight: 500; letter-spacing: -0.005em; text-shadow: 0 4px 18px rgba(0,0,0,.55), 0 0 60px rgba(0,0,0,.25); }
  #title em { font-style: normal; color: #ff3b2f; text-shadow: 0 0 24px rgba(255,59,47,.55), 0 4px 18px rgba(0,0,0,.5); }
  #hud { left: 64px; top: 250px; opacity: 0; text-align: left; }
  #hudValue { font-size: 118px; line-height: 1.0; font-weight: 400; margin: 10px 0 10px -4px; font-variant-numeric: tabular-nums; text-shadow: 0 4px 18px rgba(0,0,0,.6); }
  #cap { left: 80px; right: 80px; top: 1500px; text-align: center; opacity: 0; font-size: 56px; line-height: 1.3; font-weight: 500; text-shadow: 0 3px 14px rgba(0,0,0,.75), 0 0 40px rgba(0,0,0,.35); }
  #capInner { display: inline-block; max-width: 920px; }
  #capInner em { font-style: italic; color: #ffe3b3; }
  #footer { left: 0; right: 0; bottom: 120px; text-align: center; opacity: 0; font-family: "Inter", sans-serif; font-weight: 500; font-size: 24px; letter-spacing: .3em; text-transform: uppercase; text-shadow: 0 2px 10px rgba(0,0,0,.6); }
`;
export function injectBaseCss() { const s = document.createElement('style'); s.textContent = BASE_CSS; document.head.prepend(s); }
