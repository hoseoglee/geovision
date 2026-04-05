---
name: developer
description: |
  개발자 스킬 - SDD(스펙 기반 개발) + 테스트 하네스 + Ralph Loop을 통합한 자동화 개발 워크플로우.
  최대 병렬 분업: 독립 모듈을 Agent로 동시 구현, 테스트/Docker/문서를 병렬 생성.
  트리거: "개발해줘", "developer", "개발자 모드", "개발 시작", "기능 만들어줘", "풀 개발", "full dev", "개선해줘", "improve", "우려사항 찾아줘"
  DO NOT TRIGGER: 단순 버그 수정, 코드 리뷰, 리팩터링만 요청, 이미 SDD/하네스를 직접 지정한 경우
user_invocable: true
---

# Developer Skill

SDD(스펙 기반 개발), 테스트 하네스(TDD 루프), Ralph Loop(자동 반복)을 통합한 풀 개발 워크플로우.
**핵심 원칙: 독립적인 작업은 Agent 도구로 최대한 병렬 실행한다.**

## 사용법

```
/developer <feature_description> [--mode auto|guided] [--skip-spec] [--ralph]
# 기본 모드: auto (Ralph Loop). guided를 원하면 --mode guided 명시

/developer improve [--scope all|code|test|security|performance]
/developer youtube <url> [--name project_name] [--mode auto|guided]
```

- `feature_description`: 개발할 기능 설명
- `--mode auto`: Ralph Loop으로 자동 개발 **(기본값)**
- `--mode guided`: 단계별 사용자 확인 (명시적으로 지정 시)
- `--skip-spec`: 이미 스펙이 있으면 스펙 작성 건너뛰기
- `improve`: 현재 프로젝트를 분석하여 개선 사항을 제안하고, 사용자가 선택한 항목을 개발 프로세스로 실행
- `youtube <url>`: YouTube 영상의 스크립트를 가져와 프로젝트 생성 → 스펙 작성 → 개발까지 자동 실행
- `--name`: 프로젝트명 지정 (미지정 시 영상 제목에서 자동 추출)
- `--ralph`: auto 모드의 별칭

## 워크플로우 (최대 병렬 분업)

```
┌──────────────────────────────────────────────────────────┐
│  Phase 0: LEARN (과거 경험 참조)                          │
│  └─ developer_patterns.md 읽기 → 계획에 반영              │
│                                                          │
│  Phase 1: SPEC (순차 — 후속 작업의 기반)                  │
│  ├─ /sdd spec → 스펙 작성                                │
│  └─ /sdd plan → 구현 계획 + 의존성 그래프 생성            │
│                                                          │
│  Phase 2: SCAFFOLD (병렬 — 독립 산출물 동시 생성)          │
│  ├─ Agent A: 테스트 코드 작성 (Red)                       │
│  ├─ Agent B: 프로젝트 구조/보일러플레이트 생성             │
│  └─ Agent C: (웹) Dockerfile + docker-compose.yml 생성    │
│                                                          │
│  Phase 3: BUILD (최대 병렬 — 독립 모듈 동시 구현)          │
│  ├─ 의존성 그래프에서 병렬 그룹(Parallel Group) 추출       │
│  ├─ Group 1: [독립 모듈들] → 각각 Agent로 동시 구현       │
│  ├─ Group 2: [Group 1에 의존하는 모듈들] → 동시 구현      │
│  ├─ ...반복...                                           │
│  └─ 통합 코드: 모듈 간 연결/글루 코드 작성                 │
│                                                          │
│  Phase 4: HARNESS (순차 루프 — 전체 통합 검증)             │
│  └─ /test_harness → Red-Green 루프 (최대 10회)            │
│                                                          │
│  Phase 5: DEPLOY (웹 프로젝트, 순차)                      │
│  ├─ docker compose up --build -d                         │
│  └─ 헬스체크 + HTTP 200 확인                              │
│                                                          │
│  Phase 6: VERIFY (병렬 — 독립 검증 동시 수행)              │
│  ├─ Agent A: /sdd validate → 스펙 대비 검증               │
│  ├─ Agent B: /reflection → 자기 평가                      │
│  └─ Agent C: (웹) 브라우저/curl 검증                      │
│                                                          │
│  Phase 7: REPORT                                         │
│  └─ work_report → 작업 보고서                             │
│                                                          │
│  Phase 8: META-RETRO (워크플로우 자기 개선)                │
│  └─ developer_patterns.md 갱신 → 다음 개발에 반영          │
└──────────────────────────────────────────────────────────┘
```

## Phase 상세

### Phase 0: LEARN (과거 경험 참조)

**모든 개발 시작 전, 과거 패턴을 읽어 계획에 반영한다.**

1. `~/.anima/soul/memory/developer_patterns.md`를 읽는다
2. 현재 프로젝트의 기술 스택과 매칭되는 패턴이 있으면:
   - **최적 병렬 그룹 구조**를 계획에 반영한다
   - **반복되는 실수/함정**을 사전 경고로 plan에 포함한다
   - **기술 스택별 메모**를 constitution.md와 함께 참조한다
3. 매칭되는 패턴이 없으면 기본 워크플로우로 진행한다 (첫 사용 시)

### Phase 0.5: DIAGNOSE (버그/문제 수정 요청 시)

버그 수정, 장애 복구, "안 된다" 류의 요청일 때 **해결책 적용 전에** 반드시 수행한다.

1. **증상 확인**: 에러 메시지, 로그, 스크린샷을 먼저 확인한다. 사용자 보고 = 초기 가설일 뿐
2. **계층 분류**: 네트워크(DNS/프록시) vs 인증(OAuth/Basic Auth/키체인) vs 권한(파일/UID) vs 런타임(코드 버그) 어디인지 구분
3. **근본 원인 파악**: 증상 → 직접 원인 → 근본 원인까지 추적한 후에야 수정 시작
4. **수정 후 검증**: "고쳤다" 선언 전에 동일 조건으로 재현 시도하여 실제 해결됐는지 확인

### Phase 1: SPEC (순차)

스펙과 계획은 후속 모든 작업의 기반이므로 순차 실행한다.

1. **프로젝트 확인**
   - `specs/constitution.md` 존재 확인. 없으면 `/sdd init` 먼저 실행
   - 기존 스펙이 있는지 확인 (`--skip-spec` 시 건너뜀)

2. **스펙 작성** → `/sdd spec <feature_name>`
   - 사용자 요구사항으로부터 기능 스펙 생성
   - 5C 품질 기준 자체 검증

3. **구현 계획** → `/sdd plan <feature_name>`
   - 스펙으로부터 구현 계획 생성
   - **IMPORTANT: 의존성 그래프 필수 포함**
   - 계획의 각 Step에 의존성을 명시하여 병렬 가능 여부를 판단한다:
     ```markdown
     ## 의존성 그래프
     Step 1 (DB 모델)
     ├── Step 2 (API 엔드포인트)  ──┐
     ├── Step 3 (서비스 로직)     ──┼── Step 5 (통합 연결)
     └── Step 4 (유틸리티)        ──┘

     ## 병렬 그룹
     - Group 1 (병렬): Step 1
     - Group 2 (병렬): Step 2, Step 3, Step 4
     - Group 3 (순차): Step 5
     ```

### Phase 2: SCAFFOLD (병렬)

스펙/계획이 확정되면 다음 산출물을 **Agent 도구로 동시 생성**한다:

```
동시에 실행:
├─ Agent A: 테스트 코드 작성
│   - 스펙의 AC-*를 테스트 케이스로 변환
│   - 엣지 케이스(EC-*) 테스트 포함
│   - 이 시점에서 테스트는 반드시 실패해야 함 (Red)
│
├─ Agent B: 프로젝트 구조 생성 (아래 "폴더 구조 표준" 참조)
│   - 필요한 디렉토리/파일 스켈레톤 생성
│   - 의존성 파일(requirements.txt, package.json 등) 업데이트
│   - 공통 인터페이스/타입 정의 (다른 Agent가 참조할 계약)
│   - **표준 로깅 설정**: 아래 "로깅 규약" 참조 — core/logger.py 보일러플레이트 자동 생성
│   - **logs/ 디렉토리** 생성 + .gitignore에 logs/*.log 추가
│
└─ Agent C: (웹 프로젝트만) Docker 설정 생성
    - Dockerfile: 멀티스테이지 빌드, 의존성 캐싱, 비root 사용자
    - docker-compose.yml: 서비스, 포트, 환경변수, 헬스체크
    - .dockerignore
```

**Agent 프롬프트 작성 시 필수 포함 사항:**
- 프로젝트 루트 경로
- 스펙 파일 경로 (읽어서 참조하도록)
- 계획 파일 경로 (읽어서 참조하도록)
- constitution.md 경로 (코딩 컨벤션 참조)
- 담당 범위 (어떤 파일을 생성/수정하는지 명확히)
- **다른 Agent가 담당하는 파일은 절대 수정하지 않도록 경고**

#### 폴더 구조 표준 + 로깅 규약

> **상세**: `references/scaffold_details.md` 참조
> - 5가지 폴더 구조 원칙 (Root=Gateway, 관심사 분리, 산출물 비추적, 내부 아키텍처 보존, 도구 설정 숨김)
> - Python/Node 프로젝트 템플릿
> - 로깅 규약 (logs/app.log + logs/error.log, JSON 구조화, log_healer 연동)

### Phase 3: BUILD (최대 병렬)

구현 계획의 의존성 그래프에 따라 **병렬 그룹별로 Agent를 투입**한다.

```
예시: 5개 Step, 의존성 그래프 기반 분업

Group 1 (병렬 실행):
├─ Agent 1: Step 1 (DB 모델 정의)
└─ Agent 2: Step 4 (독립 유틸리티)

Group 2 (Group 1 완료 후, 병렬 실행):
├─ Agent 3: Step 2 (API 엔드포인트 — Step 1에 의존)
└─ Agent 4: Step 3 (서비스 로직 — Step 1에 의존)

Group 3 (Group 2 완료 후):
└─ 메인: Step 5 (통합 — Step 2,3에 의존)
```

**Agent 간 충돌 방지 규칙:**
1. 각 Agent에 **담당 파일 목록을 명시적으로 할당**한다
2. 공유 파일(예: `__init__.py`, 라우터 등록)은 **마지막 통합 단계에서 메인이 처리**한다
3. Agent 프롬프트에 다음을 포함한다:
   ```
   당신은 다음 파일만 생성/수정합니다:
   - src/models/user.py (생성)
   - src/models/__init__.py (수정 — User 임포트 추가만)

   절대 수정하지 마세요:
   - src/api/ (다른 Agent 담당)
   - src/services/ (다른 Agent 담당)

   참조만 하세요 (읽기 전용):
   - specs/features/{feature}.md
   - specs/plans/{feature}_plan.md
   - src/core/base.py (기존 코드)
   ```
4. 인터페이스 계약: Phase 2에서 생성한 타입/인터페이스 정의를 모든 Agent가 참조한다

**통합 단계 (메인이 직접 수행):**
- 각 Agent 결과물을 확인한다
- 공유 파일(라우터 등록, __init__.py export 등)을 업데이트한다
- 모듈 간 글루 코드를 작성한다
- import 오류/타입 불일치를 수정한다

### Phase 4: HARNESS (순차 루프)

통합이 완료되면 전체 테스트를 돌린다.

- `/test_harness` 실행: 테스트 실행 → 실패 분석 → 수정 → 재실행
- 모든 테스트 통과할 때까지 반복 (최대 10회)
- 실패 수정 시에도 **독립적인 실패는 Agent로 병렬 수정 가능**:
  ```
  실패 3건 분석:
  ├─ test_user_create: models/user.py 버그 → Agent A 수정
  ├─ test_api_endpoint: api/routes.py 버그 → Agent B 수정
  └─ test_integration: 위 둘 해결 후 재확인 (순차)
  ```

### Phase 5: DEPLOY (웹 프로젝트, 순차)

웹 프로젝트인 경우에만 실행한다.

1. **컨테이너 빌드 및 실행**
   - `docker compose up --build -d` 실행
   - 빌드 실패 시 로그 분석 → 수정 → 재빌드 (최대 5회)
   - 컨테이너 상태 확인: `docker compose ps` → running
   - 헬스체크: `docker inspect --format='{{.State.Health.Status}}'` → healthy

2. **HTTP 확인**
   - `curl` 또는 `WebFetch`로 HTTP 200 확인

3. **Cloudflare Tunnel 연결 (Public URL)**
   - `cloudflared` 설치 확인. 없으면 설치 안내:
     - Windows: `winget install cloudflare.cloudflared`
     - Mac: `brew install cloudflared`
     - Linux: `curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared`
   - Quick Tunnel (임시 public URL):
     ```bash
     cloudflared tunnel --url http://localhost:{PORT} &
     ```
   - 출력에서 `https://xxx.trycloudflare.com` URL을 캡처한다
   - WebFetch로 public URL 접속 확인 (HTTP 200)
   - **Named Tunnel** (영구 도메인이 설정된 경우):
     - `cloudflared tunnel run {tunnel_name}` 사용
     - 프로젝트 `.env`에 `CLOUDFLARE_TUNNEL_NAME`이 있으면 해당 터널 사용

4. **Telegram 알림 (Jarvis)**
   - Public URL 확보 후 Telegram Jarvis 봇으로 배포 완료 알림 전송
   - 필요 환경변수 (`.env` 또는 Anima secrets에서 조회):
     - `TELEGRAM_BOT_TOKEN`: Jarvis 봇 토큰
     - `TELEGRAM_CHAT_ID`: 알림 받을 채팅 ID
   - 알림 전송:
     ```bash
     curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
       -d chat_id="${TELEGRAM_CHAT_ID}" \
       -d parse_mode="Markdown" \
       -d text="🚀 *배포 완료*
     프로젝트: ${PROJECT_NAME}
     URL: ${PUBLIC_URL}
     상태: ✅ Healthy
     시간: $(date '+%Y-%m-%d %H:%M')"
     ```
   - 전송 성공 여부 확인 (`"ok":true`)
   - 실패 시 에러 로그 출력하고 계속 진행 (알림 실패가 배포를 막지 않음)

### Phase 6: VERIFY (병렬)

검증 작업들은 서로 독립적이므로 **Agent로 동시 수행**한다:

```
동시에 실행:
├─ Agent A: /sdd validate <feature_name>
│   - 스펙 대비 구현 검증
│   - 스펙 드리프트 감지
│   - specs/validations/{feature}_validation.md 생성
│
├─ Agent B: /reflection
│   - 5가지 관점 자체 평가
│   - 개선점 도출
│
└─ Agent C: (웹 프로젝트) 브라우저 검증
    - **IMPORTANT — Chrome MCP로 실제 브라우저에서 검증 (필수)**:
      1. `mcp__claude-in-chrome__tabs_context_mcp` → 탭 생성
      2. `mcp__claude-in-chrome__navigate` → localhost URL 접속
      3. `mcp__claude-in-chrome__computer` screenshot → 페이지 렌더링 확인
      4. `mcp__claude-in-chrome__read_page` → 변경된 UI 요소가 존재하는지 확인
      - Chrome MCP 연결 불가 시: `curl` health check + `docker logs` 에러 확인으로 대체
    - **IMPORTANT — public URL이 있으면 반드시 public URL에서도 검증**
      - DuckDNS, Cloudflare Tunnel 등으로 배포된 URL에서 실제 접속 확인
      - Chrome MCP `navigate` 또는 curl로 public URL 접근
      - HTTPS 인증서, 인증, 프록시 경유 동작 확인
    - 에러 발견 시 보고
```

검증 결과를 종합하여 사용자에게 보고한다.
- 모든 검증 PASS → Phase 7로 진행
- FAIL 항목 → 수정 후 해당 검증만 재실행

### Phase 7: REPORT (파피루스 완료 보고서)

- `work_report` 스킬 실행 → `~/papyrus/records/`에 파피루스 완료 보고서 작성
- 보고서 필수 포함 항목:
  - Vessel ID, 소요시간, 토큰 사용량 (session_stats.py로 수집)
  - AI가 이해한 요청사항, 작업 내용, 작업 결과
  - 관련 문서(wikilink), 참고자료, 후속 작업 제안 5건
  - 회고(잘한 점, 개선할 점, 교훈)
- Papyrus git push로 GitHub 동기화
- 교훈이 있으면 `~/.anima/soul/memory/lessons.md`에 반영
- 병렬 실행 통계 포함 (몇 개의 Agent를 사용했는지, 어떤 그룹으로 분업했는지)

### Phase 8: META-RETROSPECTIVE (워크플로우 자기 개선)

**코드가 아닌 *워크플로우 자체*를 회고하여 `developer_patterns.md`를 업데이트한다.**

work_report 작성 후, 다음 질문에 답하며 패턴 파일을 갱신한다:

1. **프로젝트 유형별 전략**
   - 이 프로젝트의 기술 스택은? (예: FastAPI + PostgreSQL)
   - 어떤 병렬 그룹 구조가 효과적이었나?
   - Scaffold 단계에서 추가로 필요했던 것은?
   - 평균 하네스 반복 횟수는?
   - → `## 프로젝트 유형별 최적 전략`에 추가/갱신

2. **반복 실수 감지**
   - 이번에 예상치 못한 실패가 있었나?
   - 같은 유형의 실수가 이전에도 있었나? (기존 항목 확인)
   - 2회 이상 반복이면 → `## 반복되는 실수/함정`에 등록

3. **병렬화 효과 평가**
   - 어떤 Agent 분업이 잘 작동했나?
   - 오히려 병렬화가 비효율적이었던 부분은?
   - → `## 효과적인 병렬화 패턴`에 기록

4. **기술 스택 메모**
   - 이번에 새로 알게 된 기술적 팁이 있는가?
   - → `## 기술 스택별 메모`에 추가

5. **워크플로우 변경 필요성**
   - developer 스킬 자체의 Phase 구조나 규칙을 변경하면 좋겠다는 점이 있나?
   - → `## 워크플로우 개선 이력` 테이블에 기록
   - **IMPORTANT**: SKILL.md 자체는 수정하지 않는다. 개선 제안만 기록하고, 사용자 승인 후 별도로 수정한다.

패턴 파일 갱신 후 `~/.anima/sync.sh push`로 동기화한다.

## YouTube 모드 (/developer youtube)

> **상세**: `references/youtube_mode.md` 참조

YouTube 영상의 스크립트를 소스로 프로젝트 생성→스펙→개발 완료까지 자동 진행.

**Phase**: Y1(FETCH) → Y2(ANALYZE) → Y3(CREATE) → Y4(SPEC) → Phase 0~8(일반 워크플로우)

- Y1: yt-dlp/youtube-transcript-api/WebFetch로 스크립트 추출 (한국어 우선)
- Y2: 스크립트 분석 → 프로젝트 개요, 기능, 스택, MVP 도출 → 사용자 확인
- Y3: `/create_project`로 워크스페이스+papyrus 생성, `docs/youtube_source.md`에 원본 보존
- Y4: 분석 결과를 SDD 스펙으로 변환 → Phase 1(plan)부터 합류

---

## Ralph Loop 모드 (--mode auto / --ralph)

`auto` 모드에서는 ralph-loop 플러그인을 사용하여 전체 워크플로우를 자동으로 반복 실행한다.

```bash
/ralph-loop "
다음 기능을 개발하세요:
{feature_description}

워크플로우:
1. specs/features/{feature_name}.md 스펙이 없으면 작성
2. specs/plans/{feature_name}_plan.md 계획이 없으면 작성 (의존성 그래프 필수)
3. 의존성 그래프 기반으로 병렬 그룹 판별
4. 테스트 + 보일러플레이트 + (Docker 설정)을 Agent로 동시 생성
5. 병렬 그룹별로 Agent 투입하여 모듈 동시 구현
6. 통합 후 테스트 하네스 루프
7. 웹 프로젝트면 docker compose up → 헬스체크 → cloudflared tunnel → Telegram Jarvis 알림
8. 검증(validate + reflection + 웹 검증)을 Agent로 동시 수행
9. work_report 스킬로 파피루스 완료 보고서 작성 → ~/papyrus/records/에 저장 → git push
10. 모든 검증 통과하면 <promise>DEVELOPMENT_COMPLETE</promise> 출력

진행 상황은 specs/validations/{feature_name}_validation.md에 기록하세요.
" --completion-promise "DEVELOPMENT_COMPLETE" --max-iterations 30
```

**auto 모드 주의사항:**
- 사용자 입력 없이 자동 진행되므로 스펙이 충분히 명확해야 함
- `--max-iterations 30`이 안전 장치 역할
- 중간에 중단: `/cancel-ralph`

## Improve 모드 (/developer improve)

> **상세**: `references/improve_mode.md` 참조

프로젝트 우려 사항을 자동 탐색→심각도별 분류→사용자 선택→개발 프로세스 실행.

**Step**: SCAN(병렬 5 Agent) → PRIORITIZE(심각도 분류) → SELECT(사용자 선택) → EXECUTE(Phase 진입)

- `--scope all|code|test|security|performance`로 탐색 범위 제한 가능
- 소규모(1-2파일) → Phase 3+4, 중/대규모 → Phase 1부터 풀 프로세스
- 독립 항목은 Agent로 병렬 실행, 의존성 있는 항목은 순차

## guided vs auto 선택 기준

| 상황 | 권장 모드 |
|------|----------|
| 요구사항이 명확하고 테스트 가능 | `auto` (Ralph) |
| 요구사항 불명확, 논의 필요 | `guided` |
| 기존 코드 수정이 많은 경우 | `guided` |
| 그린필드 프로젝트 | `auto` (Ralph) |
| 첫 번째 기능 개발 | `guided` |

## 병렬화 요약 (전체 흐름)

```
Improve: SCAN           [병렬] 코드/테스트/보안/성능/구조 Agent 탐색
                            │
         PRIORITIZE     [순차] 심각도 분류 → 사용자 선택
                            │
         EXECUTE        [병렬/순차] 선택 항목 → 규모별 Phase 진입
                            │
─────── 일반 개발 흐름 ───────
                            │
Phase 0: LEARN          [순차] developer_patterns.md 참조
                            │
Phase 1: SPEC          [순차] spec → plan (의존성 그래프 포함)
                            │
Phase 2: SCAFFOLD       [병렬] ┬─ Agent: 테스트 작성
                            ├─ Agent: 구조/보일러플레이트
                            └─ Agent: Docker 설정 (웹)
                            │
Phase 3: BUILD          [최대 병렬] 의존성 그래프 기반 그룹별 Agent 투입
                            │       Group 1 → Group 2 → ... → 통합
                            │
Phase 4: HARNESS        [순차 루프] 테스트 실행 → (실패 시 병렬 수정)
                            │
Phase 5: DEPLOY         [순차] docker compose → cloudflare tunnel → telegram (웹만)
                            │
Phase 6: VERIFY         [병렬] ┬─ Agent: sdd validate
                            ├─ Agent: reflection
                            └─ Agent: 웹 검증 (웹만)
                            │
Phase 7: REPORT         [순차] work_report
                            │
Phase 8: META-RETRO     [순차] developer_patterns.md 갱신
```

## 스킬 의존성

```
developer
├── sdd (spec, plan, implement, validate)
├── test_harness (TDD 루프)
├── ralph-loop (플러그인, auto 모드)
├── reflection (자기 평가)
├── work_report (보고서)
└── create_project (youtube 모드에서 프로젝트 생성)
```

## 검증 기준

- [ ] SDD 스펙/계획 생성 완료 (의존성 그래프 포함)
- [ ] Phase 2에서 Agent 병렬 생성 실행됨
- [ ] Phase 3에서 의존성 그래프 기반 병렬 그룹별 Agent 구현 실행됨
- [ ] Agent 간 파일 충돌 없음
- [ ] 테스트 작성 및 전체 통과
- [ ] 스펙 검증(validate) PASS
- [ ] Phase 6에서 검증 작업 Agent 병렬 실행됨
- [ ] 웹 프로젝트: Docker Compose로 컨테이너 정상 실행
- [ ] 웹 프로젝트: 브라우저에서 페이지 렌더링 정상
- [ ] 웹 프로젝트: Cloudflare Tunnel public URL 생성 및 접속 확인
- [ ] 웹 프로젝트: public URL이 있으면 해당 URL에서 E2E 검증 완료
- [ ] 웹 프로젝트: Telegram Jarvis로 배포 알림 전송 완료
- [ ] 작업 보고서 생성 (분업 현황 포함)
- [ ] Phase 0: 과거 패턴 참조 (있으면 계획에 반영)
- [ ] Phase 8: developer_patterns.md 메타-회고 갱신
- [ ] auto 모드: Ralph Loop 정상 동작
- [ ] improve: 병렬 Agent 스캔 실행됨
- [ ] improve: 심각도별 분류 제안 목록 사용자에게 제시됨
- [ ] improve: 선택 항목이 적절한 Phase부터 실행됨
- [ ] improve: 실행 후 기존 테스트 통과 확인
- [ ] youtube: 스크립트 추출 성공 (3가지 방법 중 1개 이상)
- [ ] youtube: 분석 결과(개요, 기능, 스택, MVP)가 사용자에게 제시됨
- [ ] youtube: /create_project로 프로젝트 생성됨
- [ ] youtube: docs/youtube_source.md에 원본 스크립트 보존됨
- [ ] youtube: SDD 스펙이 스크립트 기반으로 작성됨
- [ ] youtube: 이후 일반 Developer 워크플로우(Phase 0~8) 실행됨

## 변경 이력

| 날짜 | 변경 내용 | 트리거 |
|------|----------|--------|
| 2026-03-10 | YouTube 모드 추가 (Phase Y1~Y4 + 검증 기준) | 사용자 요청 |
