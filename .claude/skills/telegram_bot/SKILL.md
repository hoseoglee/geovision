# Telegram Bot Skill

Anima Worker Bot(project_anima-worker) 운영 관리 스킬. 데몬 제어, 큐 관리, 진단, 개발을 서브커맨드로 통합한다. macOS, Windows, Linux(Raspberry Pi 포함) 크로스플랫폼 지원.

## 트리거
'텔레그램 봇', 'worker bot', '워커봇', 'telegram bot', '봇 상태', '봇 시작', '봇 중지', '봇 로그', '큐 확인', '봇 진단'

## DO NOT TRIGGER
단순 Telegram API 질문, 봇 개발 일반론, project_anima-worker 코드 직접 수정 요청(→ developer 스킬)

## OS 자동 감지

스킬 실행 시 OS를 자동 감지하여 적절한 명령어를 선택한다. 사용자가 OS를 지정할 필요 없음.

```bash
# OS 감지 (모든 서브커맨드 실행 전 수행)
case "$(uname -s 2>/dev/null || echo Windows)" in
    Darwin*)  OS_TYPE="macos" ;;
    Linux*)   OS_TYPE="linux" ;;
    MINGW*|MSYS*|CYGWIN*|Windows*) OS_TYPE="windows" ;;
    *)        OS_TYPE="unknown" ;;
esac
```

- **Windows 판별**: `uname -s`가 `MINGW`, `MSYS`, `CYGWIN`이면 Git Bash/MSYS2 환경. `uname` 실패 시 Windows로 간주.
- **플랫폼 변수**: `$PLATFORM`으로 환경변수에 설정된 경우 해당 값 우선 사용.

서비스 관리 명령어 매핑:

| 동작 | macOS (launchd) | Linux (systemd --user) | Windows |
|------|-----------------|----------------------|---------|
| 서비스 등록 | `launchctl bootstrap gui/$(id -u) <plist>` | `systemctl --user enable anima-worker-bot` | `install.ps1` 또는 Task Scheduler |
| 시작 | `launchctl bootstrap gui/$(id -u) <plist>` | `systemctl --user start anima-worker-bot` | `schtasks /Run /TN "AnimaWorkerBot"` |
| 중지 | `launchctl bootout gui/$(id -u)/com.anima.worker-bot` | `systemctl --user stop anima-worker-bot` | `schtasks /End /TN "AnimaWorkerBot"` |
| 상태 | `launchctl list com.anima.worker-bot` | `systemctl --user status anima-worker-bot` | `schtasks /Query /TN "AnimaWorkerBot"` |
| 제거 | `install.sh uninstall` | `install.sh uninstall` | `schtasks /Delete /TN "AnimaWorkerBot" /F` |
| 로그 | `tail ~/.anima/logs/...` | `journalctl --user-unit anima-worker-bot` + 파일 로그 | `Get-Content ~/.anima/logs/...` (파일 로그) |

## 서브커맨드

### /telegram_bot status
데몬 + 큐 + 프로세스 종합 상태를 한눈에 보여준다.

```bash
# OS 감지
case "$(uname -s 2>/dev/null || echo Windows)" in
    Darwin*)  OS_TYPE="macos" ;;
    Linux*)   OS_TYPE="linux" ;;
    MINGW*|MSYS*|CYGWIN*|Windows*) OS_TYPE="windows" ;;
esac

# 1. 서비스 상태 확인
case "$OS_TYPE" in
    macos)
        launchctl list com.anima.worker-bot
        ;;
    linux)
        systemctl --user status anima-worker-bot
        ;;
    windows)
        schtasks /Query /TN "AnimaWorkerBot" 2>/dev/null || \
        powershell.exe -Command "Get-ScheduledTask -TaskName 'AnimaWorkerBot' -ErrorAction SilentlyContinue | Format-List"
        ;;
esac

# 2. 프로세스 확인
case "$OS_TYPE" in
    macos|linux)
        ps aux | grep "src.bot" | grep -v grep
        ;;
    windows)
        powershell.exe -Command "Get-Process python* | Where-Object { \$_.CommandLine -like '*src.bot*' }" 2>/dev/null || \
        tasklist /FI "IMAGENAME eq python.exe" /V
        ;;
esac

# 3. 큐 현황 (공통)
ls ~/.anima/queue/{pending,running,done,failed}/*.yaml 2>/dev/null | wc -l

# 4. 최근 로그 (마지막 5줄, 공통 — 파일 로그)
tail -5 ~/.anima/logs/worker-bot.stderr.log
tail -5 ~/.anima/logs/worker-bot.stdout.log
```

출력 형식:
```
🤖 Anima Worker Bot 상태
├─ OS: macOS / Linux / Windows
├─ 데몬: ✅ 실행중 (PID: 1234)
├─ 큐: 대기 0 | 실행중 0 | 완료 5 | 실패 1
├─ 최근 활동: 2026-03-08 13:00 — "MCP 조사해줘" ✅
└─ 로그: 에러 없음
```

### /telegram_bot start
미설치 시 install → start. 이미 실행 중이면 안내만 한다 (멱등).

```bash
# OS 감지
case "$(uname -s 2>/dev/null || echo Windows)" in
    Darwin*)  OS_TYPE="macos" ;;
    Linux*)   OS_TYPE="linux" ;;
    MINGW*|MSYS*|CYGWIN*|Windows*) OS_TYPE="windows" ;;
esac

PROJECT_DIR=~/workspace/project_anima-worker

case "$OS_TYPE" in
    macos)
        if launchctl list 2>/dev/null | grep -q "com.anima.worker-bot"; then
            echo "이미 실행 중"
        else
            cd "$PROJECT_DIR" && ./scripts/install.sh
        fi
        ;;
    linux)
        if systemctl --user is-active anima-worker-bot &>/dev/null; then
            echo "이미 실행 중"
        else
            cd "$PROJECT_DIR" && ./scripts/install.sh
        fi
        ;;
    windows)
        if schtasks /Query /TN "AnimaWorkerBot" &>/dev/null; then
            echo "이미 실행 중"
        else
            # install.ps1이 있으면 사용, 없으면 직접 포그라운드 실행
            if [ -f "$PROJECT_DIR/scripts/install.ps1" ]; then
                powershell.exe -ExecutionPolicy Bypass -File "$PROJECT_DIR/scripts/install.ps1"
            else
                echo "install.ps1 없음 — 포그라운드로 직접 실행"
                cd "$PROJECT_DIR" && python -m src.bot
            fi
        fi
        ;;
esac
```

### /telegram_bot stop
서비스만 멈춤. 설치는 유지한다.

```bash
case "$(uname -s 2>/dev/null || echo Windows)" in
    Darwin*)
        launchctl bootout gui/$(id -u)/com.anima.worker-bot
        ;;
    Linux*)
        systemctl --user stop anima-worker-bot
        ;;
    MINGW*|MSYS*|CYGWIN*|Windows*)
        schtasks /End /TN "AnimaWorkerBot" 2>/dev/null
        # 프로세스가 남아있으면 강제 종료
        powershell.exe -Command "Get-Process python* | Where-Object { \$_.CommandLine -like '*src.bot*' } | Stop-Process -Force" 2>/dev/null
        ;;
esac
```

### /telegram_bot restart
stop → start.

```bash
case "$(uname -s 2>/dev/null || echo Windows)" in
    Darwin*)
        launchctl bootout gui/$(id -u)/com.anima.worker-bot 2>/dev/null
        sleep 1
        launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.anima.worker-bot.plist
        ;;
    Linux*)
        systemctl --user restart anima-worker-bot
        ;;
    MINGW*|MSYS*|CYGWIN*|Windows*)
        schtasks /End /TN "AnimaWorkerBot" 2>/dev/null
        powershell.exe -Command "Get-Process python* | Where-Object { \$_.CommandLine -like '*src.bot*' } | Stop-Process -Force" 2>/dev/null
        sleep 1
        schtasks /Run /TN "AnimaWorkerBot" 2>/dev/null || \
        (cd ~/workspace/project_anima-worker && python -m src.bot &)
        ;;
esac
```

### /telegram_bot uninstall
완전 제거. **반드시 사용자 확인 후 실행**. 소스코드(~/workspace/project_anima-worker/)는 보존한다.

```bash
case "$(uname -s 2>/dev/null || echo Windows)" in
    Darwin*)
        cd ~/workspace/project_anima-worker && ./scripts/install.sh uninstall
        ;;
    Linux*)
        cd ~/workspace/project_anima-worker && ./scripts/install.sh uninstall
        # fallback: 수동 제거
        # systemctl --user stop anima-worker-bot
        # systemctl --user disable anima-worker-bot
        # rm ~/.config/systemd/user/anima-worker-bot.service
        # systemctl --user daemon-reload
        ;;
    MINGW*|MSYS*|CYGWIN*|Windows*)
        schtasks /End /TN "AnimaWorkerBot" 2>/dev/null
        schtasks /Delete /TN "AnimaWorkerBot" /F 2>/dev/null
        powershell.exe -Command "Get-Process python* | Where-Object { \$_.CommandLine -like '*src.bot*' } | Stop-Process -Force" 2>/dev/null
        echo "Task Scheduler 등록 제거 완료"
        ;;
esac
```

제거 대상: launchd plist (macOS) / systemd service (Linux) / Scheduled Task (Windows), 데몬 프로세스
보존 대상: 소스코드, 큐 데이터(~/.anima/queue/), 로그

### /telegram_bot logs [--errors] [--analyze] [--lines N]
로그 조회 + AI 에러 분석.

- 기본: 최근 50줄
- `--errors`: 에러/트레이스백만 필터
- `--analyze`: AI가 에러 원인 분석 + 해결책 제안
- `--lines N`: 줄 수 지정

```bash
# OS 감지
case "$(uname -s 2>/dev/null || echo Windows)" in
    Darwin*)  OS_TYPE="macos" ;;
    Linux*)   OS_TYPE="linux" ;;
    MINGW*|MSYS*|CYGWIN*|Windows*) OS_TYPE="windows" ;;
esac

LOG_DIR=~/.anima/logs

# 기본 — 파일 로그 (전 OS 공통)
tail -50 "$LOG_DIR/worker-bot.stderr.log"
tail -50 "$LOG_DIR/worker-bot.stdout.log"
tail -50 "$LOG_DIR/worker-bot.app.log"

# Linux 추가: journalctl 로그
if [ "$OS_TYPE" = "linux" ]; then
    echo "=== systemd journal ==="
    journalctl --user-unit anima-worker-bot --no-pager -n 50
fi

# Windows: 파일 로그만 사용 (위 tail 명령으로 충분)
# Git Bash의 tail이 동작하지 않는 경우 fallback:
if [ "$OS_TYPE" = "windows" ]; then
    if ! command -v tail &>/dev/null; then
        powershell.exe -Command "Get-Content '$LOG_DIR/worker-bot.stderr.log' -Tail 50"
        powershell.exe -Command "Get-Content '$LOG_DIR/worker-bot.stdout.log' -Tail 50"
        powershell.exe -Command "Get-Content '$LOG_DIR/worker-bot.app.log' -Tail 50"
    fi
fi

# --errors (전 OS 공통)
grep -A 5 -E "(Error|Exception|Traceback|CRITICAL)" "$LOG_DIR/worker-bot.stderr.log"

# --analyze: 위 에러를 읽고 AI가 원인 분석
```

### /telegram_bot queue <subcommand>
큐 관리.

- `queue status` — 큐 현황 (pending/running/done/failed 카운트)
- `queue inspect [task_id]` — 특정 작업 yaml 내용 조회
- `queue clean [--days N]` — N일(기본 7) 이상 된 done/failed 정리
- `queue retry [task_id]` — failed 작업을 pending으로 재이동
- `queue flush` — pending 전체 삭제 (**사용자 확인 필수**)

```python
# retry 예시
from src.worker import QUEUE_DIR
import yaml, shutil
failed_path = QUEUE_DIR / "failed" / f"{task_id}.yaml"
data = yaml.safe_load(failed_path.read_text())
data["result"] = {"status": None, "summary": None, "report_path": None, "error": None}
pending_path = QUEUE_DIR / "pending" / failed_path.name
pending_path.write_text(yaml.dump(data, allow_unicode=True))
failed_path.unlink()
```

### /telegram_bot troubleshoot
8단계 자동 진단 + 자동 복구.

```bash
# OS 감지
case "$(uname -s 2>/dev/null || echo Windows)" in
    Darwin*)  OS_TYPE="macos" ;;
    Linux*)   OS_TYPE="linux" ;;
    MINGW*|MSYS*|CYGWIN*|Windows*) OS_TYPE="windows" ;;
esac
```

```
1. 서비스 등록 확인 (OS별)
   - macOS: ~/Library/LaunchAgents/com.anima.worker-bot.plist 존재 확인
   - Linux: ~/.config/systemd/user/anima-worker-bot.service 존재 확인
   - Windows: schtasks /Query /TN "AnimaWorkerBot" 또는 Get-ScheduledTask
   → 없으면: install.sh (macOS/Linux) 또는 install.ps1 (Windows) 실행 제안

2. 서비스 실행 상태 확인 (OS별)
   - macOS: launchctl list com.anima.worker-bot
   - Linux: systemctl --user is-active anima-worker-bot
   - Windows: schtasks /Query /TN "AnimaWorkerBot" — Status가 Running인지 확인
   → 중지됨: 자동 restart

3. 프로세스 존재 확인 (OS별)
   - macOS/Linux: ps aux | grep "src.bot" | grep -v grep
   - Windows: powershell.exe -Command "Get-Process python* | Where-Object { $_.CommandLine -like '*src.bot*' }"
     또는 tasklist /FI "IMAGENAME eq python.exe" /V
   → 좀비/다중 프로세스: kill (macOS/Linux) 또는 Stop-Process (Windows) 후 restart

4. Python 의존성 확인 (전 OS 공통)
   → python3 -c "import telegram" (macOS/Linux)
   → python -c "import telegram" (Windows — python3 명령어 없을 수 있음)
   → 없으면: pip install -r requirements.txt

5. 시크릿 접근 확인 (전 OS 공통)
   → ~/.anima/scripts/secret.sh get telegram.jarvis
   → Windows Git Bash에서 경로: $HOME/.anima/scripts/secret.sh
   → 실패: 시크릿 설정 안내

6. Telegram API 연결 확인 (전 OS 공통)
   → curl -s "https://api.telegram.org/bot{TOKEN}/getMe"
   → Windows에서 curl 없으면: powershell.exe -Command "Invoke-RestMethod ..."
   → 실패: 토큰 만료/잘못된 토큰 안내

7. 큐 디렉토리 확인 (전 OS 공통)
   → ~/.anima/queue/{pending,running,done,failed} 존재 확인
   → 없으면: ensure_queue_dirs() 실행 또는 mkdir -p

8. running/ 고착 작업 확인 (전 OS 공통)
   → yaml의 started_at과 현재 시간 비교
   → 1시간 이상 running: failed로 이동 제안
```

각 단계에서 문제 발견 시 자동 복구를 시도하고, 복구 불가 시 사용자에게 안내한다.

### /telegram_bot add-command <command_name> <description>
새 봇 명령어를 추가 개발한다.

1. `src/bot.py`에 핸들러 함수 스켈레톤 추가
2. `main()`에 CommandHandler 등록
3. `/help` 응답에 새 명령어 추가
4. 테스트 케이스 추가
5. 데몬 restart

```
예: /telegram_bot add-command history "최근 완료된 작업 5건 조회"
→ handle_history 함수 생성 + 등록 + 테스트 + restart
```

### /telegram_bot health
헬스체크 — API, 큐, 리소스, 성공률.

```
🏥 헬스체크 결과
├─ OS: macOS / Linux / Windows
├─ Telegram API: ✅ 응답 (120ms)
├─ 큐 상태: ✅ running 고착 없음
├─ 디스크: ✅ 큐 데이터 2.1MB
├─ 성공률: ✅ 92% (23/25, 최근 7일)
└─ 종합: HEALTHY
```

계산:
```bash
# OS 감지
case "$(uname -s 2>/dev/null || echo Windows)" in
    Darwin*)  OS_TYPE="macos" ;;
    Linux*)   OS_TYPE="linux" ;;
    MINGW*|MSYS*|CYGWIN*|Windows*) OS_TYPE="windows" ;;
esac

# API 응답 (전 OS 공통)
time curl -s "https://api.telegram.org/bot{TOKEN}/getMe"

# 성공률 (전 OS 공통)
done=$(ls ~/.anima/queue/done/*.yaml 2>/dev/null | wc -l)
failed=$(ls ~/.anima/queue/failed/*.yaml 2>/dev/null | wc -l)
total=$((done + failed))
rate=$((done * 100 / total))

# 디스크 (OS별)
case "$OS_TYPE" in
    macos|linux)
        du -sh ~/.anima/queue/
        ;;
    windows)
        powershell.exe -Command "(Get-ChildItem -Recurse '$HOME/.anima/queue/' | Measure-Object -Property Length -Sum).Sum / 1MB"
        ;;
esac

# running 고착 (1시간 이상) — 전 OS 공통
# yaml의 started_at과 현재 시간 비교
```

### /telegram_bot send <message>
테스트 메시지를 Telegram으로 전송한다.

```bash
TOKEN=$(~/.anima/scripts/secret.sh get telegram.jarvis)
CHAT_ID=$(~/.anima/scripts/secret.sh get telegram.chat_id)
curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
  -d chat_id="${CHAT_ID}" \
  -d text="$MESSAGE"
```

## 프로젝트 경로

| 항목 | macOS | Linux (Raspberry Pi 포함) | Windows |
|------|-------|--------------------------|---------|
| 코드 | `~/workspace/project_anima-worker/` | `~/workspace/project_anima-worker/` | `~/workspace/project_anima-worker/` |
| 큐 | `~/.anima/queue/{pending,running,done,failed}/` | (동일) | (동일) |
| 로그 | `~/.anima/logs/worker-bot.*.log` | (동일) + `journalctl --user-unit` | `~/.anima/logs/worker-bot.*.log` |
| 서비스 정의 | `~/Library/LaunchAgents/com.anima.worker-bot.plist` | `~/.config/systemd/user/anima-worker-bot.service` | Task Scheduler: `AnimaWorkerBot` |
| 설치 스크립트 | `scripts/install.sh` | `scripts/install.sh` | `scripts/install.ps1` (없으면 포그라운드 실행) |

## 시크릿 키
- `telegram.jarvis` — Bot 토큰
- `telegram.chat_id` — 허용 Chat ID

## 검증 기준
- [ ] status: 데몬/큐/로그 상태를 정확히 표시 (OS별 명령어 분기)
- [ ] start/stop/restart: 멱등하게 동작 (OS별 서비스 관리)
- [ ] uninstall: 사용자 확인 없이 실행 안 됨
- [ ] logs --analyze: 에러 원인과 해결책 제시
- [ ] logs: Linux에서 journalctl 로그도 표시
- [ ] queue retry: failed → pending 이동 성공
- [ ] troubleshoot: 8단계 진단 실행, OS별 명령어로 자동 복구 시도
- [ ] health: API/큐/디스크/성공률 표시
- [ ] send: 테스트 메시지 수신 확인
- [ ] 크로스플랫폼: macOS, Linux, Windows에서 OS 자동 감지 후 동작
