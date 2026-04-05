---
name: screen_agent
description: |
  PC_B의 화면을 보면서 마우스/키보드로 윈도우를 자율 제어하는 스킬.
  트리거: "화면 보면서 ~해줘", "윈도우에서 ~해줘", "PC에서 ~해줘", "screen agent", "메일 보내줘", "메시지 입력해줘"
  DO NOT TRIGGER: 로컬 파일 작업, 코드 수정 등 라즈베리파이 내부 작업. 브라우저 자동화(→ claude-in-chrome MCP)
user_invocable: true
---

# Screen Agent Skill

PC_B의 화면을 보면서 마우스/키보드로 윈도우를 자율 제어하는 스킬.

---

## KVM 서버 접속

### IP 자동 감지
스킬 시작 시 아래 순서로 KVM 서버 연결을 시도한다:
```bash
# 1순위: localhost (같은 머신에서 실행 중일 때)
# 2순위: LAN IP
# 3순위: Tailscale IP
for ip in "localhost" "192.168.42.230" "100.75.110.109"; do
  if curl -s --connect-timeout 2 "http://$ip:8080/snapshot" -o /dev/null; then
    KVM="http://$ip:8080"
    break
  fi
done
```
- 모든 IP 실패 시: KVM 서버가 실행 중인지 확인 (`ps aux | grep uvicorn`)
- KVM 서버 시작: `cd ~/workspace/project_view && bash run.sh &`

### 기본 정보
- **포트**: 8080
- **스냅샷**: `GET /snapshot` → 960×540 JPEG (기본)
- **고해상도 스냅샷**: `GET /snapshot?width=1920&height=1080` → 원본 해상도
- **좌표 변환**: 스냅샷 좌표 → 절대좌표(0~32767)로 변환 필요
  - `abs_x = snapshot_x / snapshot_width * 32767`
  - `abs_y = snapshot_y / snapshot_height * 32767`
- **해상도 선택 기준**:
  - 일반 UI 조작 (버튼 클릭, 탐색): 960×540 (기본) — 빠르고 가벼움
  - 텍스트 읽기 (문서, 코드, 위키): **1920×1080** — 세밀한 텍스트 판독 필요 시

---

## PC_B 환경 정보

| 항목 | 값 |
|------|-----|
| OS | Windows 11 |
| 사용자 | `hoseog.lee` |
| 해상도 | 1920×1080 |
| Tailscale IP | `100.75.110.109` |
| 설치됨 | WSL2 (Ubuntu, Running), Chrome, Docker Desktop, Portainer, VSCode, PowerShell |

> 이 정보는 `~/papyrus/projects/project_view/_knowledge.md`에서 관리. 변경 시 업데이트할 것.

---

## 업무 환경 참조

- 작업 시작 전 `~/papyrus/areas/업무PC_환경맵.md`를 읽고 PC_B 상태를 파악한다
- 환경맵에 이미 있는 정보는 재탐색하지 않는다 (반복 탐색 방지)
- 새로운 프로젝트/도구 발견 시 환경맵을 업데이트한다
- 환경맵에 없는 작업 요청 시: 먼저 스냅샷으로 현재 상태 파악 → 환경맵 갱신 → 작업 수행

---

## 핵심 원칙

### 0. 키보드 우선 — 마우스 좌표 클릭은 최후 수단
PC_B와의 통신은 **HID(키보드/마우스) + HDMI 캡처**만 가능. 네트워크 직접 통신 불가.
마우스 좌표 클릭은 신뢰성이 매우 낮으므로, **키보드만으로 모든 것을 수행**한다.

**조작 우선순위**:
1. **AutoHotkey 단축키** — `Ctrl+Alt+A`(AWS), `Ctrl+Alt+G`(GitHub) 등 커스텀 매크로
2. **Vimium** — 브라우저에서 `f`키 → 힌트 알파벳 입력 → 키보드로 클릭
3. **Windows 키보드 네비게이션** — `Win+숫자`, `Ctrl+L`, `Tab`, `Alt`, `Enter`
4. **KVM 마우스** — 큰 타겟(> 50px)만, 위 3가지 불가능할 때만

**AutoHotkey 단축키 (PC_B에 설치됨)**:
```
Ctrl+Alt+A : AWS 콘솔 (Corp AD 로그인 페이지)
Ctrl+Alt+G : GitHub Enterprise
Ctrl+Alt+P : PowerShell 새 창
Ctrl+Alt+T : Windows Terminal
Ctrl+Alt+H : 단축키 도움말
Ctrl+Alt+M : 마우스 좌표 표시 (디버깅)
Ctrl+Alt+R : 스크립트 리로드
```

**Vimium 사용법**:
```
1. 브라우저에서 f키 입력 (KVM 키보드로) → 모든 링크/버튼에 알파벳 힌트 표시
2. 스냅샷 촬영 → 힌트 문자 읽기 (예: "AE")
3. KVM으로 "AE" 타이핑 → Vimium이 해당 요소 클릭
4. 마우스 불필요!
```

**Windows 키보드 네비게이션**:
```
Win+1~9     : 작업표시줄 고정 앱 (순서대로)
Win+S       : 검색 → 앱 이름 타이핑 → Enter
Ctrl+L      : 브라우저 주소창 포커스
Ctrl+T/W    : 새 탭 / 탭 닫기
Ctrl+1~9    : 브라우저 탭 전환
Alt         : 메뉴바 활성화 → 방향키 → Enter
Tab/Shift+Tab : 포커스 이동
```

**마우스 사용 규칙** (불가피할 때만):
- 큰 타겟(창 중앙, 50px+ 버튼)만 클릭
- 작은 요소(북마크, 링크 텍스트)는 절대 마우스 금지 → Vimium/Tab 사용
- 클릭 전 스냅샷으로 타겟 크기 확인

### 1. CLI 우선 (PowerShell First)
GUI 클릭보다 **PowerShell/CMD 명령이 더 빠르고 정확**하다.
- 소프트웨어 설치 → `winget install`
- 시스템 정보 → `systeminfo`, `wsl -l -v`
- 서비스 관리 → `net start/stop`, `Get-Service`
- 환경변수 → `[Environment]::SetEnvironmentVariable()`
- 파일 관리 → `Get-ChildItem`, `Copy-Item`

**판단 흐름**: PowerShell을 먼저 열고 → CLI로 해결 가능한지 판단 → 불가능할 때만 GUI

### 2. 사전 확인 (Pre-Check)
작업 시작 전 **이미 완료된 상태인지 반드시 확인**한다:
```
"WSL 설치해줘"     → 먼저 `wsl -l -v` 실행
"Chrome 설치해줘"  → `winget list Google.Chrome` 또는 작업표시줄 확인
"Docker 설치해줘"  → `docker --version` 실행
"XX 열어줘"        → 스냅샷에서 이미 열려있는지 확인
```

### 3. 키보드 입력 우선
마우스 클릭은 좌표 부정확으로 오동작 가능성이 높다. 가능한 한 키보드 단축키·Tab 이동·Enter를 우선 사용한다.

---

## 키보드 단축키 신뢰도 맵

| 단축키 | 신뢰도 | 대안 (폴백) |
|--------|--------|-------------|
| `Win+X` | **낮음** | 시작 버튼 우클릭 |
| `Win+R` | 중간 | 검색창에 직접 입력 |
| `Win+S` (검색) | 중간 | 작업표시줄 검색 아이콘 클릭 |
| `Win+Up/Down` | **낮음** | 타이틀바 더블클릭 |
| `Win+E` (탐색기) | 중간 | 작업표시줄 아이콘 클릭 |
| `Ctrl+C/V` | 높음 | — |
| `Ctrl+T/W` (탭) | 높음 | — |
| `Alt+Tab` | 중간 | 작업표시줄 클릭 |
| `Alt+F4` | 높음 | — |
| `Enter/Tab/Esc` | 높음 | — |

**폴백 규칙**: 단축키 입력 후 스냅샷으로 확인 → 반응 없으면 즉시 대안으로 전환 (같은 키 재시도 금지)

---

## API 레퍼런스

### 화면 보기
```bash
curl -s $KVM/snapshot -o /tmp/screen.jpg                              # 960×540
curl -s "$KVM/snapshot?width=1920&height=1080" -o /tmp/screen_hd.jpg  # 1920×1080
```

### 마우스 — 절대좌표 (권장)
```bash
curl -s -X POST $KVM/api/mouse -H "Content-Type: application/json" \
  -d '{"action":"move_abs","x":16383,"y":16383}'
```

### 마우스 — 상대좌표 (보조)
```bash
curl -s -X POST $KVM/api/mouse -H "Content-Type: application/json" \
  -d '{"action":"move","dx":100,"dy":50}'
```

### 마우스 클릭
```bash
# 왼쪽/오른쪽 클릭
curl -s -X POST $KVM/api/mouse -H "Content-Type: application/json" \
  -d '{"action":"click","button":"left"}'
curl -s -X POST $KVM/api/mouse -H "Content-Type: application/json" \
  -d '{"action":"click","button":"right"}'
```

### 스크롤
```bash
curl -s -X POST $KVM/api/mouse -H "Content-Type: application/json" \
  -d '{"action":"scroll","direction":"down","amount":3}'
```

### 텍스트 입력
```bash
curl -s -X POST $KVM/api/type -H "Content-Type: application/json" \
  -d '{"text":"hello world"}'
```

### 키보드 단축키
```bash
curl -s -X POST $KVM/api/keyboard -H "Content-Type: application/json" \
  -d '{"keys":["Enter"]}'
curl -s -X POST $KVM/api/keyboard -H "Content-Type: application/json" \
  -d '{"keys":["c"],"modifiers":{"ctrl":true}}'
```

### 모든 키/버튼 해제 (작업 종료 시 필수)
```bash
curl -s -X POST $KVM/api/release
```

---

## 실행 루프

```
[0] 사전 확인: 이미 완료된 작업인지 CLI로 확인
[1] KVM 접속: IP 자동 감지 → KVM 변수 설정
[2] 스냅샷 촬영 → /tmp/screen.jpg 저장
    - 텍스트 읽기 필요 시: ?width=1920&height=1080 사용
    - UI 조작만 필요 시: 기본 960×540 사용
[3] Read 툴로 이미지 로드 → Vision으로 화면 분석
[4] CLI로 가능한 작업인지 판단
    → 가능: PowerShell 열고 명령 실행
    → 불가능: GUI 조작 진행
[5] 목표 요소 위치 파악 (스냅샷 이미지 좌표)
[6] 절대좌표 변환: abs_x = sx/width*32767, abs_y = sy/height*32767
[7] move_abs로 이동 → click으로 클릭
[8] 스냅샷 다시 촬영 → 결과 확인
[9] 목표 달성 시 /api/release 호출 후 종료
    미달성 시 [2]로 반복
```

---

## 실패 복구 전략

| 상황 | 대응 |
|------|------|
| 클릭이 빗나감 | 좌표 재계산 후 재시도 (±10px 오프셋) |
| 단축키 무반응 | 폴백 대안 사용 (신뢰도 맵 참조) |
| 창이 안 보임 | `Alt+Tab` → 작업표시줄 확인 |
| 입력이 안 먹힘 | 해당 창 클릭하여 포커스 확보 후 재입력 |
| 화면 잠김 | 마우스 이동 + 키 입력으로 깨우기 |
| UAC 팝업 | "예" 버튼 위치 파악 → `Alt+Y` 시도 → 클릭 폴백 |
| 예상치 못한 다이얼로그 | 스냅샷 분석 → "확인/닫기/X" 버튼 처리 |
| KVM 연결 실패 | IP 순회 재시도 → 서버 프로세스 확인 |

---

## 작업 유형별 플레이북

### 소프트웨어 설치
```
1. CLI 사전 확인: winget list / wsl -l -v / docker --version 등
2. 이미 설치됨 → 사용자에게 알리고 종료
3. 미설치 → PowerShell(관리자)에서 winget install 시도
4. winget 불가 → 브라우저에서 공식 사이트 다운로드
```

### 설정 변경
```
1. PowerShell로 가능한지 확인 (레지스트리, 환경변수 등)
2. 불가능하면 설정 앱/제어판 경로 탐색
3. 경로: 시작 버튼 우클릭 → 설정 / 제어판
```

### 브라우저 작업
```
1. 크롬 활성화: 작업표시줄 아이콘 클릭 또는 Alt+Tab
2. URL 접속: Ctrl+L (주소창 포커스) → URL 입력 → Enter
3. 새 탭: Ctrl+T → URL 입력
```

### 파일 관리
```
1. PowerShell 우선: Get-ChildItem, Copy-Item, Move-Item
2. GUI 필요 시: Win+E 또는 작업표시줄 탐색기 아이콘
3. 경로 이동: 주소창 클릭 → 경로 직접 입력
```

### 관리자 PowerShell 열기
```
1. 시작 버튼 우클릭 (Win+X는 신뢰도 낮음)
2. 메뉴에서 "터미널(관리자)" 클릭
3. UAC 뜨면 Alt+Y 또는 "예" 클릭
```

### 환경 스캔 (Environment Scan)
```
트리거: "PC 상태 파악해줘", "워크스페이스 확인해줘", "환경 스캔"

1. ~/papyrus/areas/업무PC_환경맵.md 읽어서 기존 정보 로드
2. 스냅샷 → 현재 열린 앱/창 목록 파악
3. Cursor 열려있으면 → Source Control 드롭다운으로 워크스페이스 리포 목록 확인
4. PowerShell에서 시스템 정보 수집:
   - winget list (설치된 앱)
   - wsl -l -v (WSL 상태)
   - docker ps (실행 중 컨테이너)
5. 결과를 ~/papyrus/areas/업무PC_환경맵.md에 갱신
6. 이전 환경맵과 diff → 변경사항만 보고
```

---

## 한글 입력 방법

`/api/type`은 ASCII만 지원. 한글은 클립보드 방식 사용:

```bash
# 1. 라즈베리파이 클립보드에 한글 텍스트 설정
echo -n "안녕하세요" | xclip -selection clipboard

# 2. 윈도우 입력창 포커스 후 Ctrl+V로 붙여넣기
curl -s -X POST $KVM/api/keyboard -H "Content-Type: application/json" \
  -d '{"keys":["v"],"modifiers":{"ctrl":true}}'
```

> xclip이 없으면: `sudo apt-get install xclip -y`

---

## 핵심 규칙 요약

1. **CLI 우선** — PowerShell로 가능한 작업은 GUI 대신 CLI 사용
2. **사전 확인** — 작업 시작 전 이미 완료된 상태인지 확인
3. **매 액션 후 스냅샷** — 클릭/입력 후 반드시 결과 확인
4. **절대좌표(move_abs) 우선** — 스냅샷 좌표를 0~32767로 변환
5. **텍스트 읽기 시 고해상도** — 1920×1080으로 캡처
6. **키보드 입력 우선** — 마우스는 키보드로 불가능할 때만
7. **단축키 실패 시 즉시 폴백** — 같은 키 재시도 금지, 대안 사용
8. **작업 완료 후 `/api/release`** — 키/버튼 눌림 상태 해제
9. **불확실할 때는 스냅샷 먼저** — 추측 클릭 금지
10. **루프 최대 20회** — 미달성 시 사용자에게 보고 후 중단

---

## 검증 기준

- [ ] KVM 서버 자동 감지 및 접속 성공
- [ ] 사전 확인(pre-check) 수행 후 불필요한 작업 회피
- [ ] 스냅샷 촬영 및 Vision 분석 성공
- [ ] 마우스 이동/클릭이 목표 위치에 정확히 수행됨
- [ ] 텍스트 입력(영문/한글)이 정상 동작
- [ ] 단축키 실패 시 폴백 대안 사용됨
- [ ] 작업 완료 후 /api/release 호출됨
- [ ] 20회 루프 이내에 목표 달성 또는 사용자에게 보고

## 변경 이력

| 날짜 | 변경 내용 | 트리거 |
|------|----------|--------|
| 2026-03-09 | 초기 생성 | 사용자 요청 |
| 2026-03-10 | 표준 템플릿 준수 (frontmatter, 검증 기준, 변경 이력) | /anima improve |
| 2026-03-11 | 고해상도 스냅샷 지원, 절대좌표(move_abs) 방식 추가, 좌표변환 공식 문서화 | 위키→마크다운 변환 작업 교훈 |
| 2026-03-27 | CLI 우선 원칙, IP 자동 감지, 사전 확인, 단축키 폴백 맵, 실패 복구 전략, 플레이북 추가 | WSL 설치 작업 교훈 |
| 2026-03-28 | 업무 환경맵 참조 규칙, 환경 스캔 플레이북 추가 | 업무 파악 작업 교훈 |
