# EMODELHOUSE — ○○ 아파트 84A

**○○ 아파트 84A 타입**(전용 84㎡ · 3Bay 판상형) 가상 모델하우스입니다. three.js 기반으로 별도 빌드 없이 GitHub Pages에 바로 배포됩니다. 평형 데이터는 예시값입니다.

## 🔴 라이브 데모
https://all-my-projects-2026.github.io/EMODELHOUSE/

### 평형 타입 (예시)
| 타입 | 전용/공급 | 구조 | 방/욕실 |
|---|---|---|---|
| 59A | 59.9 / 81.94㎡ | 3Bay 판상형 | 3 / 1 |
| **84A** | **84.9 / 114.49㎡** | **3Bay 판상형** | **3 / 2** |
| 84B | 84.9 / 114.87㎡ | 3Bay 판상형 | 3 / 2 |
| 101 | 101.9 / 137.56㎡ | 4Bay 판상형 | 4 / 2 |

**3D 뷰는 대표 평형 84A(3Bay 판상형)**: 남향 3베이(침실2·거실·안방) + LDK 대면형 주방 + 안방 드레스룸/전용욕실 + 공용욕실 + 현관.

## ✨ 기능
- **공간 투어** — 거실 / 주방·식당 / 안방 / 침실 / 욕실 카메라 자동 이동
- **타입 선택기** — 59A·84A·84B·101 실제 분양 데이터 표시
- **1인칭 둘러보기** — `WASD` + 마우스 (거실에서 시작)
- **낮/밤 조명** · **바닥재/벽지 실시간 교체**
- **모바일 반응형**

## 🖼 실제 사진(선택)
저작권 보호를 위해 마케팅 사진은 저장소에 포함하지 않았습니다. 실제 사진을 넣으려면 `assets/` 폴더에 이미지를 추가하고 갤러리 오버레이를 연결하세요. 3D 평면은 공개된 분양 스펙(전용면적·베이·룸 구성)을 참고자료로 삼아 재구성한 것입니다.

## 🪑 가구 (glTF 실물 에셋)
가구는 primitive가 아니라 **실제 glTF 3D 모델**입니다. [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit) (**CC0** — 재배포·상업이용 자유)의 glb 140종을 `assets/models/`에 포함했습니다.
- `GLTFLoader` 로드 → 바운딩박스 기반 **자동 실척 스케일 + 바닥 자동 안착**
- 로드 실패 시 기존 **primitive 가구로 자동 폴백**(`primitiveFurniture()`)
- 스타일: 저폴리(로우폴리). 포토리얼로 바꾸려면 `assets/models/`의 glb만 교체

## 🛠 기술 스택
three.js `r160` (CDN importmap) · GLTFLoader · OrbitControls · PointerLockControls · RoomEnvironment · 순수 정적 파일

## 📁 구조
```
index.html          UI · 타입 선택기 · importmap
style.css           스타일
main.js             84A 3Bay 평면 · glTF 가구 로더 · 인터랙션
assets/models/*.glb Kenney Furniture Kit (CC0)
.nojekyll           Pages Jekyll 비활성화
```

## 🚀 로컬 실행
```bash
npx serve .    # 또는  python -m http.server 8000
```

---
Made with three.js 🏢 · 평면은 공개 분양자료 기반 재구성
