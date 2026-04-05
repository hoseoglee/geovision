---
name: create_project
description: "새 프로젝트 생성 스킬. '새 프로젝트 만들어', '프로젝트 생성해줘', '프로젝트 시작', 'create project', 'new project', '프로젝트 세팅해줘', '프로젝트 초기화' 등의 요청 시 트리거. workspace에 코드 리포를, papyrus에 문서 폴더를, anima에 프로젝트 설정을 생성하고, Obsidian vault와 연동되도록 구성한다. DO NOT TRIGGER: 기존 프로젝트에서 코드 작성/수정만 하는 경우, 단순 폴더 생성 요청."
user_invocable: true
---

# Create Project Skill

새 프로젝트를 생성하고 workspace, papyrus, anima 설정을 일괄 구성한다.

## 사용법

```
/create_project <프로젝트명>
/create_project <프로젝트명> --path <커스텀경로>
```

- `<프로젝트명>`: 영문 소문자, 하이픈/언더스코어 허용 (예: `my-app`, `dolbom`)
- **네이밍 규칙**: 모든 프로젝트에 `project_` 프리픽스를 자동 적용한다. 사용자가 `myapp`을 입력하면 `project_myapp`으로 생성된다. 사용자가 이미 `project_`로 시작하는 이름을 입력하면 중복 적용하지 않는다.
- `--path`: 기본 경로(`~/workspace/`) 대신 다른 경로를 사용할 때

## 워크플로우

### 1. 프로젝트 정보 확인
- 사용자가 프로젝트명을 지정하지 않았으면 물어본다.
- 프로젝트 설명(한 줄)을 물어본다.
- 기술 스택/언어를 물어본다 (선택사항).
- `~/workspace/project_{프로젝트명}/`이 이미 존재하면 덮어쓰지 않고 안내한다.

### 2. Workspace 설정 (코드 저장소)
프로젝트 코드와 산출물이 저장되는 곳.

1. `~/workspace/project_{프로젝트명}/` 디렉토리 생성
2. Git 초기화 및 GitHub private 리포 생성:
   ```bash
   cd ~/workspace/project_{프로젝트명}
   git init
   gh repo create project_{프로젝트명} --private --source=. --push
   # 레포명도 반드시 project_ 프리픽스 포함
   ```
3. 기본 `.gitignore` 생성 (기술 스택에 맞게):
   - Python: `__pycache__/`, `.venv/`, `*.pyc`, `.env`
   - Node: `node_modules/`, `.env`
   - 공통: `.DS_Store`, `*.log`
4. 기본 `README.md` 생성:
   ```markdown
   # project_{프로젝트명}

   {프로젝트 설명}

   ## 기술 스택
   - {스택 목록}
   ```
5. 초기 커밋:
   ```bash
   git add -A
   git commit -m "init: 프로젝트 초기화"
   git push -u origin main
   ```

### 3. Papyrus 설정 (문서 저장소)
프로젝트 문서화가 저장되는 곳. Obsidian vault(`~/papyrus/`)의 일부.

1. `~/papyrus/projects/project_{프로젝트명}/` 디렉토리 생성
2. 프로젝트 인덱스 문서 생성 — `~/papyrus/projects/project_{프로젝트명}/README.md`:
   ```markdown
   ---
   tags: [project, project_{프로젝트명}]
   date: {yyyy-mm-dd}
   ---
   # project_{프로젝트명}

   {프로젝트 설명}

   ## 기술 스택
   - {스택 목록}

   ## 구조
   - **코드**: `~/workspace/project_{프로젝트명}/` ([GitHub](https://github.com/hoseoglee/project_{프로젝트명}))
   - **문서**: 이 폴더 (`~/papyrus/projects/project_{프로젝트명}/`)
   - **보고서**: `~/papyrus/records/` (태그 `#project_{프로젝트명}`으로 필터)

   ## 문서 목록
   - [[project_{프로젝트명}/아키텍처]] — 시스템 아키텍처
   - (프로젝트 진행에 따라 추가)

   ## 참고자료 (References)
   - 없음
   ```
3. 아키텍처 문서 생성 — `~/papyrus/projects/project_{프로젝트명}/아키텍처.md`:
   ```markdown
   ---
   tags: [architecture, project_{프로젝트명}]
   date: {yyyy-mm-dd}
   ---
   # project_{프로젝트명} 아키텍처

   ## 개요
   {프로젝트 설명 및 목적}

   ## 요구사항

   ### 궁극의 요구사항
   > 이 프로젝트가 최종적으로 달성해야 할 핵심 목표 한 문장
   - {프로젝트의 존재 이유이자 모든 의사결정의 기준}

   ### 기능별 요구사항
   | ID | 기능 | 설명 | 우선순위 |
   |----|------|------|----------|
   | FR-01 | {기능명} | {상세 설명} | 필수/선택 |
   | FR-02 | {기능명} | {상세 설명} | 필수/선택 |

   ## 시스템 구성도
   ```mermaid
   graph TD
       A[클라이언트] --> B[서버/API]
       B --> C[데이터베이스]
   ```
   > 프로젝트에 맞게 수정

   ## 기술 스택
   | 레이어 | 기술 | 선택 이유 |
   |--------|------|-----------|
   | {레이어} | {기술} | {이유} |

   ## 디렉토리 구조
   ```
   project_{프로젝트명}/
   ├── (프로젝트 구조에 따라 작성)
   ```

   ## 핵심 설계 결정
   - (프로젝트 진행에 따라 기록)

   ## 데이터 흐름
   - (주요 데이터 흐름을 설명)

   ## 참고자료 (References)
   - 없음
   ```
3. Papyrus 동기화:
   ```bash
   cd ~/papyrus && git add -A && git commit -m "project: project_{프로젝트명} 생성" && git push origin main
   ```

### 4. Anima 프로젝트 설정
다른 vessel/세션에서도 프로젝트 컨텍스트를 공유하기 위한 설정.

1. `~/.anima/projects/project_{프로젝트명}/` 디렉토리 생성
2. `.target_path` 파일 생성 — 실제 프로젝트 경로 기록:
   ```
   /Users/{username}/workspace/project_{프로젝트명}
   ```
   - `--path` 옵션을 사용했으면 해당 경로를 기록
3. `CLAUDE.md` 파일 생성 — 프로젝트별 Claude Code 지침:
   ```markdown
   # Project: project_{프로젝트명}

   {프로젝트 설명}

   ## 기술 스택
   - {스택 목록}

   ## 프로젝트 규칙
   - 문서는 `~/papyrus/projects/project_{프로젝트명}/`에 작성
   - 작업 완료 시 반드시 `work_report` 스킬로 보고서 생성
   ```
4. `settings.local.json` 파일 생성 — 기본 권한 설정:
   ```json
   {
     "_comment": "프로젝트별 자동 허용 명령어",
     "permissions": {
       "allow": []
     }
   }
   ```
5. `memory/` 디렉토리 생성 (빈 상태, AI가 점진적으로 채움)
6. `rules/` 디렉토리 생성 (`.gitkeep`)
7. Anima 동기화:
   ```bash
   ~/.anima/sync.sh push
   ```

### 5. Trello 칸반 라벨 생성
Trello 보드에 프로젝트 라벨을 생성하여 칸반 카드와 프로젝트를 연결한다.

1. 기존 라벨 확인: `GET /api/trello/board` → labels 배열에서 프로젝트명 검색
2. 라벨이 없으면 생성:
   ```bash
   # Hermes API를 통해 생성 (server.js의 라벨 생성 로직 활용)
   # 또는 Trello API 직접 호출:
   curl -X POST "https://api.trello.com/1/boards/{BOARD_ID}/labels?key={KEY}&token={TOKEN}&name={프로젝트명}&color={색상}"
   ```
3. 색상은 기존 라벨과 겹치지 않도록 로테이션: blue, green, orange, red, purple, pink, lime, sky, yellow, black
4. server.js의 `TRACE_ABBREVS` 매핑에도 프로젝트 약어를 추가한다 (4자 대문자, 예: `'openclaw': 'CLAW'`)

### 6. Obsidian 연동 확인
Papyrus가 Obsidian vault이므로 별도 설정 없이 자동 연동된다.

- `~/papyrus/projects/project_{프로젝트명}/`에 생성된 문서는 Obsidian에서 바로 열람 가능
- `[[project_{프로젝트명}/README]]`로 다른 문서에서 링크 가능
- 태그 `#project_{프로젝트명}`으로 관련 보고서/문서 필터링 가능
- **사용자에게 안내**: "Obsidian에서 `~/papyrus/` vault를 열면 프로젝트 문서를 바로 확인할 수 있습니다."

### 7. 결과 보고
프로젝트 생성 완료 후 다음을 출력한다:

```
프로젝트 "project_{프로젝트명}" 생성 완료!

📁 코드:     ~/workspace/project_{프로젝트명}/
📄 문서:     ~/papyrus/projects/project_{프로젝트명}/
⚙️ 설정:     ~/.anima/projects/project_{프로젝트명}/
🌐 GitHub:  https://github.com/hoseoglee/project_{프로젝트명}
🏷️ 칸반:    Trello 라벨 "{프로젝트명}" 생성됨
📓 Obsidian: ~/papyrus/ vault에서 바로 열람 가능
```

### 8. 작업 보고서
- 반드시 `work_report` 스킬을 호출하여 작업 보고서를 생성한다.

## 핵심 원칙

- **코드 → workspace, 문서 → papyrus, 설정 → anima**: 세 곳의 역할을 명확히 분리한다.
- **덮어쓰기 금지**: 기존 디렉토리/파일이 있으면 절대 덮어쓰지 않고 사용자에게 확인한다.
- **Obsidian 호환**: papyrus 문서는 반드시 YAML frontmatter + wikilink 형식을 따른다.
- **파일명 한글 사용**: 문서 파일명은 되도록 한글로 작성한다 (날짜, 숫자, 영문 기술 용어는 혼용 가능). 단, 프로젝트명 자체가 영문이면 폴더명은 영문 유지.
- **동기화 필수**: 생성 후 papyrus와 anima 모두 동기화하여 다른 vessel에서도 접근 가능하게 한다.

## 검증 기준

- [ ] workspace에 project_{name}/ 디렉토리 생성됨
- [ ] papyrus에 프로젝트 문서 폴더 생성됨
- [ ] GitHub 리포 생성됨 (또는 사용자 선택에 따라 건너뜀)
- [ ] .gitignore, README.md 등 기본 파일 포함
- [ ] Trello 보드에 프로젝트 라벨 생성됨

## 변경 이력

| 날짜 | 변경 내용 | 트리거 |
|------|----------|--------|
| 2026-03-07 | 초기 생성 | 사용자 요청 |
| 2026-03-10 | 검증 기준, 변경 이력 추가 | /anima improve |
