---
name: sdd
description: "Spec-Driven Development (SDD) - 명세/스펙 기반 개발 워크플로우. 'sdd로 해줘', 'sdd로 개발해줘', '스펙 먼저 작성해줘', '명세 기반으로 개발', 'spec driven', '스펙드리븐' 등의 요청 시 트리거. 코드 작성 전 스펙을 먼저 작성하고, 스펙을 단일 진실 원천(SSOT)으로 삼아 계획, 구현, 검증을 수행한다."
user_invocable: true
---

# SDD (Spec-Driven Development) Skill

스펙 기반 개발 워크플로우를 실행한다. `/sdd` 뒤에 서브커맨드를 붙여 사용한다.

## 서브커맨드

사용자가 `/sdd`만 입력하면 사용 가능한 서브커맨드 목록을 안내한다.

### `/sdd init`
프로젝트에 SDD 구조를 초기화한다.

1. 현재 프로젝트 루트(git root 또는 cwd)를 확인한다.
2. 다음 디렉토리/파일 구조를 생성한다:
   ```
   specs/
     constitution.md    # 프로젝트 원칙, 제약사항, 기술 스택
     features/          # 기능별 스펙 파일
     plans/             # 구현 계획서
     validations/       # 검증 결과
   ```
3. `specs/constitution.md`에 프로젝트 기본 정보를 대화형으로 채운다:
   - 프로젝트 이름/설명
   - 기술 스택
   - 핵심 제약사항 (성능, 보안, 호환성 등)
   - 코딩 컨벤션
4. 기존 `specs/` 디렉토리가 있으면 덮어쓰지 않고 누락된 것만 보완한다.

### `/sdd spec <feature_name>`
새 기능 스펙을 작성한다.

1. 사용자에게 기능 요구사항을 확인한다 (이미 설명했으면 그대로 사용).
2. `specs/constitution.md`를 읽어 프로젝트 컨텍스트를 파악한다.
3. `specs/features/{feature_name}.md`에 다음 구조로 스펙을 작성한다:

```markdown
---
tags: [spec, {feature_name}]
date: yyyy-mm-dd
---
# Feature: {feature_name}

## 개요
- 목적: [이 기능이 해결하는 문제]
- 범위: [포함/제외 사항]

## 요구사항
### 기능 요구사항 (Functional)
- [ ] FR-1: ...
- [ ] FR-2: ...

### 비기능 요구사항 (Non-Functional)
- [ ] NFR-1: ...

## 인터페이스 정의
### 입력 (Input)
- 파라미터, 타입, 제약조건

### 출력 (Output)
- 반환값, 타입, 예시

### API/함수 시그니처
```python
# 또는 해당 언어
def function_name(param: Type) -> ReturnType:
    """docstring"""
```

## 엣지 케이스
- EC-1: [상황] -> [예상 동작]
- EC-2: ...

## 의존성
- 외부 라이브러리, 다른 모듈, 시스템 요구사항

## 검증 기준 (Acceptance Criteria)
- AC-1: [Given/When/Then 형식]
- AC-2: ...

## 관련 문서
- [[constitution]] — 프로젝트 원칙
- [[관련_스펙_또는_문서]] (있으면 wikilink로 연결)

## 참고자료 (References)
- [제목](URL) — 인터넷 자료
- [[내부문서제목]] — 내부 문서
- 없으면 "없음"
```

4. **5C 품질 기준**으로 스펙을 자체 검증한다:
   - **Clarity** (명확성): 모호한 표현 없는가?
   - **Completeness** (완전성): 빠진 요구사항 없는가?
   - **Context** (맥락): constitution과 일관성 있는가?
   - **Concreteness** (구체성): 타입, 예시, 경계값이 명시되었는가?
   - **Testability** (검증가능성): 각 요구사항이 테스트 가능한가?

5. 품질 검증 결과를 사용자에게 보여주고 확인받는다.

### `/sdd plan <feature_name>`
스펙으로부터 구현 계획을 생성한다.

1. `specs/features/{feature_name}.md` 스펙을 읽는다. 없으면 먼저 `/sdd spec`을 안내한다.
2. `specs/constitution.md`를 읽어 제약사항을 확인한다.
3. 기존 코드베이스를 탐색하여 관련 파일/모듈을 파악한다.
4. `specs/plans/{feature_name}_plan.md`에 구현 계획을 작성한다:

```markdown
---
tags: [plan, {feature_name}]
date: yyyy-mm-dd
---
# Implementation Plan: {feature_name}

## 스펙 참조
- [[{feature_name}]] (specs/features/{feature_name}.md)

## 영향 분석
- 수정 파일: [파일 목록과 변경 내용 요약]
- 새로 생성할 파일: [파일 목록]
- 의존성 변경: [추가/수정할 패키지]

## 구현 단계
### Step 1: [제목]
- 대상 파일: ...
- 작업 내용: ...
- 관련 요구사항: FR-1, FR-2

### Step 2: [제목]
...

## 테스트 계획
- 단위 테스트: [테스트 파일/케이스]
- 통합 테스트: [해당 시]
- 엣지 케이스 테스트: EC-1, EC-2 커버

## 리스크
- [잠재적 위험과 완화 방안]

## 참고자료 (References)
- [[{feature_name}]] — 기능 스펙
- [[constitution]] — 프로젝트 원칙
- 없으면 "없음"
```

5. 계획을 사용자에게 보여주고 승인을 받는다.

### `/sdd implement <feature_name>`
계획에 따라 코드를 구현한다.

1. `specs/plans/{feature_name}_plan.md` 계획을 읽는다. 없으면 `/sdd plan`을 먼저 안내한다.
2. `specs/features/{feature_name}.md` 스펙을 함께 참조한다.
3. 계획의 각 Step을 순서대로 구현한다:
   - 각 Step 시작 전 스펙의 해당 요구사항을 다시 확인한다.
   - 구현 중 스펙과 충돌이 발견되면 즉시 사용자에게 알린다.
   - 독립적인 Step은 Agent 도구로 병렬 구현한다.
4. 구현 완료 후 자동으로 `/sdd validate`를 실행한다.

### `/sdd validate <feature_name>`
구현이 스펙과 일치하는지 검증한다.

1. `specs/features/{feature_name}.md` 스펙을 읽는다.
2. 구현된 코드를 스펙의 각 항목과 대조한다:
   - 기능 요구사항 (FR-*) 충족 여부
   - 비기능 요구사항 (NFR-*) 충족 여부
   - 인터페이스 시그니처 일치 여부
   - 엣지 케이스 (EC-*) 처리 여부
   - 검증 기준 (AC-*) 통과 여부
3. 테스트가 있으면 실행한다.
4. `specs/validations/{feature_name}_validation.md`에 결과를 기록한다:

```markdown
---
tags: [validation, {feature_name}]
date: yyyy-mm-dd
---
# Validation: {feature_name}

## 검증 일시
{date}

## 요구사항 충족 현황
| ID | 요구사항 | 상태 | 비고 |
|----|---------|------|------|
| FR-1 | ... | PASS/FAIL/PARTIAL | ... |
| NFR-1 | ... | PASS/FAIL | ... |

## 엣지 케이스
| ID | 시나리오 | 상태 | 비고 |
|----|---------|------|------|
| EC-1 | ... | PASS/FAIL | ... |

## 검증 기준
| ID | 기준 | 상태 |
|----|------|------|
| AC-1 | ... | PASS/FAIL |

## 테스트 결과
- 통과: X건
- 실패: Y건
- 커버리지: Z%

## 스펙 드리프트 (Spec Drift)
- [스펙과 구현 간 차이가 있는 항목]

## 결론
- 전체 상태: PASS / FAIL / PARTIAL
- 권장 조치: [있으면 기술]

## 참고자료 (References)
- [[{feature_name}]] — 기능 스펙
- [[{feature_name}_plan]] — 구현 계획
- 없으면 "없음"
```

5. 결과를 사용자에게 요약 보고한다.

### `/sdd status`
현재 프로젝트의 SDD 현황을 보여준다.

1. `specs/features/` 의 모든 스펙 파일을 읽는다.
2. `specs/plans/` 의 계획 파일 존재 여부를 확인한다.
3. `specs/validations/` 의 최신 검증 결과를 확인한다.
4. 요약 테이블을 출력한다:

```
| Feature | Spec | Plan | Implemented | Validated | Status |
|---------|------|------|-------------|-----------|--------|
| auth    | O    | O    | O           | PASS      | Done   |
| search  | O    | O    | X           | -         | WIP    |
```

### `/sdd update <feature_name>`
새로운 요구사항을 반영하여 스펙을 업데이트하고, 변경된 스펙에 따라 구현까지 연쇄 실행한다.

1. 기존 스펙 파일(`specs/features/{feature_name}.md`)을 읽는다.
2. 사용자의 새 요구사항을 스펙에 반영한다:
   - 새 요구사항은 기존 FR/NFR 번호 뒤에 이어서 추가한다.
   - 기존 요구사항 변경 시 해당 항목을 수정하고, 변경 이력을 `## 변경 이력` 섹션에 기록한다:
     ```markdown
     ## 변경 이력
     | 날짜 | 변경 내용 | 영향 범위 |
     |------|----------|----------|
     | yyyy-mm-dd | FR-3 추가: ... | plan Step 3 추가 필요 |
     ```
3. 수정 후 5C 품질 기준으로 재검증한다.
4. 스펙 변경사항을 사용자에게 diff 형태로 보여주고 승인받는다.
5. **승인 후 자동 연쇄 실행**:
   - 관련 plan이 있으면 변경된 요구사항에 맞게 plan을 갱신한다 (새 Step 추가 또는 기존 Step 수정).
   - plan 갱신 후 사용자 승인을 받고, 변경된 부분만 구현한다.
   - 구현 완료 후 자동으로 `/sdd validate`를 실행하여 전체 스펙 충족 여부를 재검증한다.
6. plan이 아직 없으면 `/sdd plan`을 먼저 안내한다.

## 핵심 원칙

- **Spec is the Single Source of Truth**: 스펙이 항상 우선. 구현이 스펙과 다르면 구현을 고친다 (스펙 변경이 필요하면 사용자 승인 필수).
- **Human-in-the-Loop**: 스펙 작성, 계획 승인, 스펙 변경 시 반드시 사용자 확인.
- **Drift Detection**: 구현이 스펙에서 벗어나는 것(드리프트)을 적극 감지하고 보고한다.
- **Incremental**: 한 번에 모든 것을 스펙하지 않는다. 기능 단위로 점진적으로 진행한다.
- **병렬 처리**: 독립적인 기능의 구현은 Agent 도구로 병렬 처리한다.

## 검증 기준

- [ ] constitution.md가 존재하거나 생성됨
- [ ] 기능 스펙이 5C 품질 기준을 충족
- [ ] 구현 계획에 의존성 그래프가 포함됨
- [ ] validate 결과가 PASS

## 변경 이력

| 날짜 | 변경 내용 | 트리거 |
|------|----------|--------|
| 2026-03-07 | 초기 생성 | 사용자 요청 |
| 2026-03-10 | 검증 기준, 변경 이력 추가 | /anima improve |
