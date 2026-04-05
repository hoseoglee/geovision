---
name: kanban
description: |
  칸반 AI 파이프라인 — Anima 연동형 자동 개발 사이클.
  기획/개발/리뷰/아이디어 4개 역할이 Anima의 교훈·패턴·선호를 소비하고,
  결과를 다시 Anima에 피드백하여 시스템이 함께 성장하는 선순환 구조.
  트리거: "칸반", "kanban", "파이프라인 실행", "칸반 에이전트"
  DO NOT TRIGGER: 단순 Trello 카드 조회, 칸반 UI 수정, 프론트엔드 개발
user_invocable: false
---

# Kanban Skill — Anima 연동형 자동 개발 사이클

## 개요

Trello 칸반 보드의 4개 역할(기획/개발/리뷰/아이디어)을 AI로 자동 실행하되,
Anima의 학습 장치들과 **양방향 연동**하여 매 사이클마다 시스템이 성장한다.

## 아키텍처

```
┌─────────────────────────────────────────────────┐
│                  server.js                       │
│  POST /api/kanban/agent {project, role}          │
│                    │                             │
│         ┌─────────▼──────────┐                   │
│         │   context.sh       │ ◄── Anima 읽기    │
│         │  (역할 + 컨텍스트  │                   │
│         │   조합)            │                   │
│         └─────────┬──────────┘                   │
│                   │ stdout → prompt              │
│         ┌─────────▼──────────┐                   │
│         │   agent-worker.py  │                   │
│         │  (claude -p)       │                   │
│         └─────────┬──────────┘                   │
│                   │ result                       │
│         ┌─────────▼──────────┐                   │
│         │   feedback.sh      │ ──► Anima 쓰기    │
│         │  (결과 → 교훈/     │                   │
│         │   패턴/지식)       │                   │
│         └────────────────────┘                   │
└─────────────────────────────────────────────────┘
```

## 역할별 워크플로우

### 기획 (Planning)

**입력**: 프로젝트 아키텍처, 요구사항, 기존 카드
**Anima 소비**:
- `lessons.md` — 과거 기획 실수 (범위 과대, 요구사항 누락 등)
- `developer_patterns.md` — 프로젝트 유형별 전략
- `아키텍처.md` 요구사항 섹션 — 기존 요구사항과 중복 방지
- `records/` 최근 3개 보고서 — 최근 작업 흐름 파악

**출력**: 기획 카드 생성 (최대 5개)
**Anima 피드백**:
- 새 카드 제목 → `아키텍처.md` 요구사항 섹션에 추가

### 개발 (Development)

**입력**: 개발 컬럼 카드 (제목 + 설명 + 댓글)
**Anima 소비**:
- `lessons.md` (technical) — 기술적 실수 반복 방지
- `developer_patterns.md` — 함정 목록, 효과적 패턴
- `preferences.md` — 코딩 컨벤션
- **카드 댓글** — 리뷰 반려 시 검증 의견 포함 (재작업 시 핵심)

**출력**: 코드 구현 + 리뷰 컬럼으로 이동
**Anima 피드백**:
- 구현 중 발견한 패턴 → `developer_patterns.md`
- 프로젝트 지식 → `_knowledge.md`

### 리뷰 (Review/Verification)

**입력**: 리뷰 컬럼 카드 + git log + 코드
**Anima 소비**:
- `lessons.md` — 과거 실수 패턴 = 검증 체크리스트
- `developer_patterns.md` (함정 목록) — 알려진 트랩 집중 점검
- `preferences.md` — 사용자 선호 위반 검증

**출력**: pass → 완료 / fail → 개발로 되돌림
**Anima 피드백 (fail 시)**:
- 반려 사유 → `lessons.md` 새 교훈 기록
- 반복 fail (2회+) → `developer_patterns.md` 함정 목록 추가
**Anima 피드백 (pass 시)**:
- 검증 통과한 설계 결정 → `_knowledge.md`
- **완료보고서 자동 작성** → `work_report` 스킬로 보고서 생성 + papyrus push + 텔레그램 알림

### 아이디어 (Ideas)

**입력**: 프로젝트 현황
**Anima 소비**:
- `lessons.md` (effective) — 효과적 패턴에서 영감
- `records/` 최근 보고서 — 최근 완료된 작업에서 확장
- `developer_patterns.md` — 알려진 한계에서 해결 아이디어

**출력**: 아이디어 카드 생성 (최대 5개)
**Anima 피드백**: 없음 (아이디어 단계는 소비 전용)

## Activity Log + 회고 시스템

### 데이터 흐름
```
server.js (kanbanJobDone)
  → appendActivityLog()
  → ~/papyrus/records/kanban/YYYY-MM-DD.jsonl  (일별 JSONL)
      ↓
retro.sh (주간 또는 수동)
  → 통계 분석 (역할별 건수, 성공률, 평균 시간, 재작업 등)
      ↓
회고 보고서 + insights.md 갱신
  → context.sh가 insights.md를 프롬프트에 주입
  → 다음 칸반 사이클에 반영
```

### JSONL 로그 필드
`id`, `traceId`, `role`, `project`, `cardId`, `cards`, `startedAt`, `completedAt`, `durationMs`, `status`, `verdict`, `error`, `workerDurationMs`, `outputSummary`

### 회고 트리거
- **주간 자동**: weekly_report 스킬과 연동
- **수동**: `bash retro.sh [일수]`로 통계 확인 후 AI가 회고 보고서 작성
- **즉시**: 같은 카드 fail 3회 시 알림

## 파일 구조

```
~/.anima/soul/skills/kanban/
├── SKILL.md              # 이 문서
├── context.sh            # Anima 컨텍스트 수집 → stdout
├── feedback.sh           # 결과 → Anima 피드백 (lessons, patterns, knowledge)
├── retro.sh              # JSONL 분석 → 회고 통계 출력
└── prompts/
    ├── 기획.md           # 기획 역할 지침
    ├── 개발.md           # 개발 역할 지침
    ├── 리뷰.md           # 리뷰 역할 지침
    └── 아이디어.md       # 아이디어 역할 지침

~/papyrus/records/kanban/
├── YYYY-MM-DD.jsonl      # 일별 Activity Log
├── insights.md           # 회고 인사이트 (context.sh가 읽음)
└── weekly/
    └── YYYY-WNN_칸반회고.md  # 주간 회고 보고서
```

## server.js 연동

```js
// 기존: 하드코딩 프롬프트
const prompt = buildCreatePrompt(role, ...);

// 변경: context.sh로 프롬프트 조립
const context = execSync(
  `bash ~/.anima/soul/skills/kanban/context.sh "${role}" "${project}" "${cardId}"`,
  { encoding: 'utf-8', timeout: 10000 }
);

// 결과 피드백
execSync(
  `bash ~/.anima/soul/skills/kanban/feedback.sh "${role}" "${verdict}" "${project}" "${cardId}" "${note}"`,
  { timeout: 10000 }
);
```

## 검증 기준 (METR)

- [ ] context.sh가 역할별 프롬프트 + Anima 컨텍스트를 올바르게 조합하는가
- [ ] 리뷰 fail 시 lessons.md에 교훈이 기록되는가
- [ ] 리뷰 fail → 개발 재작업 시 이전 검증 의견이 프롬프트에 포함되는가
- [ ] 반복 fail (2회+) 시 developer_patterns.md에 함정이 추가되는가
- [ ] pass 시 _knowledge.md에 설계 결정이 기록되는가
- [ ] pass 시 완료보고서가 자동 작성되는가 (work_report 스킬, papyrus push, 텔레그램 알림)
- [ ] 기획 시 기존 요구사항과 중복되지 않는가
- [ ] 프롬프트 파일 수정만으로 역할 지침을 변경할 수 있는가
- [ ] kanbanJobDone 시 JSONL 로그가 기록되는가
- [ ] retro.sh가 JSONL을 분석하여 정확한 통계를 출력하는가
- [ ] context.sh가 insights.md를 프롬프트에 포함하는가
