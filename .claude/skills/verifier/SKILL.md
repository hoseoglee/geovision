---
name: verifier
description: |
  코드 검증/리뷰 스킬 — 개발된 코드를 다각도로 검증하고 pass/fail을 판정하는 스킬.
  칸반 파이프라인의 리뷰 역할 + 독립 사용 가능.
  Anima의 교훈/패턴을 체크리스트로 활용하고, 발견된 문제를 교훈으로 피드백한다.
  트리거: "검증해줘", "검증자", "코드 리뷰해줘", "코드 검증", "리뷰 모드", "verifier", "verify"
  DO NOT TRIGGER: 자기반성/회고(→ reflection), 단순 코드 질문, 테스트 실행만(→ test_harness)
user_invocable: true
---

# Verifier 스킬 (검증자)

개발된 코드를 품질·버그·보안·성능·프로젝트 취지 관점에서 다각도로 검증하는 스킬.

## 사용법

```
/검증자                          # 현재 프로젝트의 최근 변경 검증
/검증자 --diff HEAD~3            # 특정 범위의 변경 검증
/검증자 --file path/to/file.js   # 특정 파일 검증
/검증자 --card "카드 제목"        # 칸반 카드 기준 검증
```

## 검증 관점 (6가지)

0. **프로젝트 취지 부합**: 스펙·아키텍처 문서를 먼저 읽고, 구현이 프로젝트 목적에 부합하는지 검증. 취지에서 벗어난 구현은 **반드시 fail**
1. **코드 품질**: 가독성, 구조, 중복, 네이밍
2. **버그**: 논리 오류, 엣지 케이스, null/undefined 처리
3. **보안**: 인젝션, XSS, 인증/인가, 민감정보 노출
4. **성능**: 불필요한 반복, 메모리 누수, N+1 쿼리
5. **사용자 선호 준수**: `~/.anima/soul/memory/preferences.md`의 코딩 컨벤션 위반 여부
6. **실제 코드 변경 검증**:
   - `git diff HEAD~1 --name-only`로 실제 변경된 파일 확인
   - 부분 구현(예: 스토어는 있으나 UI 미배치)이면 **반드시 fail**
   - 실제 코드 변경이 0건이면 **무조건 fail**

## 과거 교훈 활용 (필수 체크리스트)

- `~/.anima/soul/memory/lessons.md`의 `technical` 항목 = 반드시 확인할 기술적 실수 패턴
- `~/.anima/soul/memory/developer_patterns.md`의 "반복 실수/함정" = 자주 발생하는 문제
- 이 항목들에 해당하는 문제가 코드에 있으면 **반드시 fail**

## 실행 절차

### 1단계: 컨텍스트 수집
- `~/papyrus/projects/{프로젝트}/아키텍처.md` 읽기 (개요, 기술스택, 핵심 모듈)
- `~/papyrus/projects/{프로젝트}/스펙.md` 읽기 (프로젝트 취지)
- `~/papyrus/projects/{프로젝트}/_knowledge.md` 읽기
- `~/.anima/soul/memory/lessons.md` — technical, process, approach 교훈
- `~/.anima/soul/memory/developer_patterns.md` — 함정/패턴
- `~/.anima/soul/memory/preferences.md` — 코딩 컨벤션

### 2단계: 변경사항 분석
- `git diff HEAD~1 --name-only` — 실제 변경 파일
- `git diff HEAD~1 --stat` — 변경 통계
- `git log --oneline -10` — 최근 커밋 이력
- 변경 파일의 코드를 직접 읽고 분석

### 3단계: 6가지 관점 검증
- 각 관점별로 문제 유무 확인
- 과거 교훈의 실수 패턴 반복 체크
- 카드 설명의 수용 기준 충족 여부 확인

### 4단계: 판정
- **pass**: 심각한 문제 없고, 교훈 실수 패턴 반복 없음
- **fail**: 하나라도 심각한 문제 있거나, 교훈 반복

### 5단계: 피드백
- **fail 시**: `lessons.md`에 교훈 기록 (category + title + 상황 + 잘못한 점)
- **fail 2회+ 시**: `developer_patterns.md`에 함정 추가
- **pass 시**: `_knowledge.md`에 설계 결정 기록, /work_report 호출

## 출력 형식

### 독립 사용 시
마크다운으로 리뷰 결과를 직접 표시:
```markdown
## 검증 결과: ✅ Pass / ❌ Fail

### 검증 관점별 결과
| 관점 | 결과 | 비고 |
|------|------|------|
| 프로젝트 취지 | ✅ | ... |
| 코드 품질 | ✅ | ... |
| ... | ... | ... |

### 발견된 이슈
- [이슈 설명]

### 교훈 반영
- [적용한 교훈 / 새로 발견된 교훈]
```

### 칸반 파이프라인 사용 시
반드시 아래 JSON 형식으로만 출력:
```json
{"verdict": "pass 또는 fail", "review_note": "리뷰 상세 내용 (검증 관점별 결과)", "issues": ["이슈1", "이슈2"], "lesson_category": "technical 또는 process 또는 approach", "lesson_title": "교훈 제목"}
```
- pass 시: lesson_category와 lesson_title은 빈 문자열
- fail 시: 반드시 lesson_category와 lesson_title을 채워라

### 작업 완료 전 필수 수행사항
1. **pass 시**: /work_report 스킬을 호출하여 리뷰 통과 보고서를 작성해라
2. **review_note를 상세하게 작성**: 검증 관점별 결과를 구체적으로 기술해라

## 검증 기준
- [ ] 프로젝트 아키텍처와 스펙을 먼저 읽었는가
- [ ] git diff로 실제 변경 파일을 확인했는가
- [ ] 6가지 검증 관점을 모두 확인했는가
- [ ] 과거 교훈(technical)과 함정 목록을 체크했는가
- [ ] fail 시 교훈 카테고리와 제목을 기록했는가
- [ ] pass 시 work_report를 작성했는가
