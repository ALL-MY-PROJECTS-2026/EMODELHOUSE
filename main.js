import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* =========================================================
   E-MODELHOUSE — three.js 가상 모델하우스 템플릿
   외부 에셋 없이 primitive로 구성 → GitHub Pages 즉시 배포 가능
   1 unit = 1 meter
   ========================================================= */

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe6ee);

// 부드러운 실내 반사 환경광
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(11, 9, 13);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.maxPolarAngle = Math.PI / 2.05;
orbit.minDistance = 3;
orbit.maxDistance = 30;
orbit.target.set(0, 1, 0);

/* ---------------- 조명 ---------------- */
const hemi = new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.6);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff2e0, 2.2);
sun.position.set(9, 14, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 60;
const s = 16;
sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
sun.shadow.bias = -0.0004;
scene.add(sun);

const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);

// 밤 조명 (천장등)
const ceilingLights = [];
function addCeilingLight(x, z, color = 0xffd9a0, intensity = 0) {
  const l = new THREE.PointLight(color, intensity, 9, 2);
  l.position.set(x, 2.6, z);
  scene.add(l);
  ceilingLights.push(l);
  // 전구 표시
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 16, 16),
    new THREE.MeshStandardMaterial({ emissive: color, emissiveIntensity: 0, color: 0x111111 })
  );
  bulb.position.copy(l.position);
  bulb.userData.isBulb = true;
  scene.add(bulb);
  l.userData.bulb = bulb;
}

/* ---------------- 재질 프리셋 ---------------- */
const FLOOR_COLORS = { oak: 0xc8a06a, walnut: 0x7a5230, grey: 0x9a9a9a, white: 0xe8e6e0 };
const WALL_COLORS  = { ivory: 0xf3efe6, warm: 0xe8d9c3, mint: 0xd5e3dc, blue: 0xcdd8e6 };

const floorMat = new THREE.MeshStandardMaterial({ color: FLOOR_COLORS.walnut, roughness: 0.55, metalness: 0.05 });
const wallMat  = new THREE.MeshStandardMaterial({ color: WALL_COLORS.ivory, roughness: 0.95 });
const trimMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });

/* ---------------- 헬퍼: 박스 ---------------- */
const boxGeoCache = {};
function box(w, h, d, material, x = 0, y = 0, z = 0, opt = {}) {
  const key = `${w}_${h}_${d}`;
  const geo = boxGeoCache[key] || (boxGeoCache[key] = new THREE.BoxGeometry(w, h, d));
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = opt.cast !== false;
  m.receiveShadow = opt.receive !== false;
  return m;
}

const APT = new THREE.Group();
scene.add(APT);

/* ---------------- 바닥 & 천장 ---------------- */
const W = 12, D = 9;               // 아파트 내부 폭/깊이
const wallH = 2.7, t = 0.12;       // 벽 높이/두께

const floor = box(W, 0.1, D, floorMat, 0, -0.05, 0, { cast: false });
APT.add(floor);

// 걸레받이(바닥 테두리)
const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

// 외벽 4면
function wall(w, h, d, x, z) {
  const m = box(w, h, d, wallMat, x, h / 2, z);
  APT.add(m);
  return m;
}
wall(W, wallH, t, 0, -D / 2);       // 뒤
wall(t, wallH, D, -W / 2, 0);       // 좌
wall(t, wallH, D,  W / 2, 0);       // 우
// 앞쪽은 조감을 위해 낮은 벽(난간)만
wall(W, 0.4, t, 0, D / 2);

/* ---------------- 내부 칸막이 (평면 구성) ----------------
   좌측: 침실 / 욕실
   우측: 거실 + 주방 (오픈형)
------------------------------------------------------------ */
// 세로 칸막이: 좌측 방들과 우측 거실 분리 (x = -1)
const divX = -1;
// 위쪽(뒤) 절반은 침실, 아래쪽(앞) 절반은 나중에 오픈
wall(t, wallH, D * 0.55, divX, -D / 2 + (D * 0.55) / 2);
// 가로 칸막이: 침실 / 욕실 분리
wall((divX + W / 2) - W / 2 + (W / 2 + divX) , wallH, t, (-W / 2 + divX) / 2, -D * 0.1);

// 침실/욕실 구분용 짧은 벽 정리 (좌측 영역을 위: 침실 / 아래: 욕실)
const leftW = (divX + W / 2); // 좌측 영역 폭
wall(leftW, wallH, t, -W / 2 + leftW / 2, -0.3);

// 천장등 배치
addCeilingLight(3.2, -1.5);    // 거실
addCeilingLight(3.2, 2.6);     // 주방
addCeilingLight(-3.4, -3);     // 침실
addCeilingLight(-4, 1.8);      // 욕실

/* =========================================================
   가구 빌더
   ========================================================= */

// --- 소파 ---
function sofa(x, z, rot = 0) {
  const g = new THREE.Group();
  const c = mat(0x6b7280, { roughness: 0.85 });
  g.add(box(2.4, 0.35, 0.95, c, 0, 0.35, 0));      // 좌석 베이스
  g.add(box(2.4, 0.6, 0.25, c, 0, 0.7, -0.35));    // 등받이
  g.add(box(0.25, 0.55, 0.95, c, -1.08, 0.62, 0)); // 팔걸이
  g.add(box(0.25, 0.55, 0.95, c, 1.08, 0.62, 0));
  [-0.6, 0.6].forEach(dx => g.add(box(0.7, 0.18, 0.8, mat(0x8b96a5), dx, 0.62, 0.05)));
  g.position.set(x, 0, z); g.rotation.y = rot; APT.add(g); return g;
}

// --- 러그 ---
function rug(x, z, w, d, color) {
  const m = box(w, 0.02, d, mat(color, { roughness: 1 }), x, 0.011, z, { cast: false });
  APT.add(m);
}

// --- TV 유닛 ---
function tvUnit(x, z, rot = 0) {
  const g = new THREE.Group();
  g.add(box(2.2, 0.4, 0.4, mat(0x2b2b2f, { roughness: 0.4 }), 0, 0.2, 0)); // 하부장
  const tv = box(1.8, 1.0, 0.06, mat(0x0b0b0d, { roughness: 0.2, metalness: 0.3 }), 0, 1.25, -0.05);
  g.add(tv);
  g.add(box(1.7, 0.9, 0.01, new THREE.MeshStandardMaterial({ color: 0x101820, emissive: 0x0a1a2a, emissiveIntensity: 0.4 }), 0, 1.25, -0.01));
  g.position.set(x, 0, z); g.rotation.y = rot; APT.add(g); return g;
}

// --- 커피 테이블 ---
function coffeeTable(x, z) {
  const g = new THREE.Group();
  const w = mat(0x8a5a34, { roughness: 0.5 });
  g.add(box(1.1, 0.08, 0.6, w, 0, 0.42, 0));
  [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]].forEach(([lx, lz]) =>
    g.add(box(0.06, 0.42, 0.06, w, lx, 0.21, lz)));
  g.position.set(x, 0, z); APT.add(g); return g;
}

// --- 식탁 세트 ---
function diningSet(x, z) {
  const g = new THREE.Group();
  const w = mat(0xb5844d, { roughness: 0.5 });
  g.add(box(1.6, 0.07, 0.9, w, 0, 0.75, 0));
  [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]].forEach(([lx, lz]) =>
    g.add(box(0.07, 0.75, 0.07, w, lx, 0.37, lz)));
  const chairC = mat(0x3f4652);
  [-0.55, 0.55].forEach(cx => [-0.62, 0.62].forEach(cz => {
    g.add(box(0.42, 0.05, 0.42, chairC, cx, 0.45, cz));
    g.add(box(0.42, 0.5, 0.05, chairC, cx, 0.7, cz + (cz > 0 ? 0.18 : -0.18)));
  }));
  g.position.set(x, 0, z); APT.add(g); return g;
}

// --- 주방 (ㄷ자 카운터 + 상부장 + 아일랜드) ---
function kitchen(x, z) {
  const g = new THREE.Group();
  const cab = mat(0xf0f0f2, { roughness: 0.4 });
  const top = mat(0x2c2f36, { roughness: 0.25, metalness: 0.1 });
  // 벽면 하부장
  g.add(box(3.2, 0.9, 0.6, cab, 0, 0.45, -0.0));
  g.add(box(3.24, 0.06, 0.64, top, 0, 0.93, 0));   // 상판
  // 상부장
  g.add(box(3.2, 0.7, 0.35, cab, 0, 2.0, -0.12));
  // 싱크볼
  g.add(box(0.6, 0.12, 0.4, mat(0x9099a3, { metalness: 0.6, roughness: 0.3 }), -0.7, 0.9, 0));
  // 쿡탑
  g.add(box(0.6, 0.02, 0.5, mat(0x111214, { roughness: 0.3 }), 0.7, 0.95, 0));
  // 후드
  g.add(box(0.8, 0.3, 0.5, mat(0xd9dbe0, { metalness: 0.5, roughness: 0.3 }), 0.7, 2.15, -0.05));
  g.position.set(x, 0, z); APT.add(g); return g;
}

function island(x, z) {
  const g = new THREE.Group();
  g.add(box(1.8, 0.9, 0.8, mat(0xdfe3ea, { roughness: 0.4 }), 0, 0.45, 0));
  g.add(box(1.9, 0.06, 0.9, mat(0x3a3d44, { roughness: 0.25 }), 0, 0.93, 0));
  // 스툴
  [-0.5, 0.5].forEach(sx => {
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 20), mat(0xc98b52)).translateX(sx).translateY(0.62).translateZ(0.7));
    g.children.at(-1).castShadow = true;
  });
  g.position.set(x, 0, z); APT.add(g); return g;
}

// --- 냉장고 ---
function fridge(x, z) {
  const g = new THREE.Group();
  g.add(box(0.8, 1.9, 0.75, mat(0xdadde3, { metalness: 0.5, roughness: 0.25 }), 0, 0.95, 0));
  g.add(box(0.03, 0.5, 0.03, mat(0x8a8f98, { metalness: 0.6 }), -0.35, 1.4, 0.4));
  g.position.set(x, 0, z); APT.add(g); return g;
}

// --- 침대 ---
function bed(x, z, rot = 0) {
  const g = new THREE.Group();
  g.add(box(1.9, 0.3, 2.1, mat(0x6b5647, { roughness: 0.6 }), 0, 0.2, 0));      // 프레임
  g.add(box(1.8, 0.22, 2.0, mat(0xf4f1ea, { roughness: 0.95 }), 0, 0.42, 0));   // 매트리스
  g.add(box(1.9, 0.7, 0.12, mat(0x5b4a3d), 0, 0.55, -1.0));                     // 헤드보드
  g.add(box(1.6, 0.08, 1.1, mat(0x9fb0c4, { roughness: 0.9 }), 0, 0.55, 0.35)); // 이불
  [-0.5, 0.5].forEach(px => g.add(box(0.55, 0.16, 0.35, mat(0xffffff, { roughness: 1 }), px, 0.6, -0.7))); // 베개
  g.position.set(x, 0, z); g.rotation.y = rot; APT.add(g); return g;
}

// --- 협탁 & 옷장 ---
function nightstand(x, z) {
  APT.add(box(0.45, 0.45, 0.4, mat(0x7a6552), x, 0.22, z));
  const lamp = box(0.16, 0.28, 0.16, new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffcaa0, emissiveIntensity: 0.3 }), x, 0.58, z);
  APT.add(lamp);
}
function wardrobe(x, z, rot = 0) {
  const g = new THREE.Group();
  g.add(box(2.0, 2.3, 0.6, mat(0xe6e2da, { roughness: 0.5 }), 0, 1.15, 0));
  [-0.5, 0, 0.5].forEach(dx => g.add(box(0.63, 2.24, 0.02, mat(0xd7d2c8), dx, 1.15, 0.31)));
  g.position.set(x, 0, z); g.rotation.y = rot; APT.add(g); return g;
}

// --- 욕실 ---
function bathroom(x, z) {
  const g = new THREE.Group();
  const white = mat(0xffffff, { roughness: 0.2 });
  // 세면대
  g.add(box(0.7, 0.85, 0.5, mat(0xe4e7ec, { roughness: 0.4 }), 0, 0.42, 0));
  g.add(box(0.72, 0.05, 0.52, mat(0xf2f3f5, { roughness: 0.2 }), 0, 0.87, 0));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.12, 20), white).translateY(0.93));
  g.children.at(-1).castShadow = true;
  // 거울
  g.add(box(0.6, 0.7, 0.03, new THREE.MeshStandardMaterial({ color: 0xafc4d6, metalness: 0.9, roughness: 0.05 }), 0, 1.5, -0.22));
  // 변기
  const toilet = new THREE.Group();
  toilet.add(box(0.4, 0.4, 0.55, white, 0, 0.2, 0));
  toilet.add(box(0.42, 0.5, 0.18, white, 0, 0.55, -0.2));
  toilet.position.set(1.1, 0, 0.2);
  g.add(toilet);
  // 샤워 유리 파티션
  g.add(box(0.04, 2.0, 1.2, new THREE.MeshPhysicalMaterial({ color: 0xbfe0ea, transmission: 0.85, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0 }), -1.0, 1.0, -0.4));
  g.position.set(x, 0, z); APT.add(g); return g;
}

// --- 화분 ---
function plant(x, z, scale = 1) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.35, 16), mat(0xb0603a)).translateY(0.17));
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), mat(0x3f7d4e, { flatShading: true }));
  leaves.position.y = 0.6; g.add(leaves);
  g.children.forEach(c => { c.castShadow = true; });
  g.scale.setScalar(scale); g.position.set(x, 0, z); APT.add(g); return g;
}

/* ---------------- 배치 ---------------- */
// 거실 (우측 앞)
rug(3.2, -1.2, 3.2, 2.2, 0xb9c2cc);
sofa(3.2, -0.2, Math.PI);
coffeeTable(3.2, -1.4);
tvUnit(3.2, -3.3, 0);
plant(5.2, -3.0, 1.1);

// 주방 (우측 뒤쪽 벽 x 방향) — 오른쪽 벽면
kitchen(3.4, 3.3);
island(3.2, 1.9);
fridge(5.2, 3.0);
diningSet(0.6, 1.6);

// 침실 (좌측 뒤)
bed(-3.4, -3.0, 0);
nightstand(-4.7, -3.5);
nightstand(-2.1, -3.5);
wardrobe(-5.2, -1.2, Math.PI / 2);
plant(-2.0, -1.0, 0.9);

// 욕실 (좌측 앞)
bathroom(-4.3, 1.6);

/* =========================================================
   방 카메라 프리셋
   ========================================================= */
const VIEWS = {
  overview: { pos: [11, 9, 13],   target: [0, 1, 0] },
  living:   { pos: [4.5, 2.2, 3.5], target: [3.2, 1.0, -2.5] },
  kitchen:  { pos: [0.5, 2.4, -1.0], target: [3.6, 1.0, 3.0] },
  bedroom:  { pos: [-1.5, 2.3, 1.0], target: [-3.8, 0.8, -3.0] },
  bath:     { pos: [-1.5, 2.0, 3.2], target: [-4.3, 1.0, 1.4] },
};
const ROOM_TEXT = {
  living:  { t: '거실 · Living Room', d: '3면 개방형 와이드 거실. 폭 3.2m 소파 배치와 대형 TV월로 넉넉한 시청 거리를 확보했습니다.' },
  kitchen: { t: '주방 · Kitchen', d: 'ㄷ자 주방 + 아일랜드 식탁 구성. 조리·수납 동선을 최소화한 대면형 레이아웃입니다.' },
  bedroom: { t: '침실 · Master Bedroom', d: '킹사이즈 침대와 3연동 붙박이장. 침대 양측 협탁으로 대칭 배치했습니다.' },
  bath:    { t: '욕실 · Bathroom', d: '건식 세면대 + 유리 파티션 샤워부스로 습식/건식을 분리한 호텔형 욕실입니다.' },
};

const roomInfo = document.getElementById('room-info');
let animView = null;

function goToRoom(name) {
  const v = VIEWS[name];
  if (!v) return;
  animView = {
    fromPos: camera.position.clone(),
    toPos: new THREE.Vector3(...v.pos),
    fromTarget: orbit.target.clone(),
    toTarget: new THREE.Vector3(...v.target),
    t: 0,
  };
  const info = ROOM_TEXT[name];
  if (info) {
    roomInfo.innerHTML = `<h3>${info.t}</h3><p>${info.d}</p>`;
    roomInfo.classList.add('show');
  } else {
    roomInfo.classList.remove('show');
  }
}

document.querySelectorAll('.room-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.room-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    goToRoom(btn.dataset.room);
  });
});

/* ---------------- 낮/밤 ---------------- */
function setTime(night) {
  const dayBtn = document.getElementById('btn-day');
  const nightBtn = document.getElementById('btn-night');
  dayBtn.classList.toggle('active', !night);
  nightBtn.classList.toggle('active', night);
  if (night) {
    scene.background = new THREE.Color(0x0b1020);
    sun.intensity = 0.15; hemi.intensity = 0.12; ambient.intensity = 0.08;
    renderer.toneMappingExposure = 0.95;
    ceilingLights.forEach(l => { l.intensity = 26; l.userData.bulb.material.emissiveIntensity = 1; });
  } else {
    scene.background = new THREE.Color(0xdfe6ee);
    sun.intensity = 2.2; hemi.intensity = 0.6; ambient.intensity = 0.35;
    renderer.toneMappingExposure = 1.05;
    ceilingLights.forEach(l => { l.intensity = 0; l.userData.bulb.material.emissiveIntensity = 0; });
  }
}
document.getElementById('btn-day').addEventListener('click', () => setTime(false));
document.getElementById('btn-night').addEventListener('click', () => setTime(true));

/* ---------------- 바닥재 / 벽지 ---------------- */
document.querySelectorAll('[data-floor]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-floor]').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  floorMat.color.setHex(FLOOR_COLORS[b.dataset.floor]);
}));
document.querySelectorAll('[data-wall]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-wall]').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  wallMat.color.setHex(WALL_COLORS[b.dataset.wall]);
}));

/* ---------------- 1인칭 둘러보기 ---------------- */
const plControls = new PointerLockControls(camera, renderer.domElement);
const walkHint = document.getElementById('walk-hint');
const keys = {};
let walkMode = false;
let savedCam = null;

document.getElementById('btn-walk').addEventListener('click', () => walkHint.classList.remove('hidden'));
document.getElementById('btn-walk-start').addEventListener('click', () => {
  walkHint.classList.add('hidden');
  savedCam = { pos: camera.position.clone(), target: orbit.target.clone() };
  camera.position.set(3.2, 1.6, 4.0);
  orbit.enabled = false;
  walkMode = true;
  animView = null;
  plControls.lock();
});
plControls.addEventListener('unlock', () => {
  if (!walkMode) return;
  walkMode = false;
  orbit.enabled = true;
  if (savedCam) { camera.position.copy(savedCam.pos); orbit.target.copy(savedCam.target); }
});
addEventListener('keydown', e => keys[e.code] = true);
addEventListener('keyup', e => keys[e.code] = false);

const vel = new THREE.Vector3();
const HALF_W = W / 2 - 0.3, HALF_D = D / 2 - 0.3;

function updateWalk(dt) {
  if (!walkMode) return;
  const speed = 3.2;
  vel.x = ((keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0));
  vel.z = ((keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0));
  vel.normalize().multiplyScalar(speed * dt);
  plControls.moveRight(vel.x);
  plControls.moveForward(-vel.z);
  const p = camera.position;
  p.x = Math.max(-HALF_W, Math.min(HALF_W, p.x));
  p.z = Math.max(-HALF_D, Math.min(HALF_D, p.z));
  p.y = 1.6;
}

/* ---------------- 리사이즈 ---------------- */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ---------------- 렌더 루프 ---------------- */
const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);

  if (animView) {
    animView.t = Math.min(1, animView.t + dt * 1.6);
    const e = 1 - Math.pow(1 - animView.t, 3); // easeOutCubic
    camera.position.lerpVectors(animView.fromPos, animView.toPos, e);
    orbit.target.lerpVectors(animView.fromTarget, animView.toTarget, e);
    if (animView.t >= 1) animView = null;
  }

  updateWalk(dt);
  if (!walkMode) orbit.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

/* ---------------- 로딩 완료 ---------------- */
const barFill = document.getElementById('bar-fill');
let prog = 0;
const fake = setInterval(() => {
  prog = Math.min(100, prog + 12 + Math.random() * 18);
  barFill.style.width = prog + '%';
  if (prog >= 100) {
    clearInterval(fake);
    setTimeout(() => {
      document.getElementById('loader').classList.add('done');
      setTime(false);
      tick();
    }, 300);
  }
}, 120);
