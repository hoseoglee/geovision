---
name: anima
description: |
  Anima 시스템 관리의 단일 진입점. 스킬 생성·개선·효율화, 교훈 관리 중앙화, 동기화 규약, 스킬 건강 대시보드, **시스템 진단·개선(국무총리)** 을 담당한다.
  트리거: "스킬 만들어", "스킬 생성", "스킬 개선", "스킬 효율화", "스킬 점검", "anima", "스킬 관리", "스킬 건강", "스킬 상태", "애니마 관리", "국무총리", "시스템 개선", "시스템 진단", "시스템 점검", "인프라 점검", "시스템 전문가"
  DO NOT TRIGGER: 특정 스킬의 실행 요청(→ 해당 스킬 직접 호출), "anima 동기화해/풀/상태"(→ persona.md의 동기화 규칙), 단순 스킬 목록 조회
user_invocable: true
---

# Anima Skill

Anima 시스템 관리의 **단일 진입점**. 스킬 생성·개선·효율화, 교훈 관리 중앙화, 동기화 규약, **시스템 진단·개선(국무총리)**을 담당한다.

> 별칭: **국무총리** — 제우스(사용자)를 보좌하여 Anima 시스템과 인프라를 총괄 관리한다.

## 사용법

```
/anima create <skill_name> <description>
/anima improve [--skill <name>] [--all]
/anima optimize [--skill <name>] [--all]
/anima health [--skill <name>]
/anima audit
/anima reflect [--weeks N]
/anima diagnose [--project <name>]    # 국무총리: 시스템 진단
/anima improve-system [--project <name>]  # 국무총리: 진단 + 개선 실행
/anima audit-skills                   # 국무총리: 스킬 역할 감사
```

## 검증 기준

- [ ] create: 표준 템플릿으로 SKILL.md 생성, DO NOT TRIGGER 포함, 검증 기준 포함
- [ ] improve: 보고서 회고 + lessons.md에서 개선 포인트 추출, 수정안 diff 제시
- [ ] optimize: 토큰/구조/중복 분석 결과 제시, 구체적 최적화 제안
- [ ] health: 스킬별 품질 지표 대시보드 출력
- [ ] audit: 트리거 충돌 감지, DO NOT TRIGGER 누락 스킬 식별
- [ ] reflect: 교훈 분류별 빈도, 반복 패턴, 개선 추이, 승격 후보 출력
- [ ] 모든 SKILL.md 수정은 사용자 승인 후 적용
- [ ] 수정 후 sync.sh push 실행

---

## 교훈 관리 중앙화

교훈(lessons.md) 관련 **책임 분배**를 명확히 정의한다.

| 역할 | 담당 | 설명 |
|------|------|------|
| **교훈 기록** | persona.md 학습 하네스 | 사용자 교정·실수 시 즉시 lessons.md에 기록 (모든 상호작용에 적용) |
| **교훈 데이터 제공** | work_report | 보고서 회고에서 교훈 추출 → lessons.md에 추가/갱신 |
| **교훈 집계/분석** | weekly_report | 주간 분류별 빈도, 반복 패턴, 개선 추이 |
| **교훈 → 스킬 반영** | **/anima improve** | 2회+ 반복 교훈을 SKILL.md 수정안으로 변환 |
| **교훈 → 규칙 승격** | persona.md 규칙 | 적용 확인 3회+ 시 persona.md에 정식 규칙으로 승격 |

**원칙**: 교훈을 *기록하는 곳*은 여러 곳이지만, *스킬에 반영하는 곳*은 `/anima improve` 하나뿐이다.

---

## 동기화 규약

모든 스킬이 따르는 표준 동기화 패턴.

```
작업 완료 후 동기화:
1. Papyrus 파일 변경 시: cd ~/papyrus && git add -A && git commit -m "{type}: {desc}" && git push origin main
2. Anima 파일 변경 시: ~/.anima/sync.sh push
3. 둘 다 변경 시: Papyrus 먼저, 그 다음 sync.sh push (sync.sh가 papyrus도 처리하므로 push만 해도 됨)
```

**스킬별 동기화 필요 여부:**

| 상황 | 동기화 |
|------|--------|
| SKILL.md 수정 | `sync.sh push` |
| papyrus에 문서 저장 | papyrus git push (또는 `sync.sh push`) |
| lessons.md 갱신 | `sync.sh push` |
| 위 조합 | `sync.sh push` 한 번이면 충분 (papyrus 포함) |

---

## 서브커맨드

### /anima create <skill_name> <description>

표준 템플릿으로 새 스킬을 생성한다.

**워크플로우:**

1. **중복 검사**
   - 기존 스킬의 description/트리거와 새 스킬의 기능이 겹치는지 확인
   - 겹침 발견 시 사용자에게 알리고 진행 여부 확인
   - `~/.anima/soul/skills/*/SKILL.md`의 description 섹션을 모두 읽어 비교

2. **템플릿 생성**
   - `~/.anima/soul/skills/{skill_name}/SKILL.md` 생성
   - 표준 템플릿:

```markdown
---
name: {skill_name}
description: |
  {description}.
  트리거: "{한국어 트리거1}", "{한국어 트리거2}", "{영어 트리거}"
  DO NOT TRIGGER: {조건}. {대안 스킬 안내: → developer, → research 등}
user_invocable: true
---

# {Skill Name} Skill

{1-2문장 개요}

## 사용법

/{skill_name} <인자> [--옵션]

## 검증 기준

- [ ] {측정 가능한 성공 조건}

## 워크플로우

### 1. {단계명}
- {구체적 행동 — 명령형}

## 제약 조건
- {이 스킬이 하지 않는 것}

## 핵심 원칙
- **{원칙}**: {설명}

## 스킬 의존성
- {호출하는 스킬}: {상황}

## 변경 이력
| 날짜 | 변경 내용 | 트리거 |
|------|----------|--------|
| {today} | 초기 생성 | /anima create |
```

3. **품질 체크**
   - DO NOT TRIGGER 포함 확인
   - 검증 기준 포함 확인
   - 트리거 문구 기존 스킬과 충돌 없음 확인
   - 500줄 이하 확인

4. **사용자 검토** → 수정 요청 반영

5. **배포** → `sync.sh push`

**생성 원칙:**
- 성공 기준을 워크플로우 앞에 배치
- 명령형으로 작성: "분석한다" (O) vs "분석하면 좋겠습니다" (X)
- 제약 조건과 핵심 원칙을 분리

---

### /anima improve [--skill <name>] [--all]

보고서 회고와 lessons.md에서 개선 포인트를 추출하여 스킬을 개선한다.

**워크플로우:**

1. **데이터 수집** (병렬 Agent)
   ```
   ├─ Agent A: ~/papyrus/records/ 최근 보고서 10건의 회고 섹션 분석
   │   - "개선할 점"에서 스킬명 추출
   │   - "교훈 기록"에서 반복 패턴 식별
   │
   └─ Agent B: ~/.anima/soul/memory/lessons.md 분석
       - 같은 분류 교훈 2회+ 반복 항목 추출
       - 적용 실패 기록 항목 추출
       - effective 분류에서 미반영 패턴 추출
   ```

2. **개선 포인트 분류**
   ```
   🔍 스킬 개선 분석 결과

   🔴 즉시 수정 (같은 교훈 2회+ 반복)
     1. [work_report] 보고서 누락 3회 반복 → 강제 체크포인트 추가

   🟠 권장 수정 (보고서 회고에서 추출)
     2. [developer] Scaffold 체크리스트 보강 필요

   🟡 효과적 패턴 미반영
     3. [research] 병렬 에이전트 활용 패턴 미반영

   수정할 항목 번호를 선택하세요 (예: 1,2 또는 all):
   ```

3. **수정안 생성** → SKILL.md diff 제시

4. **적용** → 사용자 승인 → 수정 → 변경 이력 추가 → `sync.sh push`

**개선 트리거:**

| 트리거 | 조건 | 행동 |
|--------|------|------|
| 즉시 | 같은 교훈 2회 반복 | SKILL.md 수정안 자동 생성 |
| 정기 | 주간 보고서 시 | 전체 스킬 검토 제안 |
| 이벤트 | 사용자 지적 | 해당 스킬 즉시 검토 |

---

### /anima optimize [--skill <name>] [--all]

스킬의 토큰 효율, 구조, 중복을 분석하여 최적화한다.

**워크플로우:**

1. **분석** (병렬 Agent)
   ```
   ├─ Agent A: 토큰 효율 — 줄 수, 반복/중복, references/ 분리 가능성
   ├─ Agent B: 구조 — 템플릿 준수, 검증 기준 위치, DO NOT TRIGGER 유무
   └─ Agent C: 의존성/중복 — 스킬 간 겹침, 트리거 충돌, 미사용 스킬
   ```

2. **최적화 제안** → 심각도별 번호 목록 제시

3. **적용** → 사용자 승인 → 수정 → `sync.sh push`

**효율화 원칙:**
- **500줄 규칙**: 초과 시 references/ 하위 파일로 분리
- **계층적 프롬프트**: Layer 0 식별 → Layer 1 워크플로우 → Layer 2 상세 → Layer 3 참조
- **SubAgent 요약 반환**: Agent 결과는 요약으로 반환하여 토큰 절약

---

### /anima health [--skill <name>]

스킬 건강 대시보드를 출력한다.

**워크플로우:**

1. **데이터 수집** (병렬)
   ```
   ├─ Agent A: 보고서에서 스킬별 사용 빈도 + 검증 통과율
   └─ Agent B: 스킬별 구조 점수 (DO NOT TRIGGER 10점, 검증기준 10점, 500줄이하 10점, 변경이력 5점, 의존성 5점, 제약분리 5점, 명령형 5점 = 50점 만점)
   ```

2. **대시보드 출력**
   ```
   🏥 Anima 스킬 건강 대시보드

   | 스킬 | 사용빈도 | 구조점수 | 교훈반복 | 상태 |
   |------|---------|---------|---------|------|
   | developer | ██████ 12회 | 45/50 | 0건 | ✅ |
   | work_report | █████ 10회 | 35/50 | 3건 | ⚠️ |
   | ...

   ⚠️ 주의: work_report (교훈 3건 반복)
   💤 미사용: triframe, knowledge_map
   ```

3. **특정 스킬 상세** (`--skill name`) → 구조점수 항목별 상세 + 최적화 제안

---

### /anima audit

전체 스킬 시스템의 일관성과 품질을 감사한다.

**워크플로우:**

1. **전수 검사** (병렬 Agent)
   ```
   ├─ Agent A: 트리거 충돌 감지 + DO NOT TRIGGER 누락
   ├─ Agent B: 템플릿 준수 검사 (구조, 500줄, user_invocable)
   └─ Agent C: 교훈-스킬 교차 분석 (2회+ 반복 교훈의 스킬 반영 여부)
   ```

2. **감사 보고서** → 충돌/누락/미준수/미반영 항목별 출력

3. **일괄 수정 제안** → 자동 수정 가능 항목(DO NOT TRIGGER 추가, 변경 이력 추가)을 일괄 제안

---

### /anima reflect [--weeks N]

Anima 시스템 전체의 교훈/실수 패턴을 분석하여 자기반성한다. 기본 N=1 (최근 1주).

> **reflection 스킬과의 차이**: reflection은 개별 작업 결과물의 품질 평가 (코드/문서). `/anima reflect`는 Anima 시스템 자체의 행동 패턴을 돌아보는 시스템 자기반성.

**반성 시점 관리:**
- 마지막 반성 시점을 `~/.anima/soul/memory/reflect_marker.yaml`에 기록한다:
  ```yaml
  last_reflect: "2026-03-08"
  processed_reports:
    - "2026-03-07-10-30_XXX.md"
    - "2026-03-08-14-16_XXX.md"
  ```
- 다음 reflect 실행 시 `last_reflect` **이후** 보고서만 분석한다 (이미 반영된 회고를 재분석하지 않음)
- lessons.md는 전체를 분석하되, 보고서 회고(Agent B)는 미처리 보고서만 스캔한다
- `--full` 옵션으로 전체 기간 재분석 가능 (초기화/리셋 용도)

**워크플로우:**

1. **데이터 수집** (병렬 Agent)
   ```
   ├─ Agent A: lessons.md 분석
   │   - 분류별 빈도 집계 (process, technical, communication, approach, effective)
   │   - 2회+ 반복 교훈 식별
   │   - 적용 확인/적용 실패 비율
   │   - 승격 후보 (적용 확인 3회+) 식별
   │
   ├─ Agent B: 보고서 회고 분석 (미처리분만)
   │   - reflect_marker.yaml의 last_reflect 이후 보고서만 스캔
   │   - "개선할 점" 키워드 빈도
   │   - "교훈 없음" 비율 (높을수록 안정)
   │   - 사용자 교정 패턴 ("~했음?", "왜 안했어")
   │
   └─ Agent C: 이전 reflect 결과와 비교 (있으면)
       - 개선 추이: 이전 주 대비 실수 감소/증가
       - 승격된 규칙의 효과 검증
   ```

2. **자기반성 보고서 출력**
   ```
   🪞 Anima 자기반성 (최근 1주)

   📊 교훈 분류별 빈도
   ├─ process: ███ 3건 (보고서 누락 반복)
   ├─ technical: ██ 2건
   ├─ effective: ██ 2건 (병렬 에이전트 활용, 시크릿 즉시 검증)
   └─ communication: █ 1건

   🔴 반복 실수 (구조적 해결 필요)
   ├─ "작업 보고서 누락" — 3회 반복, 적용 실패 2회
   │   → 현재 상태: work_report에 강제 체크포인트 미적용
   │   → 제안: /anima improve --skill work_report
   └─ (기타 없음)

   🟢 효과적 패턴 (확산 권장)
   ├─ "병렬 에이전트 관점별 분리" — 3회 적용 확인
   │   → 승격 후보: persona.md "작업 방식"에 정식 규칙화
   └─ "시크릿 변경 후 즉시 검증" — 1회 적용 확인

   📈 추이
   ├─ 총 교훈: 8건 (지난주 대비 +3)
   ├─ "교훈 없음" 보고서 비율: 40% (목표: 80%)
   └─ 적용 확인 성공률: 60% (3/5)

   💡 다음 행동
   1. /anima improve --skill work_report (보고서 누락 구조적 해결)
   2. 승격: "병렬 에이전트 관점별 분리" → persona.md
   ```

3. **반성 시점 기록**
   - `reflect_marker.yaml`의 `last_reflect`를 현재 날짜로 갱신
   - `processed_reports`에 이번에 분석한 보고서 파일명 추가
   - `sync.sh push`로 동기화 (다른 vessel에서도 중복 분석 방지)

4. **결과 저장** (선택)
   - weekly_report에 "학습 하네스 분석" 섹션으로 포함 가능
   - 또는 독립 실행 시 콘솔 출력만 (파일 저장 안 함)

---

---

## 국무총리: 시스템 진단·개선 (구 system_expert)

> system_expert 스킬이 anima에 통합됨. "국무총리"로 호출 가능.
> 상세 워크플로우는 `~/.anima/soul/skills/system_expert/skill.md`를 참조한다.

### /anima diagnose · /anima improve-system · /anima audit-skills

> **에르메스 웹으로 위임됨.** 이 기능들은 에르메스 웹 대시보드에서 실행한다.
> - 시스템 진단: `https://anima-hermes.duckdns.org/ui/` → 국무총리 탭
> - Anima 칸반: `https://anima-hermes.duckdns.org/ui/` → Anima 칸반 탭
> - CLI에서도 호출 가능하며, 이 경우 에르메스 API를 통해 데이터를 가져와 표시한다.
>
> 상세 워크플로우는 `system_expert/skill.md` 참조.

---

## 제약 조건

- SKILL.md 수정은 항상 **사용자 승인 후** 적용
- persona.md 직접 수정은 이 스킬의 범위가 아님 (교훈 승격은 persona.md 규칙에 따름)
- 스킬 삭제는 하지 않음 (사용자가 직접 판단)
- 스킬 실행 자체는 하지 않음 — 생성/개선/분석만 담당 (국무총리 기능 제외: 국무총리는 실행까지 수행)

## 핵심 원칙

- **단일 진입점**: 스킬 관리는 이 스킬을 통해서만. persona.md에는 최소 참조만 유지
- **연구 기반 개선**: Reflexion/SICA 패턴, 프롬프트 엔지니어링 연구를 근거로 개선
- **정량적 관리**: 구조점수, 사용빈도, 교훈반복률로 스킬 건강을 측정
- **안전한 수정**: diff 제시 → 승인 → 적용 → 동기화

## 스킬 의존성

- **데이터 소스**: work_report (회고), tool_stats (사용 빈도), weekly_report (주간 집계)
- **호출되는 곳**: persona.md "스킬 관리" 섹션에서 참조
- **관련 교훈 관리**: persona.md "학습 하네스"가 기록, 이 스킬이 스킬 반영 담당

## 변경 이력

| 날짜 | 변경 내용 | 트리거 |
|------|----------|--------|
| 2026-03-08 | 초기 생성 (anima_manager로) | 사용자 요청 |
| 2026-03-08 | anima로 이름 변경 + 교훈 관리 중앙화 + 동기화 규약 통합 | 사용자 요청: 통합 검토 |
| 2026-03-21 | 국무총리(system_expert) 기능 통합 — diagnose, improve-system, audit-skills 서브커맨드 추가 | 제우스 요청: "국무총리 시스템도 애니마와 통합" |
