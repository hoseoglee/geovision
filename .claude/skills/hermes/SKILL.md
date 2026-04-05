---
name: hermes
description: |
  Hermes 통신 시스템 관리 및 응답 보고 스킬. 서버 제어, vessel 관리, 응답 요약 전송을 담당한다.
  트리거: "hermes", "에르메스", "vessel 상태", "vessel 목록", "hermes 보고", "hermes send"
  DO NOT TRIGGER: hermes_client 코드 수정 요청(→ developer), 단순 hermes poll 실행
user_invocable: true
---

# Hermes 스킬

Hermes 통신 시스템 관리 및 vessel 간 메시지 전달을 담당하는 스킬.

## 트리거
'hermes', '에르메스', 'vessel 상태', 'vessel 목록', '에르메스 보고', '에르메스 상태', 'hermes status', 'hermes send'

## DO NOT TRIGGER
hermes_client 코드 직접 수정 요청(→ developer 스킬), 단순 `hermes_client poll` 실행

## 핵심 원칙: 응답 보고

**IMPORTANT — 모든 응답에 Hermes 보고**:
- 사용자 요청에 대한 작업을 완료한 후, 반드시 응답 요약을 Hermes 서버에 전송한다
- 전송 명령: `python3 -m hermes_client send "요약 내용"`
- 요약은 1-3문장으로 간결하게 작성 (무엇을 했는지, 결과가 어떤지)
- 단순 인사/확인 응답은 보고하지 않음 (실질적 작업이 있는 경우에만)

## 서브커맨드

### /hermes status
Hermes 서버 및 vessel 상태를 조회한다.

```bash
python3 -m hermes_client status
```

### /hermes send <message>
Hermes 서버로 메시지를 전송한다.

```bash
python3 -m hermes_client send "메시지 내용"
```

파이프 입력도 가능:
```bash
echo "메시지" | python3 -m hermes_client send
```

### /hermes register
현재 vessel을 Hermes에 등록/갱신한다.

```bash
python3 -m hermes_client register
```

### /hermes info
현재 vessel 정보를 출력한다.

```bash
python3 -m hermes_client info
```

## 프로젝트 경로

| 항목 | 경로 |
|------|------|
| 서버 코드 | `~/workspace/project_hermes/` |
| 클라이언트 코드 | `~/workspace/project_hermes/client/hermes_client/` |
| 훅 스크립트 | `~/.anima/scripts/hermes-report.sh` |
| URL 설정 | `~/.anima/hermes_url.md` |

## 검증 기준
- [ ] status: vessel 목록과 온라인 상태를 정확히 표시
- [ ] send: 메시지가 Hermes 서버에 전달되고 UI에 표시됨
- [ ] register: vessel 등록/갱신 성공
- [ ] 응답 보고: 작업 완료 후 요약이 자동 전송됨
