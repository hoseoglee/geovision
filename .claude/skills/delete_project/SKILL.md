---
name: delete_project
description: |
  프로젝트 종료(EOS) + 삭제 통합 스킬. 프로젝트의 종합 기록을 남기고 리소스를 정리한다.
  트리거: "프로젝트 삭제해줘", "프로젝트 지워줘", "프로젝트 정리해줘", "delete project", "remove project", "프로젝트 제거", "프로젝트 종료", "EOS", "프로젝트 마무리", "프로젝트 끝"
  DO NOT TRIGGER: 파일 하나 삭제, 폴더 정리, 프로젝트 내부 코드 삭제 요청, 프로젝트 점검(→ project_manager)
user_invocable: true
---

# Delete Project Skill (EOS 통합)

프로젝트를 종료할 때 **종합 기록을 남기고** 리소스를 정리한다.
기록 먼저, 삭제 나중. 나중에 다시 만들 수 있을 정도로 구체적인 기록을 남긴다.

## 사용법

```
/delete_project <프로젝트명>              # 종합 기록 + 삭제
/delete_project <프로젝트명> --record-only  # 종합 기록만 (삭제 안 함)
/delete_project <프로젝트명> --skip-record  # 기록 없이 삭제만 (비권장)
```

## 워크플로우

```
Phase 1: 리소스 탐색 + 보고 (무엇이 있는가)
Phase 2: 종합 기록서 작성 (기록 보존)
Phase 3: 사용자 확인
Phase 4: 아카이빙 + 삭제
Phase 5: 교훈 반영 + 결과 보고
```

---

### Phase 1: 리소스 탐색 + 보고

병렬 Agent로 프로젝트 관련 모든 리소스를 탐색한다.

```
병렬 Agent:
├─ Agent A: 코드/인프라 리소스
│   - ~/workspace/project_{name}/ (파일 수, 크기, 미커밋 여부)
│   - GitHub 리포 — PAT(`global.github_pat`)로 private 포함 API 검색
│     - `project_{name}`, `{name}` 모두 탐색
│     - `GET https://api.github.com/user/repos?type=all` + name 필터
│   - Docker 컨테이너/볼륨 (docker ps, docker volume ls)
│   - git log --oneline 최근 30커밋 (통계용)
│   - 코드 줄 수 (wc -l 또는 cloc)
│
├─ Agent B: 문서/기록 리소스
│   - ~/papyrus/projects/project_{name}/ (파일 목록)
│   - ~/papyrus/records/ 내 관련 보고서 (grep project)
│   - 아키텍처 문서 읽기
│   - _knowledge.md 읽기
│
└─ Agent C: 시스템 리소스
    - ~/.anima/projects/project_{name}/
    - ~/.claude/projects/ 내 관련 디렉토리
    - Hermes 프로젝트 상태 (hermes_client로 조회)
    - 칸반 보드 카드 수 (GET /api/trello/board → 프로젝트 라벨 필터링)
```

**보고 형식**:
```
프로젝트 "project_{name}" 리소스 현황:

📦 코드
  [존재] Workspace: ~/workspace/project_{name}/ (XX파일, XX MB)
         ⚠️ 미커밋 변경사항 있음 (있을 경우)
  [존재] GitHub: github.com/hoseoglee/project_{name}
  [존재] Docker: container hermes-1, volume pgdata

📄 문서
  [존재] Papyrus 문서: ~/papyrus/projects/project_{name}/ (X개 파일)
  [존재] 관련 보고서: ~/papyrus/records/ 내 X건
  [존재] 아키텍처 문서: 있음 (XXX줄)

⚙️ 시스템
  [존재] Anima 설정: ~/.anima/projects/project_{name}/
  [없음] Claude Code 데이터: 없음
```

### Phase 2: 종합 기록서 작성

프로젝트의 **전부**를 하나의 문서에 담는다. 이 문서만 읽으면 프로젝트를 이해하고, 다시 만들 수 있어야 한다.

**저장 위치**: `~/papyrus/archives/project_{name}/EOS_종합기록.md`

**기록서 구조**:

```markdown
---
tags: [eos, archive, project_{name}]
date: yyyy-mm-dd
project: {name}
status: archived
---
# 프로젝트 종합 기록: project_{name}

## 1. 프로젝트 신원

| 항목 | 내용 |
|------|------|
| 이름 | project_{name} |
| 목적 | {아키텍처 문서에서 추출} |
| 기간 | {첫 커밋 ~ 마지막 커밋} |
| 최종 상태 | 완료 / 중단 / 대체됨 |
| 종료 이유 | {사용자에게 확인} |
| 기술 스택 | {package.json, pyproject.toml에서 추출} |
| 규모 | {파일 수}파일, {코드 줄 수}줄, {커밋 수}커밋 |

## 2. 아키텍처 스냅샷

{아키텍처 문서가 있으면 핵심 내용 발췌}
{없으면 코드 구조에서 추출하여 작성}

### 시스템 구조도
{다이어그램}

### 핵심 모듈
| 모듈 | 역할 | 비고 |
|------|------|------|

### 외부 의존성
| 이름 | 버전 | 용도 |
|------|------|------|

### 데이터 흐름
{입력 → 처리 → 출력}

## 3. 의사결정 기록

프로젝트에서 내린 주요 기술적 결정과 그 이유.

| 결정 | 선택지 | 선택한 것 | 이유 |
|------|--------|----------|------|
| {결정1} | A vs B | A | {이유} |

### 시도했다가 실패한 접근법
| 접근법 | 왜 실패했는가 | 배운 점 |
|--------|-------------|---------|

{아키텍처 변경 이력에서 추출}

## 4. 재현 가이드

이 프로젝트를 처음부터 다시 만들 때 필요한 모든 것.

### 환경
- OS: {추출}
- 런타임: {Node.js XX, Python XX 등}
- 도구: {Docker, npm 등}

### 셋업 절차
```bash
# 1단계: ...
# 2단계: ...
```

### 필요한 시크릿/인증
| 키 | 용도 | 어디서 발급 |
|----|------|-----------|
| {KEY_NAME} | {용도} | {발급처} |
(값은 포함하지 않음)

### 핵심 설정
{docker-compose.yml, .env.example 등 내용 발췌}

## 5. 교훈

### 잘한 것 (다음 프로젝트에서 반복)
- {보고서 회고에서 추출}

### 실수 (다음 프로젝트에서 회피)
- {보고서 회고 + lessons.md에서 추출}

### 기술적 발견
- {프로젝트에서 새로 알게 된 기술적 패턴/트릭}

### 미완성 아이디어
- {백로그에서 미구현 항목 — 누군가 이어갈 수 있도록}

## 6. 통계

| 항목 | 값 |
|------|---|
| 기간 | {일} |
| 커밋 수 | {N} |
| 보고서 수 | {N} |
| 파일 수 | {N} |
| 코드 줄 수 | {N} |
| 총 토큰 | {보고서 tokens 합산} |

## 7. 재사용 자산

다른 프로젝트에서 참고하거나 가져다 쓸 수 있는 것.

| 자산 | 설명 | 위치 |
|------|------|------|
| {모듈/패턴/설정} | {무엇에 유용한가} | {파일 경로} |

## 참고자료 (References)
- {관련 보고서 wikilink 목록}
```

**기록서 작성 원칙**:
- 코드를 복붙하지 않는다 — 구조와 핵심 로직만 설명
- 숫자는 자동 수집 (git log, wc, cloc)
- 교훈은 보고서 회고 섹션에서 자동 추출
- 의사결정은 아키텍처 변경 이력에서 추출
- 미완성 아이디어는 백로그/요구사항에서 미구현 항목 추출

### Phase 3: 사용자 확인

기록서를 보여주고 확인한다.

```
종합 기록서 작성 완료: ~/papyrus/archives/project_{name}/EOS_종합기록.md

삭제 대상:
  1. Workspace 폴더 (~/workspace/project_{name}/)
  2. GitHub 리포 (hoseoglee/project_{name})
  3. Docker 컨테이너/볼륨
  4. Anima 프로젝트 설정
  5. Claude Code 프로젝트 데이터
  6. 칸반 보드 카드 (Trello 해당 프로젝트 라벨)

보존 대상:
  📦 종합 기록서 → ~/papyrus/archives/project_{name}/
  📄 프로젝트 문서 → ~/papyrus/archives/project_{name}/
  📋 작업 보고서 → ~/papyrus/records/ (변경 없음)

진행: 전체 삭제 / 선택 삭제 / 기록만 보존(삭제 안 함) / 취소
```

### Phase 4: 아카이빙 + 삭제

**4-1. Papyrus 아카이빙** (삭제 전 반드시 먼저)
1. `~/papyrus/archives/project_{name}/` 디렉토리 생성
2. `~/papyrus/projects/project_{name}/`의 모든 파일을 archives로 이동
3. 아카이브 문서에 frontmatter 추가: `archived: true`, `archived_date: yyyy-mm-dd`
4. 빈 projects 디렉토리 삭제
5. papyrus git 커밋

**4-2. 리소스 삭제** (사용자가 확인한 항목만)
1. Workspace 폴더: `rm -rf ~/workspace/project_{name}/`
2. GitHub 리포: `gh repo delete hoseoglee/project_{name} --yes`
3. Docker: `docker compose down -v` (해당 프로젝트의 compose만)
4. Anima 설정: `rm -rf ~/.anima/projects/project_{name}/`
5. Claude Code 데이터: 관련 디렉토리 삭제
6. Hermes 프로젝트: status를 `archived`로 변경
7. **칸반 카드 정리**: Trello 보드에서 해당 프로젝트의 카드를 삭제한다
   - `curl -s -u admin:$HERMES_PASS https://anima-hermes.duckdns.org/api/trello/board` 로 전체 카드 조회
   - 프로젝트 라벨이 일치하는 카드 필터링
   - 각 카드를 `DELETE /api/trello/cards/:id` 로 삭제
   - 삭제 건수를 Phase 5 결과 보고에 포함
8. `~/.anima/sync.sh push`

### Phase 5: 교훈 반영 + 결과 보고

**5-1. 교훈 통합**
- 기록서의 "5. 교훈" 섹션에서 범용적인 교훈을 `~/.anima/soul/memory/lessons.md`에 추가
- 프로젝트 고유 교훈 vs 범용 교훈을 구분 (범용만 lessons.md에)

**5-2. 결과 보고**
```
프로젝트 "project_{name}" 종료 완료!

📝 종합 기록: ~/papyrus/archives/project_{name}/EOS_종합기록.md
📦 문서 아카이브: ~/papyrus/archives/project_{name}/

삭제됨:
  ✓ Workspace 폴더
  ✓ GitHub 리포
  ✓ Docker 컨테이너/볼륨

보존됨:
  📝 종합 기록서 (7개 섹션 — 재현 가이드 포함)
  📄 프로젝트 문서 (archives/)
  📋 작업 보고서 (records/)
  🎓 교훈 (lessons.md에 통합)
```

**5-3. work_report 호출 (필수)**
- **IMPORTANT**: Phase 5까지 완료 후 반드시 `work_report` 스킬을 호출하여 작업 보고서를 생성한다
- 보고서에는 삭제된 리소스, 보존된 기록, 종합 기록서 경로를 포함한다
- 이 단계를 건너뛰지 않는다

## 핵심 원칙

- **기록 먼저, 삭제 나중**: 종합 기록서가 완성되기 전에는 아무것도 삭제하지 않는다
- **다시 만들 수 있을 정도로**: 기록서만 읽고 같은 프로젝트를 재현할 수 있어야 한다
- **교훈은 살린다**: 프로젝트는 죽어도 배운 것은 다음 프로젝트로 이어진다
- **되돌릴 수 없음 강조**: GitHub 리포, workspace 삭제는 되돌릴 수 없음을 명시
- **부분 실행 지원**: 기록만 남기고 삭제 안 할 수 있음 (`--record-only`)

## 제약 조건

- 미커밋 변경사항이 있으면 반드시 경고 (사용자 확인 없이 삭제 불가)
- 보고서(records/)는 절대 삭제/이동하지 않음 (다른 프로젝트 참조 가능)
- 시크릿 값은 기록서에 포함하지 않음 (키 이름과 발급처만)

## 검증 기준

- [ ] 종합 기록서 7개 섹션 모두 작성됨
- [ ] 재현 가이드가 실제로 재현 가능한 수준인가
- [ ] 교훈이 lessons.md에 반영됨
- [ ] papyrus 문서가 archives/로 이동됨
- [ ] 삭제 대상이 사용자에게 보고되고 확인 받음
- [ ] 보고서(records/)는 변경 없음

## 스킬 의존성

- work_report: 작업 보고서 생성
- project_manager: 프로젝트 점검 (EOS 전에 실행 권장)

## 변경 이력

| 날짜 | 변경 내용 | 트리거 |
|------|----------|--------|
| 2026-03-07 | 초기 생성 (delete_project) | 사용자 요청 |
| 2026-03-10 | 검증 기준, 변경 이력 추가 | /anima improve |
| 2026-03-16 | EOS 통합 — 종합 기록서 7개 섹션, 교훈 반영, 재현 가이드, 재사용 자산 | 사용자 요청 |
