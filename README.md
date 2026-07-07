# EMODELHOUSE

three.js로 만든 **인터랙티브 가상 모델하우스** 템플릿입니다. 외부 3D 에셋 없이 primitive로 구성되어 있어 별도 빌드/설치 없이 정적 호스팅(GitHub Pages)에 바로 배포됩니다.

## 🔴 라이브 데모
https://all-my-projects-2026.github.io/EMODELHOUSE/

## ✨ 기능
- **4개 공간 투어** — 거실 / 주방 / 침실 / 욕실 (버튼 클릭 시 카메라 자동 이동)
- **1인칭 둘러보기** — `WASD` 이동 + 마우스 시선 (PointerLock)
- **낮 / 밤 조명 전환** — 태양광 ↔ 천장등
- **바닥재 / 벽지 실시간 교체** — 오크·월넛·그레이·화이트 / 아이보리·웜그레이·민트·블루
- **오빗 컨트롤** — 드래그 회전, 휠 확대, 우클릭 이동
- **모바일 반응형 UI**

## 🛠 기술 스택
- [three.js](https://threejs.org) `r160` (CDN + importmap)
- OrbitControls · PointerLockControls · RoomEnvironment
- 순수 정적 파일 (HTML / CSS / JS) — 번들러 불필요

## 📁 구조
```
index.html    # 마크업 + UI + importmap
style.css     # UI 스타일
main.js       # 3D 씬 · 가구 · 인터랙션
.nojekyll     # GitHub Pages Jekyll 비활성화
```

## 🚀 로컬 실행
importmap(ES Module) 사용으로 `file://` 직접 열기는 안 되고 로컬 서버가 필요합니다.
```bash
npx serve .
# 또는
python -m http.server 8000
```

## 📦 커스터마이징
- 평면/가구: `main.js` 하단 `배치` 섹션에서 좌표 수정
- 방 카메라: `VIEWS` 객체
- 색상 옵션: `FLOOR_COLORS` / `WALL_COLORS`
- 실제 사진급 퀄리티가 필요하면 `main.js`의 primitive 가구를 `GLTFLoader`로 불러온 glTF 모델로 교체하세요.

---
Made with three.js 🏠
