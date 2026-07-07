import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* =========================================================
   대명자이그랜드시티 · 84A 타입 가상 모델하우스
   전용 84㎡ / 공급 114.49㎡ · 3Bay 판상형 (실제 평면 재구성)
   대구 남구 대명동 2301-2 · GS건설 · 2,023세대 · 2026.4 입주
   외부 에셋 없이 primitive 구성 → GitHub Pages 즉시 배포
   1 unit = 1 meter
   ========================================================= */

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe6ee);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(12, 11, 15);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.maxPolarAngle = Math.PI / 2.05;
orbit.minDistance = 3;
orbit.maxDistance = 34;
orbit.target.set(0, 1, 0);

/* ---------------- 조명 ---------------- */
const hemi = new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.6);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff2e0, 2.2);
sun.position.set(6, 15, 12);       // 남향 채광 (front = +z)
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 70;
const sh = 18;
sun.shadow.camera.left = -sh; sun.shadow.camera.right = sh;
sun.shadow.camera.top = sh; sun.shadow.camera.bottom = -sh;
sun.shadow.bias = -0.0004;
scene.add(sun);

const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);

const ceilingLights = [];
function addCeilingLight(x, z, intensity = 0, color = 0xffd9a0) {
  const l = new THREE.PointLight(color, intensity, 8, 2);
  l.position.set(x, 2.55, z);
  scene.add(l);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 12, 12),
    new THREE.MeshStandardMaterial({ emissive: color, emissiveIntensity: 0, color: 0x111111 })
  );
  bulb.position.copy(l.position);
  scene.add(bulb);
  l.userData.bulb = bulb;
  ceilingLights.push(l);
}

/* ---------------- 재질 ---------------- */
const FLOOR_COLORS = { oak: 0xc8a06a, walnut: 0x8a5a34, grey: 0x9a9a9a, white: 0xe8e6e0 };
const WALL_COLORS  = { ivory: 0xf3efe6, warm: 0xe8d9c3, mint: 0xd5e3dc, blue: 0xcdd8e6 };

const floorMat = new THREE.MeshStandardMaterial({ color: FLOOR_COLORS.oak, roughness: 0.55, metalness: 0.05 });
const wallMat  = new THREE.MeshStandardMaterial({ color: WALL_COLORS.ivory, roughness: 0.95 });
const trimMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xcfe3ea, transmission: 0.9, transparent: true, opacity: 0.28, roughness: 0.03, metalness: 0, ior: 1.4 });
const tileMat  = new THREE.MeshStandardMaterial({ color: 0xeef1f4, roughness: 0.25 });

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });

/* ---------------- 박스 헬퍼 ---------------- */
const geoCache = {};
function box(w, h, d, material, x = 0, y = 0, z = 0, opt = {}) {
  const key = `${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}`;
  const geo = geoCache[key] || (geoCache[key] = new THREE.BoxGeometry(w, h, d));
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = opt.cast !== false;
  m.receiveShadow = opt.receive !== false;
  return m;
}

const APT = new THREE.Group();
scene.add(APT);

/* =========================================================
   평면 (1u = 1m)  —  84A 3Bay 판상형
   x: 좌(-6.5) ~ 우(6.5)   z: 북/현관(-5) ~ 남/발코니(+5)
   전면(남향 +z) 3베이:  침실2 | 거실 | 안방
   ========================================================= */
const X1 = -6.5, X2 = 6.5, Z1 = -5, Z2 = 5;
const wallH = 2.7, t = 0.12;
const DL = -3.6;   // 좌측열/중앙열 경계
const DR = 1.8;    // 중앙열/우측열 경계

// 바닥 (오픈 돌하우스 뷰 → 천장 없음)
APT.add(box(X2 - X1, 0.1, Z2 - Z1, floorMat, 0, -0.05, 0, { cast: false }));

// 벽 세그먼트(문 개구부 gaps 지원) + 상인방(lintel)
function run(axis, fixed, a1, a2, gaps = []) {
  gaps = gaps.slice().sort((p, q) => p[0] - q[0]);
  let cur = a1; const segs = [];
  for (const [g1, g2] of gaps) { if (g1 > cur) segs.push([cur, g1]); cur = Math.max(cur, g2); }
  if (cur < a2) segs.push([cur, a2]);
  for (const [s, e] of segs) {
    const len = e - s, mid = (s + e) / 2;
    if (axis === 'x') APT.add(box(len, wallH, t, wallMat, mid, wallH / 2, fixed));
    else APT.add(box(t, wallH, len, wallMat, fixed, wallH / 2, mid));
  }
  // 문 상인방
  for (const [g1, g2] of gaps) {
    const len = g2 - g1, mid = (g1 + g2) / 2, hh = wallH - 2.1;
    if (axis === 'x') APT.add(box(len, hh, t, wallMat, mid, 2.1 + hh / 2, fixed, { cast: false }));
    else APT.add(box(t, hh, len, wallMat, fixed, 2.1 + hh / 2, mid, { cast: false }));
  }
}

/* ---- 외벽 ---- */
run('x', Z1, X1, X2);            // 북(현관측)
run('z', X1, Z1, Z2);            // 좌
run('z', X2, Z1, Z2);            // 우

/* ---- 전면(남향) 발코니 창호 ---- */
(function frontGlazing() {
  APT.add(box(X2 - X1, 0.35, 0.12, trimMat, 0, 0.175, Z2));            // 하부 창틀
  APT.add(box(X2 - X1, 0.22, 0.12, wallMat, 0, wallH - 0.11, Z2));      // 상부
  APT.add(box(X2 - X1 - 0.1, 2.0, 0.04, glassMat, 0, 1.35, Z2, { cast: false })); // 유리
  for (let x = X1 + 1; x < X2; x += 2)                                  // 멀리언
    APT.add(box(0.06, 2.0, 0.06, trimMat, x, 1.35, Z2));
  // 발코니 바닥 + 난간
  APT.add(box(X2 - X1, 0.06, 0.8, mat(0xbfc4c9, { roughness: 0.8 }), 0, 0.02, Z2 + 0.45, { cast: false }));
  APT.add(box(X2 - X1, 0.05, 0.05, trimMat, 0, 1.0, Z2 + 0.82));
  for (let x = X1; x <= X2; x += 0.5)
    APT.add(box(0.03, 1.0, 0.03, mat(0x9aa0a6, { metalness: 0.4 }), x, 0.5, Z2 + 0.82));
})();

/* ---- 내부 칸막이 ---- */
// 좌측열/중앙열 경계 (x=DL): 침실2문 + 침실3문
run('z', DL, Z1, Z2, [[2.4, 3.3], [-0.7, 0.2]]);
// 중앙열/우측열 경계 (x=DR): 안방문 + 공용욕실 복도
run('z', DR, Z1, Z2, [[2.4, 3.3], [-4.2, -3.4]]);
// 좌측열 가로: 침실2 | 침실3 (z=0.8)
run('x', 0.8, X1, DL);
// 좌측열 가로: 침실3 | 현관·복도 (z=-2.5), 복도 개구
run('x', -2.5, X1, DL, [[-6.0, -5.1]]);
// 우측열 가로: 안방 | 드레스룸·욕실 (z=0.8), 안방→드레스룸 문
run('x', 0.8, DR, X2, [[2.1, 3.0]]);
// 우측열 세로 x=4.0: 드레스룸 | 안방욕실 (z=-2.5~0.8)
run('z', 4.0, -2.5, 0.8, [[-0.6, 0.3]]);
// 우측열 가로 z=-2.5: (드레스/욕실) | (공용욕실/다용도)
run('x', -2.5, DR, X2);
// 우측열 세로 x=4.0: 공용욕실 | 다용도실 (z=-5~-2.5)
run('z', 4.0, Z1, -2.5, [[-3.4, -2.7]]);

// 천장등
addCeilingLight(-1.0, 2.2);    // 거실
addCeilingLight(-1.0, -3.0);   // 주방·식당
addCeilingLight(4.2, 2.6);     // 안방
addCeilingLight(-5.0, 2.6);    // 침실2
addCeilingLight(-5.0, -0.9);   // 침실3
addCeilingLight(3.0, -0.9, 0, 0xeaf2ff);  // 안방욕실
addCeilingLight(3.0, -3.7, 0, 0xeaf2ff);  // 공용욕실

/* =========================================================
   가구 빌더
   ========================================================= */
function rug(x, z, w, d, color) { APT.add(box(w, 0.02, d, mat(color, { roughness: 1 }), x, 0.011, z, { cast: false })); }

function sofa(x, z, rot = 0) {
  const g = new THREE.Group(); const c = mat(0x6b7280, { roughness: 0.9 });
  g.add(box(2.6, 0.35, 0.95, c, 0, 0.35, 0));
  g.add(box(2.6, 0.6, 0.22, c, 0, 0.7, -0.36));
  g.add(box(0.24, 0.55, 0.95, c, -1.18, 0.62, 0));
  g.add(box(0.24, 0.55, 0.95, c, 1.18, 0.62, 0));
  [-0.65, 0.65].forEach(dx => g.add(box(0.75, 0.18, 0.82, mat(0x8b96a5), dx, 0.62, 0.05)));
  g.position.set(x, 0, z); g.rotation.y = rot; APT.add(g);
}
function coffeeTable(x, z) {
  const g = new THREE.Group(); const w = mat(0x6b4a2f, { roughness: 0.45 });
  g.add(box(1.2, 0.08, 0.62, w, 0, 0.42, 0));
  [[-0.55, -0.26], [0.55, -0.26], [-0.55, 0.26], [0.55, 0.26]].forEach(([lx, lz]) => g.add(box(0.06, 0.42, 0.06, w, lx, 0.21, lz)));
  g.position.set(x, 0, z); APT.add(g);
}
function tvWall(x, z) {
  const g = new THREE.Group();
  g.add(box(3.0, 0.06, 0.35, mat(0xece9e3, { roughness: 0.5 }), 0, 0.35, 0));   // 아트월 선반
  g.add(box(2.4, 0.42, 0.4, mat(0x2b2b2f, { roughness: 0.4 }), 0, 0.21, 0));    // 하부장
  g.add(box(2.0, 1.15, 0.06, mat(0x0b0b0d, { roughness: 0.2, metalness: 0.3 }), 0, 1.3, 0.02));
  g.add(box(1.9, 1.03, 0.01, new THREE.MeshStandardMaterial({ color: 0x101820, emissive: 0x0a1a2a, emissiveIntensity: 0.5 }), 0, 1.3, 0.06));
  g.position.set(x, 0, z); APT.add(g);
}
function diningSet(x, z) {
  const g = new THREE.Group(); const w = mat(0xa9773f, { roughness: 0.5 });
  g.add(box(1.7, 0.07, 0.9, w, 0, 0.75, 0));
  [[-0.75, -0.35], [0.75, -0.35], [-0.75, 0.35], [0.75, 0.35]].forEach(([lx, lz]) => g.add(box(0.07, 0.75, 0.07, w, lx, 0.37, lz)));
  const cc = mat(0x3f4652);
  [-0.6, 0.6].forEach(cx => [-0.62, 0.62].forEach(cz => {
    g.add(box(0.42, 0.05, 0.42, cc, cx, 0.45, cz));
    g.add(box(0.42, 0.5, 0.05, cc, cx, 0.7, cz + (cz > 0 ? 0.18 : -0.18)));
  }));
  g.position.set(x, 0, z); APT.add(g);
}
function kitchenLine(x, z, w) {   // 북벽 붙박이 일자 주방
  const g = new THREE.Group(); const cab = mat(0xf0f0f2, { roughness: 0.4 }); const top = mat(0x2c2f36, { roughness: 0.25, metalness: 0.1 });
  g.add(box(w, 0.9, 0.6, cab, 0, 0.45, 0));
  g.add(box(w + 0.04, 0.06, 0.64, top, 0, 0.93, 0));
  g.add(box(w, 0.7, 0.35, cab, 0, 2.0, -0.12));                                  // 상부장
  g.add(box(0.6, 0.12, 0.4, mat(0x9099a3, { metalness: 0.6, roughness: 0.3 }), -w / 4, 0.9, 0)); // 싱크
  g.add(box(0.6, 0.02, 0.5, mat(0x111214, { roughness: 0.3 }), w / 4, 0.95, 0)); // 쿡탑
  g.add(box(0.8, 0.3, 0.5, mat(0xd9dbe0, { metalness: 0.5, roughness: 0.3 }), w / 4, 2.15, -0.05)); // 후드
  g.position.set(x, 0, z); APT.add(g);
}
function island(x, z) {
  const g = new THREE.Group();
  g.add(box(1.9, 0.9, 0.85, mat(0xdfe3ea, { roughness: 0.4 }), 0, 0.45, 0));
  g.add(box(2.0, 0.06, 0.95, mat(0x3a3d44, { roughness: 0.25 }), 0, 0.93, 0));
  g.position.set(x, 0, z); APT.add(g);
}
function fridge(x, z) {
  const g = new THREE.Group();
  g.add(box(0.85, 1.95, 0.75, mat(0xdadde3, { metalness: 0.5, roughness: 0.25 }), 0, 0.97, 0));
  g.add(box(0.03, 0.5, 0.03, mat(0x8a8f98, { metalness: 0.6 }), -0.37, 1.4, 0.4));
  g.position.set(x, 0, z); APT.add(g);
}
function bed(x, z, rot = 0, king = true) {
  const g = new THREE.Group(); const wBed = king ? 2.0 : 1.4;
  g.add(box(wBed, 0.3, 2.15, mat(0x6b5647, { roughness: 0.6 }), 0, 0.2, 0));
  g.add(box(wBed - 0.1, 0.22, 2.0, mat(0xf4f1ea, { roughness: 0.95 }), 0, 0.42, 0));
  g.add(box(wBed, 0.75, 0.12, mat(0x5b4a3d), 0, 0.55, -1.05));
  g.add(box(wBed - 0.2, 0.08, 1.15, mat(0x9fb0c4, { roughness: 0.9 }), 0, 0.55, 0.4));
  const pn = king ? [-0.5, 0.5] : [0];
  pn.forEach(px => g.add(box(0.55, 0.16, 0.35, mat(0xffffff, { roughness: 1 }), px, 0.6, -0.72)));
  g.position.set(x, 0, z); g.rotation.y = rot; APT.add(g);
}
function nightstand(x, z) {
  APT.add(box(0.45, 0.45, 0.4, mat(0x7a6552), x, 0.22, z));
  APT.add(box(0.16, 0.28, 0.16, new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffcaa0, emissiveIntensity: 0.35 }), x, 0.58, z));
}
function wardrobe(x, z, w, rot = 0) {
  const g = new THREE.Group();
  g.add(box(w, 2.35, 0.6, mat(0xe6e2da, { roughness: 0.5 }), 0, 1.17, 0));
  for (let i = -w / 2 + 0.3; i < w / 2; i += 0.6) g.add(box(0.02, 2.28, 0.62, mat(0xcfc9bd), i, 1.17, 0));
  g.position.set(x, 0, z); g.rotation.y = rot; APT.add(g);
}
function desk(x, z, rot = 0) {
  const g = new THREE.Group(); const w = mat(0xd8c3a0, { roughness: 0.5 });
  g.add(box(1.3, 0.05, 0.6, w, 0, 0.74, 0));
  [[-0.6, -0.25], [0.6, -0.25], [-0.6, 0.25], [0.6, 0.25]].forEach(([lx, lz]) => g.add(box(0.05, 0.74, 0.05, w, lx, 0.37, lz)));
  g.add(box(0.5, 0.5, 0.05, mat(0x1c1c22), 0, 1.05, -0.25));  // 모니터
  g.position.set(x, 0, z); g.rotation.y = rot; APT.add(g);
}
function bathroom(x, z, withTub = false) {
  const g = new THREE.Group(); const white = mat(0xffffff, { roughness: 0.2 });
  APT.add(box(3.9, 0.04, 2.4, tileMat, x, 0.02, z, { cast: false }));   // 타일 바닥(작게)
  g.add(box(0.75, 0.85, 0.5, mat(0xe4e7ec, { roughness: 0.4 }), 0, 0.42, 0));       // 세면대 하부장
  g.add(box(0.77, 0.05, 0.52, mat(0xf2f3f5, { roughness: 0.2 }), 0, 0.87, 0));
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.12, 20), white); basin.position.y = 0.93; basin.castShadow = true; g.add(basin);
  g.add(box(0.6, 0.7, 0.03, new THREE.MeshStandardMaterial({ color: 0xafc4d6, metalness: 0.9, roughness: 0.05 }), 0, 1.5, -0.22)); // 거울
  const toilet = new THREE.Group();
  toilet.add(box(0.4, 0.4, 0.55, white, 0, 0.2, 0));
  toilet.add(box(0.42, 0.5, 0.18, white, 0, 0.55, -0.2));
  toilet.position.set(0.95, 0, 0.35); g.add(toilet);
  g.add(box(0.04, 2.0, 1.3, glassMat, -0.95, 1.0, -0.3));   // 샤워 파티션
  if (withTub) g.add(box(1.5, 0.5, 0.75, white, 0.4, 0.25, -0.65)); // 욕조
  g.position.set(x, 0, z); APT.add(g);
}
function plant(x, z, s = 1) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.35, 16), mat(0xb0603a)); pot.position.y = 0.17; pot.castShadow = true; g.add(pot);
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 0), mat(0x3f7d4e, { flatShading: true })); leaves.position.y = 0.62; leaves.castShadow = true; g.add(leaves);
  g.scale.setScalar(s); g.position.set(x, 0, z); APT.add(g);
}
function shoeCabinet(x, z, rot = 0) { const g = new THREE.Group(); g.add(box(1.2, 2.0, 0.35, mat(0xe8e4dc, { roughness: 0.5 }), 0, 1.0, 0)); g.position.set(x, 0, z); g.rotation.y = rot; APT.add(g); }

/* =========================================================
   가구 배치 (84A)
   ========================================================= */
// 거실 (중앙 전면)
rug(-1.0, 2.4, 3.4, 2.4, 0xb9c2cc);
sofa(-1.0, 3.4, Math.PI);
coffeeTable(-1.0, 2.2);
tvWall(-1.0, 0.75);
plant(1.2, 3.6, 1.1);

// 주방·식당 (중앙 후면, LDK 오픈)
kitchenLine(-1.0, -4.55, 4.6);
island(-1.0, -3.4);
fridge(1.3, -4.5);
diningSet(-1.0, -1.6);

// 안방 (우측 전면) + 협탁
bed(4.2, 3.1, Math.PI, true);
nightstand(2.5, 3.6); nightstand(5.9, 3.6);
plant(5.7, 1.4, 0.9);
// 드레스룸 (안방 뒤 좌) + 안방욕실 (우)
wardrobe(2.5, 0.1, 2.0, 0);
bathroom(5.2, -0.9);   // 안방욕실

// 침실2 (좌측 전면)
bed(-5.0, 3.0, Math.PI, false);
desk(-4.0, 1.4, Math.PI / 2);
// 침실3 (좌측 중앙)
bed(-5.1, -0.9, Math.PI / 2, false);
wardrobe(-4.1, -1.9, 1.6, 0);

// 공용욕실 (우측 후면)
bathroom(3.0, -3.9, true);

// 현관 (좌측 후면)
shoeCabinet(-6.1, -3.4, Math.PI / 2);
APT.add(box(1.4, 0.02, 1.0, mat(0x8a8f98, { roughness: 0.3 }), -5.6, 0.02, -4.3, { cast: false })); // 현관 중문 타일
plant(-4.9, -4.3, 0.8);

/* =========================================================
   방 카메라 프리셋 & 정보
   ========================================================= */
const VIEWS = {
  overview: { pos: [12, 11, 15], target: [0, 1, 0] },
  living:   { pos: [-1.0, 2.3, -1.5], target: [-1.0, 1.2, 4.0] },
  kitchen:  { pos: [-1.0, 2.4, 1.6], target: [-1.0, 1.0, -4.4] },
  master:   { pos: [3.0, 2.3, -0.5], target: [4.6, 1.0, 4.0] },
  bed:      { pos: [-3.9, 2.3, 0.4], target: [-5.4, 1.0, 2.6] },
  bath:     { pos: [1.4, 2.2, -3.9], target: [3.4, 1.0, -4.0] },
};
const ROOM_TEXT = {
  living:  { t: '거실 · Living', d: '남향 3베이 판상형의 중심 공간. 전면 확장형 발코니 창호로 채광·조망을 극대화했습니다.' },
  kitchen: { t: '주방 · 식당 (LDK)', d: '거실과 일체형으로 이어지는 대면형 주방 + 아일랜드. 일자형 상·하부장으로 수납을 강화했습니다.' },
  master:  { t: '안방 · Master', d: '전면 배치 안방. 드레스룸과 안방 전용 욕실을 갖춘 부부 전용 스위트 구성입니다.' },
  bed:     { t: '침실 2·3', d: '좌측 베이의 자녀·서재 겸용 침실. 붙박이장과 책상 배치로 실사용 동선을 반영했습니다.' },
  bath:    { t: '공용 욕실', d: '욕조 포함 공용 욕실. 건식 세면대 + 유리 파티션 샤워부스로 습식/건식을 분리했습니다.' },
};

const roomInfo = document.getElementById('room-info');
let animView = null;
function goToRoom(name) {
  const v = VIEWS[name]; if (!v) return;
  animView = { fromPos: camera.position.clone(), toPos: new THREE.Vector3(...v.pos), fromTarget: orbit.target.clone(), toTarget: new THREE.Vector3(...v.target), t: 0 };
  const info = ROOM_TEXT[name];
  if (info) { roomInfo.innerHTML = `<h3>${info.t}</h3><p>${info.d}</p>`; roomInfo.classList.add('show'); }
  else roomInfo.classList.remove('show');
}
document.querySelectorAll('.room-btn').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.room-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); goToRoom(btn.dataset.room);
}));

/* ---------------- 타입 선택기 (실제 분양 데이터) ---------------- */
const TYPES = {
  '59A': { area: '전용 59.9㎡ / 공급 81.94㎡', bay: '3Bay 판상형 · 방3/욕실1', units: '543세대', price: '3억 7,000만 ~ 3억 9,800만원' },
  '84A': { area: '전용 84.9㎡ / 공급 114.49㎡', bay: '3Bay 판상형 · 방3/욕실2', units: '213세대', price: '5억 2,400만 ~ 5억 6,500만원' },
  '84B': { area: '전용 84.9㎡ / 공급 114.87㎡', bay: '3Bay 판상형 · 방3/욕실2', units: '254세대', price: '5억 1,900만 ~ 5억 5,800만원' },
  '101': { area: '전용 101.9㎡ / 공급 137.56㎡', bay: '4Bay 판상형 · 방4/욕실2', units: '57세대', price: '6억 5,000만 ~ 6억 9,900만원' },
};
const typeInfo = document.getElementById('type-info');
function showType(key) {
  const d = TYPES[key];
  const built = key === '84A' ? '<span class="live-tag">● 3D 뷰</span>' : '<span class="soon-tag">평면 정보</span>';
  typeInfo.innerHTML = `<div class="ti-head"><strong>${key} 타입</strong> ${built}</div>
    <div class="ti-row">${d.area}</div><div class="ti-row">${d.bay}</div>
    <div class="ti-row">공급 ${d.units}</div><div class="ti-row ti-price">분양가 ${d.price}</div>`;
  typeInfo.classList.add('show');
}
document.querySelectorAll('.type-btn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.type-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); showType(b.dataset.type);
}));

/* ---------------- 낮/밤 ---------------- */
function setTime(night) {
  document.getElementById('btn-day').classList.toggle('active', !night);
  document.getElementById('btn-night').classList.toggle('active', night);
  if (night) {
    scene.background = new THREE.Color(0x0b1020);
    sun.intensity = 0.15; hemi.intensity = 0.12; ambient.intensity = 0.08; renderer.toneMappingExposure = 0.95;
    ceilingLights.forEach(l => { l.intensity = 24; l.userData.bulb.material.emissiveIntensity = 1; });
  } else {
    scene.background = new THREE.Color(0xdfe6ee);
    sun.intensity = 2.2; hemi.intensity = 0.6; ambient.intensity = 0.35; renderer.toneMappingExposure = 1.05;
    ceilingLights.forEach(l => { l.intensity = 0; l.userData.bulb.material.emissiveIntensity = 0; });
  }
}
document.getElementById('btn-day').addEventListener('click', () => setTime(false));
document.getElementById('btn-night').addEventListener('click', () => setTime(true));

/* ---------------- 마감재 ---------------- */
document.querySelectorAll('[data-floor]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-floor]').forEach(x => x.classList.remove('active')); b.classList.add('active');
  floorMat.color.setHex(FLOOR_COLORS[b.dataset.floor]);
}));
document.querySelectorAll('[data-wall]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-wall]').forEach(x => x.classList.remove('active')); b.classList.add('active');
  wallMat.color.setHex(WALL_COLORS[b.dataset.wall]);
}));

/* ---------------- 1인칭 둘러보기 ---------------- */
const plControls = new PointerLockControls(camera, renderer.domElement);
const walkHint = document.getElementById('walk-hint');
const keys = {}; let walkMode = false, savedCam = null;
document.getElementById('btn-walk').addEventListener('click', () => walkHint.classList.remove('hidden'));
document.getElementById('btn-walk-start').addEventListener('click', () => {
  walkHint.classList.add('hidden');
  savedCam = { pos: camera.position.clone(), target: orbit.target.clone() };
  camera.position.set(-1.0, 1.6, 3.0); orbit.enabled = false; walkMode = true; animView = null; plControls.lock();
});
plControls.addEventListener('unlock', () => {
  if (!walkMode) return; walkMode = false; orbit.enabled = true;
  if (savedCam) { camera.position.copy(savedCam.pos); orbit.target.copy(savedCam.target); }
});
addEventListener('keydown', e => keys[e.code] = true);
addEventListener('keyup', e => keys[e.code] = false);
const vel = new THREE.Vector3();
const HW = (X2 - X1) / 2 - 0.35, HD = (Z2 - Z1) / 2 - 0.35;
function updateWalk(dt) {
  if (!walkMode) return;
  vel.x = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  vel.z = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
  vel.normalize().multiplyScalar(3.2 * dt);
  plControls.moveRight(vel.x); plControls.moveForward(-vel.z);
  const p = camera.position;
  p.x = Math.max(-HW, Math.min(HW, p.x)); p.z = Math.max(-HD, Math.min(HD, p.z)); p.y = 1.6;
}

/* ---------------- 리사이즈 & 루프 ---------------- */
function resize() {
  const w = innerWidth || canvas.clientWidth || 1280;
  const h = innerHeight || canvas.clientHeight || 720;
  camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false);
  canvas.style.width = '100%'; canvas.style.height = '100%';
}
addEventListener('resize', resize);
resize();
const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (animView) {
    animView.t = Math.min(1, animView.t + dt * 1.6);
    const e = 1 - Math.pow(1 - animView.t, 3);
    camera.position.lerpVectors(animView.fromPos, animView.toPos, e);
    orbit.target.lerpVectors(animView.fromTarget, animView.toTarget, e);
    if (animView.t >= 1) animView = null;
  }
  updateWalk(dt);
  if (!walkMode) orbit.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

/* ---------------- 로딩 ---------------- */
const barFill = document.getElementById('bar-fill'); let prog = 0;
const fake = setInterval(() => {
  prog = Math.min(100, prog + 12 + Math.random() * 18); barFill.style.width = prog + '%';
  if (prog >= 100) {
    clearInterval(fake);
    setTimeout(() => { document.getElementById('loader').classList.add('done'); resize(); setTime(false); showType('84A'); tick(); }, 300);
  }
}, 120);
