---
name: log_healer
description: |
  프로젝트 로그를 스캔하여 에러를 감지하고, AI로 원인 분석 및 자동 수정을 수행하는 스킬.
  트리거: "로그 스캔", "에러 분석", "품질 개선", "log scan", "log healer", "에러 확인해줘"
  DO NOT TRIGGER: 일반 로깅 설정, 로그 포맷 변경만 요청, 단순 로그 조회
user_invocable: true
---

# Log Healer Skill

프로젝트의 `logs/error.log`를 스캔하여 에러를 감지하고, AI 분석 → 자동 수정 → PR 생성까지 수행한다.

## 사용법

```
/log_healer [scan|analyze|fix|report] [--project <name>]
```

- `scan`: 모든 프로젝트 에러 스캔 + Telegram 알림
- `analyze`: 특정 에러에 대한 AI 원인 분석
- `fix`: 에러 자동 수정 + PR 생성 시도
- `report`: 일일 품질 보고서 생성

## 도구 위치

각 프로젝트의 `tools/log_scanner/` 디렉토리에 스캐너 도구가 위치한다.

```
tools/log_scanner/
├── scanner.py          ← 메인 스캐너 (cron용)
├── config.yaml         ← 프로젝트 목록, 알림 설정
├── notifier.py         ← Telegram 알림 전송
├── issue_creator.py    ← GitHub Issue 자동 생성
├── auto_fix.py         ← AI 자동 수정 파이프라인
├── risk_classifier.py  ← 위험 등급 판정
├── prompts.py          ← Claude Code headless 프롬프트
├── state.json          ← 마지막 스캔 offset (자동 생성)
└── fingerprints.json   ← 에러 핑거프린트 + 쿨다운 (자동 생성)
```

## 워크플로우

```
1. SCAN (스캔)
   └─ scanner.py 실행 → error.log에서 신규 에러 추출
       ├─ CRITICAL → 즉시 Telegram 알림
       └─ ERROR → 집계 후 알림 + GitHub Issue 생성

2. ANALYZE (분석)
   └─ Claude Code headless (-p)로 에러 원인 분석
       └─ 출력: 근본 원인, 관련 파일, 수정 제안

3. FIX (수정)
   └─ 위험 등급 판정 (risk_classifier.py)
       ├─ LOW → 자동 수정 → 테스트 → PR 생성
       ├─ MEDIUM → 자동 수정 → 테스트 → PR (리뷰 필수)
       └─ HIGH → 분석 결과만 Issue에 코멘트

4. REPORT (보고)
   └─ 일일 에러 통계 → Telegram 보고서
```

## cron 설정 (자동 실행)

```bash
# 15분 주기 스캔
*/15 * * * * cd ~/workspace/project_EssayCoach && python tools/log_scanner/scanner.py

# 매일 09:00 일일 보고
0 9 * * * cd ~/workspace/project_EssayCoach && python tools/log_scanner/scanner.py --daily-report
```

## 안전장치

- 자동 수정은 항상 별도 브랜치에서 실행 (`fix/loghealer-*`)
- 테스트 전체 통과 필수
- HIGH 위험 에러는 수정 시도 안 함 (분석만)
- 중복 알림 억제 (핑거프린트 + 1시간 쿨다운)
- claude/gh CLI 미설치 시 에러 없이 알림만 전송

## 검증 기준

- [ ] error.log 신규 에러 감지 동작
- [ ] 핑거프린트 기반 중복 억제 동작
- [ ] Telegram 에러 알림 전송 성공
- [ ] GitHub Issue 자동 생성 동작
- [ ] 위험 등급 자동 판정 정확
- [ ] LOW 위험 에러 자동 수정 + PR 생성
- [ ] 일일 보고서 Telegram 전송
