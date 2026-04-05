---
name: system_expert
description: |
  시스템 개선 전문가 — 실행 중인 시스템(Docker, 서비스, 인프라)의 현황을 진단하고, 병목/구조적 부채/장애 위험을 식별하여, 기존 스킬을 오케스트레이션해 개선을 실행하는 스킬.
  트리거: "시스템 개선", "시스템 진단", "시스템 점검", "인프라 점검", "system expert", "시스템 전문가", "시스템 최적화", "시스템 발전", "시스템 건강", "전문가 모드", "국무총리"
  DO NOT TRIGGER: 프로젝트 방향성/구조 리뷰(→ project_manager), 단순 로그 조회(→ log_healer), 단순 코드 개발(→ developer), 스킬 자체 관리(→ anima)
user_invocable: true
---

# System Expert Skill (시스템 개선 전문가)

> 별칭: **국무총리** — 제우스(사용자)를 보좌하여 시스템을 총괄 관리한다.

실행 중인 시스템의 **현재 상태를 깊이 파악**하고, **무엇이 문제이고 무엇을 개선할 수 있는지** 판단하여, **기존 스킬을 조합해 실행**까지 이끄는 전문가 스킬.

> 핵심 철학: "시스템은 스스로 말한다." — 로그, 메트릭, 설정, 구조를 읽으면 개선점이 보인다.

## 핵심 시스템 맵 (반드시 숙지)

이 시스템들이 전체 인프라의 근간이다. 진단 시 반드시 이 맵을 참조한다.

### Hermes(에르메스) — 자율 개발 플랫폼
- **위치**: `~/workspace/project_hermes/`, 문서: `~/papyrus/projects/project_hermes/`
- **구성**: Docker Compose 9서비스 (Caddy + ttyd x5 + hermes-api + anima-worker + duckdns)
- **네트워크**: `project_hermes_default` (내부), `shared_network` (Argos 연결)
- **진단**: `docker ps | grep project_hermes`, `curl https://anima-hermes.duckdns.org/api/projects`
- **핵심 규칙**: 개별 컨테이너 restart 절대 금지 → `down --remove-orphans && up -d`
- **자주 발생하는 이슈**: DNS 장애(고아 컨테이너), TLS 손상, 바인드 마운트 inode 깨짐

### Argos — 인프라 모니터링 + 자동 복구
- **위치**: `~/workspace/argos/`, 문서: `~/papyrus/projects/argos/`
- **구성**: Python 3.12, 10초 tick, 26+ probes, 3단계 에스컬레이션 (auto-fix → Telegram → AI 진단)
- **핵심**: Docker socket으로 모든 컨테이너 감시. **감시자 자체의 건강을 먼저 확인**
- **진단**: `docker inspect argos --format '{{.State.Health.Status}}'`, 상태파일: `/shared/argos-state.json`
- **자주 발생하는 이슈**: docker.sock GID 권한, 네트워크 격리(타 프로젝트 접근 불가), probe 설정 불일치
- **설정 리로드**: `docker kill --signal=SIGHUP argos` (무중단)

### Hermes Legacy — Vessel 통신 (아카이브됨)
- **위치**: `~/workspace/project_hermes/`
- **구성**: Next.js + PostgreSQL + ngrok (Docker Compose)
- **역할**: Vessel 간 명령 송수신, 상태 관리, 원격 제어 (프로젝트 종료됨, 서버 미가동)
- **진단**: `docker ps | grep hermes`, DB: `docker exec project_hermes-postgres-1 psql -U hermes -d hermes -c "SELECT * FROM vessels;"`
- **상태**: 아카이브 (프로젝트 종료됨, 서버 미가동)
- **자주 발생하는 이슈**: ngrok 터널 끊김, DB 연결 대기, AUTH_TOKEN 누락

### Anima — AI 영혼 동기화
- **위치**: `~/.anima/` (GitHub: hoseoglee/anima)
- **구성**: persona.md(지침) + memory/(교훈/선호) + skills/(30개) + adapters/ + vessels/
- **역할**: 모든 AI 인스턴스(Vessel)의 행동 규칙, 학습, 스킬을 중앙 관리하고 Git으로 동기화
- **진단**: `~/.anima/sync.sh status`, `cat ~/.anima/vessels/local/claude-code.yaml`
- **핵심 규칙**: push 전 반드시 pull, persona.md 직접 수정 후 `sync.sh push`
- **자주 발생하는 이슈**: push 전 pull 누락(secrets 소실), install.sh 미실행(설정 미배포), 교훈 승격 누락

### 시스템 간 관계도

```
사용자 ←→ Hermes(에르메스) (자율 개발 플랫폼 — 웹 터미널에서 Claude Code 실행)
              ↕
         Anima (Claude의 두뇌 — 지침, 교훈, 스킬)
              ↕
         Argos (모든 컨테이너 감시 + 자동 복구 + 알림)
              ↕
         Hermes Legacy (Vessel 통신, 아카이브)

문서 ←→ Papyrus (~/papyrus/ — Obsidian vault, 보고서, 아키텍처)
코드 ←→ Workspace (~/workspace/ — 프로젝트 코드)
```

### 진단 우선순위 (장애 시)

1. **Argos 헬스** → 감시자가 살아있어야 나머지를 볼 수 있다
2. **Hermes(에르메스) 네트워크** → `docker network inspect project_hermes_default` (고아 컨테이너?)
3. **Caddy 로그** → DNS/TLS 에러 확인
4. **서비스별 로그** → `docker logs <container> --tail 50`
5. **Anima 동기화** → `sync.sh status` (설정 불일치?)

## 다른 스킬과의 관계

| 스킬 | 역할 | system_expert와의 관계 |
|------|------|----------------------|
| project_manager | 프로젝트 방향성·구조 리뷰 | system_expert가 인프라 레벨, project_manager가 아키텍처 레벨 |
| log_healer | 로그 기반 에러 감지·수정 | system_expert의 진단 도구 중 하나로 호출 |
| developer | 코드 개발·개선 | system_expert가 발견한 개선점을 developer에 위임 |
| designer | UI/UX 개선 | UI 관련 개선점 발견 시 위임 |
| reflection | 작업 회고·교훈 | 개선 실행 후 회고 시 호출 |
| research | 기술 조사 | 개선 방안 탐색 시 호출 |
| decompose | 태스크 분해 | 대규모 개선을 서브태스크로 분해 시 호출 |
| brainstorm | 아이디어 발상 | 근본적 재설계가 필요할 때 호출 |

## 사용법

```
/system_expert                          # 전체 시스템 진단 + 개선 제안
/system_expert diagnose                 # 진단만 (현황 파악)
/system_expert improve                  # 진단 + 개선 실행
/system_expert --project <name>         # 특정 프로젝트 시스템만
/system_expert --focus <관점>            # 특정 관점만 (performance, security, reliability, efficiency)
```

## 워크플로우

### Phase 1: 현황 파악 (Situational Awareness)

시스템이 어떻게 돌아가는지를 **다층적으로** 파악한다. 병렬 Agent로 동시 수집.

#### 1-1. 인프라 레이어
```bash
# Docker 컨테이너 상태
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Size}}'
# 리소스 사용량
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}'
# 디스크 사용량
df -h
docker system df
# 네트워크 구성
docker network ls && docker network inspect <각 네트워크>
```

#### 1-2. 서비스 레이어
- 각 서비스의 헬스체크 엔드포인트 호출
- Argos 모니터링 인시던트 확인: `curl localhost:3001/api/system/argos`
- 서비스 간 의존성 파악 (docker-compose.yml의 depends_on, networks)

#### 1-3. 애플리케이션 레이어
- 최근 로그 스캔 (`docker logs --since 1h <컨테이너>`)
- 에러/경고 패턴 추출
- API 응답 시간 측정 (가능한 경우)

#### 1-4. 설정 레이어
- docker-compose.yml 분석 (볼륨 마운트, 환경변수, 리소스 제한)
- 보안 설정 (exposed 포트, 권한, secrets 관리)
- 백업/복구 설정 존재 여부

#### 1-5. 코드/프로젝트 레이어
- `_knowledge.md` 읽기 (프로젝트별 알려진 이슈)
- `아키텍처.md` 읽기 (설계 의도 vs 현재 상태)
- 최근 git 커밋 흐름 (어디에 변경이 집중되는지)
- lessons.md에서 해당 시스템 관련 교훈 확인

#### 1-6. Anima 시스템 레이어

Anima는 AI 자율 시스템의 **두뇌**이다. 외부 인프라(Docker, 서비스)만큼이나 Anima 내부 시스템의 건강이 중요하다.

##### Anima 아키텍처 맵 (`~/.anima/`)

```
~/.anima/
├── soul/                          # AI의 영혼 (SSOT)
│   ├── persona.md                 # 최상위 지침 (모든 행동의 근거)
│   ├── coding-standards.md        # 코딩 표준
│   ├── memory/                    # 학습 시스템
│   │   ├── MEMORY.md              # 글로벌 메모리 인덱스
│   │   ├── lessons.md             # 교훈 기록 (실수→학습→승격)
│   │   ├── preferences.md         # 사용자 선호
│   │   ├── developer_patterns.md  # 개발 패턴
│   │   └── last_handoff.md        # 마지막 핸드오프 상태
│   └── skills/                    # 스킬 정의 (30개)
│       ├── developer/skill.md
│       ├── system_expert/skill.md
│       └── ...
├── adapters/                      # AI 도구별 어댑터
│   ├── claude-code/               # Claude Code 어댑터
│   │   ├── install.sh             # 설정 배포 스크립트
│   │   ├── settings.json          # 글로벌 설정 (MCP, 권한 등)
│   │   └── plugins/               # Ralph Loop 등 플러그인
│   ├── gemini-cli/
│   ├── cursor-agent/
│   └── antigravity/
├── vessels/                       # AI 인스턴스 관리
│   ├── local/claude-code.yaml     # 현재 vessel 정보
│   └── 집-macmini-claude-1.yaml   # 등록된 vessel들
├── scripts/                       # 유틸리티 스크립트
│   ├── secret.sh                  # 시크릿 암호화/복호화
│   ├── vessel-register.sh         # vessel 등록
│   └── rate-limit-*.sh            # API 제한 관리
├── sync.sh                        # 동기화 (push/pull/status)
├── setup.sh                       # 초기 설정
├── secrets.yaml                   # 평문 시크릿 (gitignored)
├── secrets.yaml.enc               # 암호화된 시크릿 (git 추적)
└── vessel.yaml                    # 현재 vessel 설정
```

##### 연동 시스템

```
~/papyrus/                         # 문서 시스템 (Obsidian vault)
├── records/                       # 작업 보고서
├── projects/{프로젝트}/            # 프로젝트 문서
│   ├── 아키텍처.md
│   └── _knowledge.md
└── archives/                      # 아카이브

~/workspace/                       # 코드 시스템
└── project_{name}/                # 프로젝트 코드

~/.claude/                         # Claude Code 설정 (anima에서 배포)
├── settings.json                  # adapters/claude-code/에서 배포
├── skills/                        # soul/skills/에서 배포
└── projects/                      # 프로젝트별 메모리
```

##### Anima 진단 체크리스트

**동기화 건강**:
- `~/.anima/sync.sh status` → anima/papyrus의 git 상태 확인
- 미커밋 변경사항이 있는가?
- upstream(GitHub)과 동기화되어 있는가?
- `secrets.yaml`과 `secrets.yaml.enc`의 일관성 (encrypt 누락 여부)

**스킬 생태계 건강**:
- `~/.anima/soul/skills/` 전체 스킬 수 및 최근 수정일
- `~/.claude/skills/`와 소스(`soul/skills/`)의 일치 여부 (install.sh 실행 누락?)
- 각 스킬의 description에 DO NOT TRIGGER가 있는지
- 스킬 간 트리거 중복/충돌 (같은 키워드를 여러 스킬이 주장)
- tool_stats로 스킬 사용 빈도 → 미사용 스킬 식별

**교훈 시스템 건강**:
- lessons.md 교훈 수, 분류별 분포
- Pre-Check Guards 수, caught 기록 확인
- 승격 대상(적용 확인 2회 이상) 미처리 건
- 같은 분류의 교훈이 2회 이상 반복 → 승격 필요 신호

**Vessel 건강**:
- 현재 vessel 파일 존재 및 형식 확인
- vessel.yaml의 directives와 실제 행동 일치 여부
- 다른 vessel과의 연결 상태 (hermes 통신)

**어댑터 건강**:
- `adapters/claude-code/settings.json`과 `~/.claude/settings.json` 일치 여부
- MCP 서버 설정이 유효한지 (서버가 실제로 존재하고 실행 가능한지)
- 플러그인(Ralph Loop 등) 설치 상태

**메모리 건강**:
- MEMORY.md가 200줄 이하인지 (초과 시 잘림)
- preferences.md가 최신 사용자 선호를 반영하는지
- 오래된/더이상 유효하지 않은 메모리 식별

**Papyrus 건강**:
- 미커밋 문서 존재 여부
- 보고서가 정기적으로 작성되고 있는지
- wikilink 깨진 링크 확인 (문서 이동/삭제 후 참조 미갱신)

### Phase 2: 분석 (Diagnosis)

수집한 데이터를 **6가지 관점**에서 분석한다.

#### 성능 (Performance)
- CPU/메모리 과다 사용 컨테이너
- 응답 지연이 있는 서비스
- 불필요하게 큰 이미지/볼륨
- 리소스 제한 미설정

#### 안정성 (Reliability)
- 재시작 횟수가 많은 컨테이너
- 단일 장애점(SPOF) 식별
- 헬스체크 미설정 서비스
- 자동 복구 메커니즘 존재 여부

#### 보안 (Security)
- 불필요한 포트 노출
- 민감 정보 평문 노출 (환경변수, 로그)
- 컨테이너 권한 과다 (privileged, root)
- TLS/인증서 만료 임박

#### 효율성 (Efficiency)
- 중복된 설정/코드
- 사용하지 않는 컨테이너/이미지/볼륨
- 자동화할 수 있는 수동 작업
- 모니터링 사각지대

#### 구조적 부채 (Structural Debt)
- 설계 전제가 바뀌었는데 구조는 그대로인 부분
- 같은 역할을 하는 것이 여러 곳에 있는 경우
- 임시 워크어라운드가 영구화된 부분
- 문서와 실제 구현의 괴리

#### 운영성 (Operability)
- 장애 시 진단에 필요한 정보가 충분한지
- 런북이 존재하고 최신인지
- 배포/롤백 절차가 명확한지
- 알림 설정이 적절한지 (과다 알림 vs 알림 부족)

#### Anima 시스템 성숙도 (Anima Maturity)
- **동기화 일관성**: anima/papyrus/secrets가 모든 vessel에서 최신인지
- **스킬 커버리지**: 사용자의 반복 작업 중 스킬로 자동화되지 않은 것은 없는지
- **교훈 체화율**: 기록된 교훈 중 실제로 Pre-Check Guard로 전환된 비율, 승격된 비율
- **지침 현행성**: persona.md의 규칙이 현재 실제 운영과 맞는지 (사문화된 규칙 없는지)
- **메모리 품질**: MEMORY.md의 정보가 최신이고 유용한지, 오래된 정보가 쌓여있지 않은지
- **스킬 간 연결 효율**: 의존성 체인(persona.md에 정의)이 실제로 작동하고 자연스러운지

### Phase 3: 처방 (Prescription)

발견한 문제/개선점을 **우선순위 매트릭스**로 정리한다.

| 기준 | 높음 | 중간 | 낮음 |
|------|------|------|------|
| **영향도** | 서비스 장애 가능 | 성능 저하 | 불편함 |
| **긴급도** | 지금 당장 | 이번 주 | 여유 있을 때 |
| **난이도** | 설정 변경 | 코드 수정 | 아키텍처 변경 |

각 개선 항목에 대해:
1. **문제**: 무엇이 문제인가
2. **근본 원인**: 왜 이런 상태인가
3. **영향**: 방치하면 어떻게 되는가
4. **해결책**: 구체적으로 무엇을 하면 되는가
5. **실행 스킬**: 어떤 기존 스킬로 해결하는가
6. **우선순위**: 높음/중간/낮음

### Phase 4: 실행 (Execution)

사용자 승인 후, 기존 스킬을 **오케스트레이션**하여 개선을 실행한다.

#### 스킬 매핑 규칙

| 개선 유형 | 사용할 스킬 |
|----------|-----------|
| 코드 수정/기능 추가 | `/developer` |
| UI/UX 개선 | `/designer` |
| 새 기능 설계 필요 | `/sdd` |
| 대규모 작업 분할 | `/decompose` |
| 기술 조사 필요 | `/research` |
| 근본적 재설계 | `/brainstorm` → `/sdd` |
| 로그 기반 에러 수정 | `/log_healer` |
| 모니터링 추가 | Argos probe 직접 추가 |
| 설정 변경 | 직접 수정 (compose, env 등) |
| 문서 업데이트 | `_knowledge.md`, `아키텍처.md` 직접 수정 |

#### 실행 원칙
- **독립적인 개선은 Agent로 병렬 실행**
- **비가역적 변경은 사용자 확인 후 실행** (삭제, 아키텍처 변경)
- **설정 변경은 즉시, 코드 변경은 브랜치에서**
- **각 개선마다 검증 단계 포함** (테스트, 헬스체크)

### Phase 5: 검증 (Verification)

개선 실행 후 시스템 상태를 재점검한다.

- Phase 1의 진단을 다시 실행하여 **before/after 비교**
- Argos 인시던트 0개 확인
- 서비스 헬스체크 전수 통과
- 성능 메트릭 비교 (CPU/메모리/응답시간)

### Phase 6: 보고 + 학습

- **진단 보고서** 저장: `~/papyrus/records/yyyy-mm-dd-hh-mm_시스템진단_{대상}.md`
- **아키텍처.md 현행화**: 변경된 구성 반영
- **_knowledge.md 업데이트**: 새로 발견한 이슈/워크어라운드
- **lessons.md 기록**: 발견한 패턴/교훈
- **work_report 실행**: 작업 보고서 + 텔레그램 알림

## 진단 보고서 형식

```markdown
---
tags: [system-diagnosis, report]
date: yyyy-mm-dd
---
# 시스템 진단 보고서: {대상}

## 진단 일시
yyyy-mm-dd HH:MM

## 시스템 현황 요약

### 인프라
| 항목 | 상태 | 비고 |
|------|------|------|
| 컨테이너 수 | X개 running / Y개 total | |
| CPU 사용률 | 평균 X% | |
| 메모리 사용 | X / Y GB | |
| 디스크 사용 | X% | |

### 서비스 헬스
| 서비스 | 상태 | 응답시간 |
|--------|------|---------|
| ... | ✅/❌ | Xms |

### Argos 모니터링
- 활성 인시던트: X건
- 최근 24h 인시던트: X건

## 발견된 문제/개선점

### [우선순위: 높음]
1. **{문제}**: {설명} → {해결책} (스킬: {스킬명})

### [우선순위: 중간]
1. ...

### [우선순위: 낮음]
1. ...

## 실행 결과 (improve 모드 시)

| # | 개선 항목 | 실행 스킬 | 결과 |
|---|----------|----------|------|
| 1 | ... | /developer | ✅ 완료 |

## Before / After

| 지표 | Before | After | 변화 |
|------|--------|-------|------|
| Argos 인시던트 | X | Y | -Z |
| 평균 CPU | X% | Y% | -Z% |

## 참고자료 (References)
- 없음
```

## 시스템 파악을 쉽게 만드는 방법 (System Observability)

시스템 전문가는 단순히 진단하는 것에 그치지 않고, **시스템이 스스로를 설명할 수 있는 구조**를 만든다.

### 관찰 가능성(Observability) 3축 구축

| 축 | 도구 | 없으면 구축 |
|---|------|-----------|
| **메트릭** | Argos probes, docker stats | 핵심 지표에 probe 추가 |
| **로그** | docker logs, 앱 로그 | 구조화된 로깅 패턴 적용 |
| **추적** | API 응답시간, 에러율 | 헬스체크 엔드포인트 추가 |

### 시스템 지도 자동 생성

진단할 때마다 아래를 자동으로 갱신한다:
- `아키텍처.md`: 현재 구성도 (컨테이너, 네트워크, 포트, 의존성)
- `_knowledge.md`: 알려진 이슈, 워크어라운드, 런북
- **의존성 그래프**: 서비스 간 호출 관계를 파악하여 SPOF(단일 장애점)를 시각화

### 진단 가속 패턴

반복적인 진단을 빠르게 하기 위한 패턴:
1. **원커맨드 헬스체크**: 모든 서비스 상태를 한 번에 확인하는 스크립트/API가 있는지 확인. 없으면 만든다
2. **Argos 대시보드 활용**: 이미 Argos가 수집하는 데이터를 먼저 확인 → 중복 수집 방지
3. **이전 진단 보고서 참조**: `~/papyrus/records/` 에서 과거 `system-diagnosis` 태그 보고서를 읽고 변화 추이를 파악
4. **_knowledge.md 먼저 읽기**: 프로젝트 고유 컨텍스트를 로드하여 진단 시간 단축

## 스킬 역할 개선/조정 (Skill Orchestration & Evolution)

system_expert는 기존 스킬을 **사용하면서 동시에 개선**한다.

### 스킬 역할 감사 (Skill Role Audit)

`/system_expert audit-skills` 모드:

1. **역할 중복 감지**: 여러 스킬이 같은 일을 하고 있지 않은지
   - 예: log_healer와 system_expert 모두 로그를 스캔 → 역할 경계 명확히
2. **역할 공백 감지**: 어떤 작업이 스킬로 커버되지 않는지
   - 예: 백업/복원을 담당하는 스킬이 없다 → 신규 스킬 제안
3. **역할 경계 재조정**: 스킬 간 DO NOT TRIGGER 규칙이 적절한지
   - 실제 사용 패턴과 맞지 않으면 조정 제안
4. **스킬 효율성**: 각 스킬이 실제로 얼마나 사용되는지 (tool_stats 활용)
   - 사용되지 않는 스킬 → 통합 또는 제거 제안
   - 과도하게 사용되는 스킬 → 분할 또는 자동화 강화 제안

### 스킬 개선 파이프라인

진단/개선 과정에서 스킬의 한계를 발견하면:
1. **즉시 기록**: 어떤 스킬이 어떤 상황에서 부족했는지
2. **개선안 도출**: 구체적으로 어떻게 보완하면 되는지
3. **`/anima improve` 연계**: 개선안을 anima 스킬에 전달하여 실제 수정

### 스킬 간 연결 최적화

스킬 의존성 체인(persona.md에 정의됨)이 실제로 잘 동작하는지 점검:
- `developer → reflection` 연결이 실제로 발동하는가?
- 새로운 자연스러운 연결이 필요하지 않은가?
- system_expert 자신의 후속 스킬 체인: `system_expert → developer`(코드 개선), `system_expert → research`(기술 조사), `system_expert → anima improve`(스킬 개선)

## 자기 진화 시스템 (Self-Evolution)

system_expert는 **실행할수록 더 나아지는** 시스템이다.

### 진단 패턴 학습

1. **반복 발견 패턴 축적**: 같은 유형의 문제가 반복 발견되면 lessons.md에 "시스템 패턴"으로 기록
2. **진단 체크리스트 진화**: 매 진단 후 "이번에 놓칠 뻔한 것"을 Pre-Check Guard에 추가
3. **자동 진단 제안**: 특정 작업(마이그레이션, 배포, 인프라 변경) 후에 자동으로 진단을 제안

### 지표 기준선 구축

진단 결과를 누적하여 **정상 상태 기준선(baseline)**을 만든다:
- "Hermes(에르메스)는 보통 CPU 15%, 메모리 4GB 정도가 정상"
- "Argos 인시던트는 0이 정상, 1이상이면 즉시 조사"
- 기준선은 `_knowledge.md`에 기록하고, 진단 시 비교 기준으로 사용

### 개선 효과 추적

과거 개선 이력을 추적하여 실제 효과를 검증:
- 개선 전후 메트릭 비교 데이터를 누적
- "이 개선이 실제로 효과가 있었는가?" → 없었으면 롤백 또는 대안 탐색
- 효과가 큰 개선 패턴은 `effective` 교훈으로 기록 → 다른 프로젝트에도 적용

### 예방적 진단 트리거

문제가 발생하기 **전에** 진단을 제안하는 규칙:
- **대규모 변경 후**: 마이그레이션, 메이저 업데이트, 인프라 변경 → `/system_expert diagnose` 자동 제안
- **정기 점검**: 주간 보고서(weekly_report) 작성 시 시스템 건강도 함께 점검 제안
- **인시던트 후**: 장애 복구 후 전체 시스템 영향도 점검 제안
- **새 서비스 추가 후**: 기존 시스템과의 통합이 건전한지 점검

### 메타 개선: system_expert 자신의 개선

- 매 진단 후 "이 진단 과정 자체가 효율적이었는가?" 자문
- 진단에 너무 오래 걸리는 부분 → 자동화 또는 스크립트화
- 놓친 문제가 나중에 발견되면 → 진단 워크플로우에 해당 체크 추가
- `skill.md` 자체를 주기적으로 리뷰하여 현실과 괴리된 부분 수정

## 리브랜딩 가이드 (교훈에서 승격)

리브랜딩 요청 시 반드시 따르는 체크리스트:

1. **전수 조사**: grep -ri로 옛 이름이 있는 모든 파일 식별
2. **충돌 확인**: mv 대상 경로에 동명 디렉토리가 있는지 확인
3. **전수 변경**: 디렉토리, Docker(서비스/사용자/볼륨), 도메인, 환경변수, Argos, tmux, 문서, 교훈, 보고서
4. **Docker 재빌드**: 서비스명/사용자명 변경 시 이미지 재빌드 필수
5. **검증**: grep -ri로 옛 이름이 0건인지 확인
6. **도메인**: DuckDNS 등 외부 서비스 등록 확인

## 핵심 원칙

- **데이터 기반 판단**: 추측이 아니라 실제 메트릭/로그/설정을 읽고 판단한다
- **근본 원인 추적**: 증상이 아니라 원인을 찾는다. "왜?"를 3번 이상 묻는다
- **일반화 검증**: 하나의 문제를 발견하면 같은 패턴이 다른 곳에도 있는지 확인한다
- **최소 개입 최대 효과**: 작은 변경으로 큰 효과를 내는 개선을 우선한다
- **기존 스킬 재활용**: 바퀴를 재발명하지 않는다. 이미 있는 스킬을 조합한다
- **자동화 지향**: 수동 점검을 발견하면 자동화(Argos probe, cron 등)로 전환 제안
- **자기 진화**: 실행할수록 더 나아진다. 진단 패턴, 기준선, 체크리스트가 계속 성장한다
- **스킬 생태계 관리**: 개별 스킬이 아니라 스킬 간 연결과 전체 효율을 본다

## 검증 기준

- [ ] 다층적 현황 파악 수행됨 (인프라, 서비스, 앱, 설정, 코드)
- [ ] 6가지 관점 분석됨 (성능, 안정성, 보안, 효율성, 구조적 부채, 운영성)
- [ ] 우선순위가 매겨진 개선 목록 생성됨
- [ ] 각 개선에 실행 스킬이 매핑됨
- [ ] improve 모드 시 before/after 비교됨
- [ ] 보고서 저장 + 문서 현행화됨
- [ ] 스킬 역할 감사 수행됨 (audit-skills 모드 시)
- [ ] 진단 패턴이 학습/기록됨 (자기 진화)

## 변경 이력

| 날짜 | 변경 내용 | 트리거 |
|------|----------|--------|
| 2026-03-21 | 초기 생성 | 사용자 요청 "시스템 개선 전문가 스킬" |
| 2026-03-21 | 시스템 파악 방법론, 스킬 역할 개선/조정, 자기 진화 시스템 추가 | 사용자 추가 요청 |
| 2026-03-21 | 별칭 "국무총리" 추가, 사용자를 "제우스"로 지칭 | 사용자 요청 |
