---
name: kanban_manager
description: |
  칸반 보드 관리 + 작업 요청 자동 디스패칭 스킬.
  사용자의 개발/기능 요청을 받으면 → 프로젝트 자동 감지 → 카드 생성 → 개발 칼럼 이동 → 칸반 에이전트 자동 트리거.
  보드 조회, 카드 관리, 상태 확인도 수행.
  트리거: "칸반 상태", "카드 만들어", "카드 이동", "보드 보여줘", "칸반 현황", "kanban status", "트렐로", "칸반 정리"
  DO NOT TRIGGER: 칸반 파이프라인 자동 실행(→ kanban), 칸반 UI 수정(→ developer), 프론트엔드 개발
user_invocable: true
---

# Kanban Manager — Trello 보드 관리 + 자동 디스패칭

## 개요

사용자의 작업 요청을 받으면:
1. **프로젝트 자동 감지** — 요청 내용에서 프로젝트명 추출 (geovision, hermes, argos 등)
2. **Trace ID 자동 생성** — 해당 프로젝트의 기존 최대 번호 + 1
3. **Trello 카드 생성** — 기획 칼럼에 카드 생성 + 프로젝트 라벨 자동 매칭
4. **개발 칼럼 이동** — 사용자가 승인하면 즉시 개발로 이동 → 칸반 에이전트 자동 트리거

`kanban` 스킬(파이프라인 자동 실행)과는 달리, **사용자의 요청을 카드화하고 디스패칭**하는 역할.

## 자동 디스패칭 흐름

```
사용자: "geovision에 dark vessel 기능 추가해줘"
    ↓
1. 프로젝트 감지: geovision
2. Trace ID: GEO-040 (기존 최대 GEO-039 + 1)
3. 카드 생성: "GEO-040: Dark Vessel Detection" → 기획 칼럼
4. 라벨: geovision (pink)
5. 개발 칼럼으로 이동 → 칸반 에이전트 자동 트리거
```

## 프로젝트 자동 감지 규칙

사용자 요청에서 아래 키워드를 감지하여 프로젝트를 판별한다:

| 키워드 | 프로젝트 | 라벨 ID |
|--------|----------|---------|
| geovision, geo, 지오, 위성, 지구본, CCTV, 선박 | geovision | 69b9425861eaba200cb2e815 |
| hermes, 에르메스, 대시보드, 터미널, 칸반UI | hermes | 69bfd449b2bedc651ef04352 |
| argos, 아르고스, 감시, 모니터링, probe | argos | 69bf48fe6bbfae7855253e3e |
| pilot, 파일럿, 업무대행, 스크린에이전트 | pilot | 69d27a86ea410a09f67b4916 |
| n8n, 워크플로우, 자동화 | n8n | 69bfdb990802ca9e0caa5098 |
| game, 게임, ai-test-game | ai-test-game | 69ca23570449ff8b4c5c750f |
| anima, 애니마, 스킬, 동기화 | anima-worker | 69b94255864d47f11441eabd |

감지 실패 시 사용자에게 프로젝트를 물어본다.

## Trace ID 자동 생성

```bash
# 기존 카드에서 프로젝트 접두사의 최대 번호 찾기
curl -s "https://api.trello.com/1/boards/${BOARD_ID}/cards?key=${KEY}&token=${TOKEN}&fields=name" \
  | python3 -c "
import sys, json, re
cards = json.load(sys.stdin)
prefix = 'GEO'  # 프로젝트별 변경
nums = [int(m.group(1)) for c in cards if (m := re.match(f'{prefix}-(\\d+)', c['name']))]
print(f'{prefix}-{max(nums)+1:03d}' if nums else f'{prefix}-001')
"
```

## 설정

```bash
TRELLO_KEY=$(~/.anima/scripts/secret.sh get trello.api_key)
TRELLO_TOKEN=$(~/.anima/scripts/secret.sh get trello.token)
BOARD_ID="69b94251089f487ce48ed92a"  # Anima Projects 보드
```

## 칼럼 ID

| 칼럼 | ID | 설명 |
|------|-----|------|
| 기획 | 69b94253a128665d3005aaf9 | 기획 완료 대기 |
| 개발 | 69b9425368883a48a9bbfb4a | 개발 진행 중 |
| 리뷰 | 69b9425419bafcceacee4e89 | 코드 리뷰 대기 |
| 펜딩 | 69babfd2c415a34d67f77696 | 보류 |
| 아이디어 | 69b942543317e9e9e0488945 | 아이디어 수집 |
| 완료 | 69ba03fe4dd3a3aaff34e395 | 완료됨 |
| 휴지통 | 69c6798a4b9e4676893a7950 | 삭제됨 |

## 지원 명령

### 1. 보드 현황 조회
사용자가 "칸반 현황", "보드 보여줘", "kanban status" 요청 시:

```bash
# 칼럼별 카드 수 + 프로젝트별 분류
curl -s "https://api.trello.com/1/boards/${BOARD_ID}/lists?cards=open&key=${KEY}&token=${TOKEN}"
```

출력 형식:
```
📋 칸반 보드 현황
| 칼럼 | 카드 수 | 프로젝트 |
|------|---------|----------|
| 기획 | 3 | geovision(3) |
| 개발 | 2 | geovision(2) |
| 리뷰 | 1 | hermes(1) |
| 완료 | 15 | ... |
```

### 2. 카드 생성
사용자가 "카드 만들어", "태스크 추가" 요청 시:

필수 정보:
- **제목**: Trace ID 포함 (예: `GEO-040: 기능명`)
- **칼럼**: 기본 "기획" (사용자 지정 가능)
- **라벨**: 프로젝트명 라벨 자동 매칭
- **설명**: 목적/기대효과/범위/수용기준 템플릿

```bash
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "key=${KEY}&token=${TOKEN}" \
  -d "idList=${LIST_ID}" \
  --data-urlencode "name=${TITLE}" \
  --data-urlencode "desc=${DESC}" \
  -d "idLabels=${LABEL_ID}"
```

### 3. 카드 이동
사용자가 "카드 이동", "개발로 옮겨" 요청 시:

```bash
curl -s -X PUT "https://api.trello.com/1/cards/${CARD_ID}" \
  -d "key=${KEY}&token=${TOKEN}" \
  -d "idList=${TARGET_LIST_ID}"
```

주의: 개발 칼럼으로 이동 시 칸반 에이전트가 자동 트리거됨.

### 4. 프로젝트별 카드 조회
사용자가 "geovision 카드 보여줘", "hermes 진행 상황" 요청 시:

```bash
# 라벨로 필터링
curl -s "https://api.trello.com/1/boards/${BOARD_ID}/cards?key=${KEY}&token=${TOKEN}" \
  | jq '[.[] | select(.labels[].name == "geovision")]'
```

### 5. 카드 정리
사용자가 "칸반 정리", "완료된 카드 아카이브" 요청 시:

- 완료 칼럼의 7일 이상 된 카드 → 아카이브
- 휴지통 카드 → 삭제

### 6. 고아 카드 감지
개발 칼럼에 있지만 에이전트가 붙지 않은 카드 감지:

```bash
# 개발 칼럼 카드 중 최근 24시간 내 액티비티 없는 것
```

## 라벨 매핑 (주요 프로젝트)

| 프로젝트 | 라벨 ID |
|----------|---------|
| geovision | 69b9425861eaba200cb2e815 |
| hermes | 69bfd449b2bedc651ef04352 |
| argos | 69bf48fe6bbfae7855253e3e |
| anima-worker | 69b94255864d47f11441eabd |
| ai-test-game | 69ca23570449ff8b4c5c750f |
| n8n | 69bfdb990802ca9e0caa5098 |
| pilot | 69d27a86ea410a09f67b4916 |

## Trace ID 규칙

- 프로젝트별 접두사: `GEO-`, `HERMES-`, `ARGOS-`, `AITE-`, `N8N-`, `PILOT-`
- 번호는 해당 프로젝트의 기존 최대 번호 + 1
- 예: geovision의 마지막이 GEO-038이면 다음은 GEO-039

## 검증 기준

- [ ] Trello API 키/토큰이 정상 동작하는가
- [ ] 카드 생성 시 라벨이 자동 매칭되는가
- [ ] 카드 이동 시 올바른 칼럼으로 이동하는가
- [ ] 보드 현황이 프로젝트별로 그룹화되어 표시되는가
