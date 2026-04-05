---
name: designer
description: |
  UI/UX 디자인 스킬. 웹 프론트엔드 디자인 가이드라인을 적용하여 일관성 있고 보기 좋은 UI를 만든다.
  트리거: "디자인해줘", "UI 만들어", "페이지 만들어", "화면 만들어", "designer", "디자인 스킬", "예쁘게 만들어", "보기 좋게"
  DO NOT TRIGGER: 백엔드 API만 수정, 단순 버그 수정, 기존 UI에서 텍스트만 수정
user_invocable: true
---

# Designer 스킬

UI/UX 디자인 가이드라인을 적용하여 일관성 있고 세련된 웹 프론트엔드를 만드는 스킬.

## 트리거
'디자인해줘', 'UI 만들어', '페이지 만들어', '화면 만들어', 'designer', '디자인 스킬', '예쁘게 만들어', '보기 좋게', 'UI 개선', '레이아웃 잡아줘'

## DO NOT TRIGGER
백엔드 API만 수정, 단순 버그 수정, 기존 UI에서 텍스트만 수정, 로고/아이콘 에셋 제작

## 사용 시점

### 직접 호출 (사용자가 명시적으로 요청)
- "페이지 만들어", "UI 디자인해줘", "화면 추가해줘", "보기 좋게 만들어"

### 자동 참조 (다른 스킬에서 UI 작업 시 디자인 시스템만 참조)
- `developer` 스킬로 프론트엔드 코드를 작성할 때 → 이 스킬의 컬러/컴포넌트 패턴을 적용
- `create_project`로 웹 프로젝트를 생성할 때 → 초기 UI 구조에 디자인 시스템 적용
- 어떤 작업이든 `.tsx`, `.css`, 프론트엔드 컴포넌트를 신규 생성하거나 대폭 수정할 때

### 프로젝트별 확장
- 새 프로젝트에서 UI를 만들 때는 해당 프로젝트의 기존 UI를 먼저 읽고, 없으면 이 디자인 시스템을 기본값으로 사용
- 프로젝트에 디자인 시스템이 이미 있으면 (예: 라이트 테마, 다른 색상) 그것을 우선 따르되, 이 스킬의 레이아웃/컴포넌트 패턴은 참고

## 디자인 시스템 (Hermes 기준)

### 컬러 팔레트
- **배경**: zinc-950 (메인), zinc-900 (카드/패널), zinc-800/50 (코드블록)
- **텍스트**: zinc-100 (제목), zinc-200 (본문), zinc-400 (보조), zinc-500 (힌트), zinc-600 (비활성)
- **강조**: amber-500 (주 액센트), amber-500/10 (버튼 배경), amber-500/20 (호버)
- **상태색**:
  - 성공/온라인: emerald-500, emerald-400 (텍스트), emerald-500/10 (배경)
  - 경고/대기: amber-400 (텍스트), amber-500/10 (배경)
  - 에러/실패: red-400 (텍스트), red-500/10 (배경), red-900/20 (배경 진함)
  - 정보/진행: blue-400 (텍스트), blue-500/10 (배경)
- **카테고리 색상** (Anima 등 타입 구분 시):
  - 보라 (persona): purple-500/5, purple-500/20, purple-400
  - 앰버 (skill): amber-500/5, amber-500/20, amber-400
  - 파랑 (lesson): blue-500/5, blue-500/20, blue-400
  - 에메랄드 (memory): emerald-500/5, emerald-500/20, emerald-400
  - 핑크 (preference): pink-500/5, pink-500/20, pink-400
  - 시안 (vessel): cyan-500/5, cyan-500/20, cyan-400

### 레이아웃 원칙

#### 컨테이너 max-width 전략 (IMPORTANT)
화면 폭이 들쑥날쑥해지지 않도록, **모든 페이지에 공통 래퍼**를 적용하고 콘텐츠 유형별 inner max-width를 지정한다.

| 콘텐츠 유형 | max-width | Tailwind | 이유 |
|------------|-----------|----------|------|
| 페이지 래퍼 (공통) | 1280px | `max-w-screen-xl mx-auto` | 와이드 모니터에서 양옆 여백 확보 |
| 본문 텍스트 | 65~75ch (~680px) | `max-w-prose` | 가독성 최적 글줄 길이 |
| 카드/리스트 그리드 | 1200px | `max-w-6xl` | 한 행에 3~4열 유지 |
| 대시보드/테이블 | 1400px 또는 full | `max-w-7xl` 또는 `w-full` | 데이터 밀도 필요 시 |
| 폼/입력 영역 | 480~600px | `max-w-lg` | 시선 이동 최소화 |
| 명령창/검색 | 768px | `max-w-3xl` | 중앙 집중 입력 |

- **필수**: 페이지 최상위에 `max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8` 래퍼 적용
- **같은 depth의 컨테이너는 동일한 width 규칙** 사용 — 형제 섹션끼리 폭이 다르면 안 됨
- **사이드바 레이아웃**: 사이드바는 고정폭(`w-64`), 메인 영역만 유동(`flex-1 min-w-0`)
- 와이드 모니터(2560px+)에서도 콘텐츠가 화면 끝까지 늘어나지 않도록 상한선 지정

#### 간격 시스템
- **패딩**: px-6 py-8 (메인 콘텐츠), px-5 py-4 (카드 헤더), px-4 py-3 (입력 영역)
- **간격**: gap-4 (그리드), space-y-3 (리스트), mb-6~8 (섹션)

### 반응형 디자인 (IMPORTANT)
사용자의 실제 기기 3종에 맞춰 설계한다:

| 기기 | 화면 | CSS 뷰포트 | 브레이크포인트 | 컬럼 | 패딩 |
|------|------|-----------|-------------|------|------|
| 갤럭시 S26 | ~6.2" | 360×800 | `< 640px` (모바일) | 1열 | 16px (`px-4`) |
| iPad Air 13" | 13" | 1024×1366 | `640~1279px` (태블릿) | 2열 | 24px (`px-6`) |
| PC (데스크톱) | 모니터 | 1920×1080+ | `≥ 1280px` (데스크톱) | 3~4열 | 32px (`px-8`) |

- **모바일 (< 640px)**: 1컬럼 레이아웃, 터치 타겟 44px 이상, 하단 네비게이션, 스와이프 제스처 고려
- **태블릿 (640~1279px)**: 2컬럼 그리드, 사이드바 접을 수 있게, portrait/landscape 양방향 대응
- **데스크톱 (≥ 1280px)**: max-width 래퍼 안에서 3~4컬럼 그리드, 풀 사이드바, 마우스 호버 인터랙션. **콘텐츠는 반드시 max-w-screen-xl 안에서 가운데 정렬**
- **CSS 브레이크포인트**: `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`
- **필수 테스트**: 모든 UI 작업 시 360px, 1024px, 1920px 세 뷰포트에서 레이아웃이 깨지지 않는지 확인
- **터치 vs 마우스**: 모바일/태블릿은 hover 없음. `:hover` 스타일은 `@media (hover: hover)`로 감싸거나, 터치에서도 동작하는 대안 제공

#### 반응형 래퍼 참조 코드
```tsx
{/* 모든 페이지의 최상위 래퍼 */}
<div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
  {children}
</div>
```

### 컴포넌트 패턴

#### 카드
```
rounded-xl border border-zinc-800 bg-zinc-900 p-5
hover: hover:border-zinc-700 transition-colors
```

#### 버튼 (주)
```
rounded-lg bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-500
hover: hover:bg-amber-500/20
disabled: disabled:opacity-30
```

#### 버튼 (보조)
```
rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300
hover: hover:bg-zinc-700
```

#### 입력
```
rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200
placeholder: placeholder-zinc-600
focus: outline-none focus:border-amber-500/50
```

#### 배지/태그
```
rounded-full border px-2 py-0.5 text-xs
// 색상 조합: border-{color}-500/20 bg-{color}-500/10 text-{color}-400
```

#### 모달
```
fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm
// 모달 바디: rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl
```

#### 고정 바 (CommandBar)
```
fixed bottom-0 left-0 right-0 z-40
border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md
```

#### 타임라인
```
relative border-l-2 border-zinc-800 pl-6 space-y-4
// 도트: absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-zinc-950 bg-{color}
```

#### 상태 인디케이터 (온라인/오프라인)
```
inline-block h-2.5 w-2.5 rounded-full
// online: bg-emerald-500, offline: bg-zinc-600
```

### 폰트
- **본문**: 시스템 폰트 (Geist Sans)
- **코드/터미널**: font-mono (Geist Mono)
- **크기**: text-xs (배지, 보조), text-sm (본문, 버튼), text-lg/xl/2xl (제목)

### 아이콘
- SVG inline, width/height 16~20, stroke="currentColor" strokeWidth="2"
- strokeLinecap="round" strokeLinejoin="round"
- heroicons 경로 패턴 사용

### 상호작용 패턴
- **호버**: transition-colors, hover:bg-zinc-800, hover:border-zinc-700
- **포커스**: focus:border-amber-500/50, focus-within:border-amber-500/40
- **비활성**: disabled:opacity-30
- **로딩**: "Loading..." 텍스트 또는 "전송 중..." 상태
- **실시간 업데이트**: WebSocket 우선 + HTTP 폴링 폴백

### 네비게이션
- 상단 고정 헤더: border-b border-zinc-800 px-6 py-4
- 탭 스타일 네비게이션: rounded-lg px-3 py-1.5
- 활성 탭: bg-amber-500/10 text-amber-500

## 워크플로우

1. **대상 파악**: 어떤 페이지/컴포넌트를 만들거나 수정할지 확인
2. **기존 패턴 참조**: 해당 프로젝트의 기존 UI 컴포넌트/페이지를 읽어서 일관성 유지
3. **디자인 시스템 적용**: 위 가이드라인의 색상, 레이아웃, 컴포넌트 패턴을 적용
4. **반응형 확인**: sm/lg 브레이크포인트에서 레이아웃이 자연스러운지 확인
5. **실시간 연동**: WebSocket이 필요하면 기존 패턴(wsRef, onmessage 핸들러) 따르기
6. **빌드 확인**: Docker 빌드하여 TypeScript 에러 없는지 확인

## 프로젝트별 적용 노트

### Hermes (project_hermes)
- Next.js App Router + Tailwind CSS
- 다크 테마 전용 (라이트 모드 없음)
- WebSocket 실시간 업데이트 필수
- 글로벌 CommandBar가 layout.tsx에 이미 포함됨 — 모든 페이지에 pb-16 필요
- Docker 빌드: `docker compose up -d --build hermes`

## 검증 기준
- [ ] 기존 디자인 시스템 색상/간격과 일치
- [ ] 반응형 레이아웃 — 360px(갤럭시S26), 1024px(iPadAir13), 1920px(PC) 세 뷰포트 확인
- [ ] 다크 테마 일관성
- [ ] 인터랙션 피드백 (호버, 포커스, 로딩, 비활성)
- [ ] TypeScript 빌드 에러 없음
- [ ] WebSocket 실시간 업데이트 연동 (해당 시)
