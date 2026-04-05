---
name: mcp_manager
description: "프로젝트 기술 스택에 맞는 MCP 서버를 추천하고 설치/설정을 자동화하는 스킬. 트리거: 'MCP 추천해줘', 'MCP 서버 설정', 'MCP 설치', 'mcp setup', 'MCP 관리', 'MCP 서버 추가', '이 프로젝트에 맞는 MCP 뭐 있어?', 'MCP 설정 확인', 'MCP 서버 목록'. DO NOT TRIGGER: 일반 코딩 작업, MCP와 무관한 설정 요청, 도구 사용 중 MCP 언급 (예: 'MCP 도구로 파일 읽어줘')."
user_invocable: true
---

# MCP Manager Skill (MCP 서버 자동 관리)

프로젝트의 기술 스택을 분석하여 적합한 MCP 서버를 추천하고, 설치 및 설정을 도와주는 스킬.

## 워크플로우

### 1. 기술 스택 파악

현재 프로젝트의 기술 스택을 자동으로 분석한다:

- `package.json` — Node.js/JavaScript/TypeScript 프로젝트
- `requirements.txt`, `pyproject.toml`, `setup.py` — Python 프로젝트
- `Cargo.toml` — Rust 프로젝트
- `go.mod` — Go 프로젝트
- `docker-compose.yml`, `Dockerfile` — 컨테이너 환경
- `CLAUDE.md`, `.claude/` — Claude Code 설정
- DB 관련 설정 파일 (`.env`의 DATABASE_URL 등)
- 프로젝트 디렉토리 구조 전반

### 2. MCP 서버 추천

기술 스택에 따라 적합한 MCP 서버를 추천한다:

| 기술 스택 | 추천 MCP 서버 |
|-----------|---------------|
| **공통** | filesystem, git |
| **Python** | python-repl, filesystem, git |
| **Node.js** | filesystem, git, npm |
| **웹 개발** | browser, fetch, filesystem |
| **데이터 분석** | sqlite, postgres, filesystem |
| **PostgreSQL 사용** | postgres |
| **SQLite 사용** | sqlite |
| **API 개발** | fetch, filesystem, git |
| **문서 작업** | filesystem, fetch |
| **MicroPython/IoT** | filesystem, git, serial (있으면) |

추천 시 각 MCP 서버의 용도를 간략히 설명한다.

### 3. 현재 설치 상태 확인

현재 설치된 MCP 서버를 확인한다:

- **글로벌 설정**: `~/.claude/settings.json`의 `mcpServers` 섹션
- **프로젝트 설정**: `.claude/settings.local.json`의 `mcpServers` 섹션
- 이미 설치된 서버는 "설치됨"으로 표시하고, 누락된 서버만 추천한다.

### 4. 설치 안내 또는 자동 설치

사용자에게 추천 MCP 서버 목록을 보여주고 선택을 받는다:

- **자동 설치 가능한 경우**: `npx` 또는 `uvx` 기반 MCP 서버는 설정만 추가하면 됨
- **수동 설치 필요한 경우**: 설치 명령어와 공식 문서 링크를 제공

MCP 서버 설정 예시 (settings.json 형식):
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
    },
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git", "--repository", "/path/to/repo"]
    }
  }
}
```

### 5. 프로젝트별 설정 저장

- 프로젝트 루트에 `.claude/settings.local.json`이 없으면 생성한다.
- 선택한 MCP 서버 설정을 `mcpServers`에 추가한다.
- 기존 설정이 있으면 병합한다 (기존 항목을 덮어쓰지 않음).

### 6. 확인

- 설정 완료 후 현재 활성화된 MCP 서버 목록을 보여준다.
- Claude Code 재시작이 필요한 경우 안내한다.

## 참고

- MCP 서버 공식 목록: https://github.com/modelcontextprotocol/servers
- 설정 파일 위치:
  - 글로벌: `~/.claude/settings.json`
  - 프로젝트: `{project_root}/.claude/settings.local.json`

## 검증 기준

- [ ] 프로젝트 기술 스택이 감지됨
- [ ] 적합한 MCP 서버가 추천됨
- [ ] 선택한 MCP 서버가 설치/설정됨
- [ ] settings.json에 MCP 서버가 등록됨

## 변경 이력

| 날짜 | 변경 내용 | 트리거 |
|------|----------|--------|
| 2026-03-07 | 초기 생성 | 사용자 요청 |
| 2026-03-10 | 검증 기준, 변경 이력 추가 | /anima improve |
