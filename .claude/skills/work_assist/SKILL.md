---
name: work_assist
description: |
  업무 PC(Windows) 원격 제어 특화 스킬. screen_agent 엔진 위에서 동작하며,
  회사 업무 앱(Outlook, Teams, Excel, Chrome 등) 조작을 자동화한다.
  학습된 워크플로우와 앱별 지식을 축적하여 반복 사용할수록 빨라진다.
  트리거: "메일 보내줘", "팀즈에서 ~해줘", "업무 PC에서 ~해줘", "엑셀 열어줘", "회사 ~해줘", "work assist"
  DO NOT TRIGGER: KVM 서버 개발/수정 요청(→ developer), 로컬 파일 작업, screen_agent 엔진 자체 수정
user_invocable: true
---

# Work Assist Skill

업무 PC(Windows) 원격 제어 특화 스킬.
글로벌 `screen_agent`의 조작 엔진 위에서 동작하며, 회사 업무에 최적화된 자동화를 수행한다.

---

## 아키텍처: 3계층 구조

```
┌─────────────────────────────────────┐
│  work_assist  (이 스킬 — 최상위)      │  "메일 보내줘", "팀즈 회의 참가"
├─────────────────────────────────────┤
│  pc_knowledge  (학습 지식 저장소)      │  앱 지식, 워크플로우, 보정 기록
├─────────────────────────────────────┤
│  screen_agent  (글로벌 조작 엔진)      │  스냅샷 → 분석 → 클릭/타이핑
└─────────────────────────────────────┘
```

- **screen_agent**: KVM API, 좌표 변환, 실행 루프, 폴백 전략 등 범용 조작 엔진 (글로벌 스킬)
- **pc_knowledge**: 앱별 UI 맵, 검증된 워크플로우, 실패 보정 기록 (프로젝트 내 파일)
- **work_assist**: 사용자 요청 파싱 → knowledge 조회 → screen_agent 호출 → 결과 학습

---

## 지식 저장소 (pc_knowledge)

```
~/papyrus/projects/project_view/pc_knowledge/
├── desktop.md              # 바탕화면 레이아웃, 작업표시줄 구조
├── apps/
│   ├── outlook.md          # Outlook UI 맵, 단축키, 특수 처리
│   ├── teams.md            # Teams UI 맵
│   ├── excel.md            # Excel UI 맵
│   ├── chrome.md           # Chrome UI 맵
│   └── kakaotalk.md        # 카카오톡 UI 맵
├── workflows/
│   ├── 메일_발송.md         # 검증된 절차 + 단축키 시퀀스
│   ├── 팀즈_회의참가.md
│   └── ...                 # 성공한 작업이 자동으로 추가됨
└── corrections.md          # 실패 패턴 → 보정 방법 기록
```

### 지식 파일 형식

**앱 지식 (apps/*.md)**:
```markdown
# Outlook
## 실행 방법
- 작업표시줄 고정 여부: 예 (위치: 좌측에서 N번째)
- 단축키: 없음 (Win+S → "Outlook" 검색)
## 핵심 단축키
- 새 메일: Ctrl+N
- 보내기: Ctrl+Enter (또는 Alt+S)
- 회신: Ctrl+R
- 전체회신: Ctrl+Shift+R
## 한글 입력
- PowerShell: Set-Clipboard → Ctrl+V
## 주의사항
- 첫 실행 시 로딩 느림 → 스냅샷 3초 대기
```

**워크플로우 (workflows/*.md)**:
```markdown
# 메일 발송
## 선행조건
- Outlook 실행 및 로그인 상태
## 절차
1. Outlook 활성화 (Alt+Tab 또는 작업표시줄)
2. Ctrl+N (새 메일)
3. 받는 사람 필드에 이메일 입력 → Tab
4. 제목 입력 → Tab
5. 본문 입력 (한글: clipboard 방식)
6. Ctrl+Enter (전송)
## 검증
- "메시지를 보냈습니다" 토스트 확인 또는 보낸편지함 확인
## 실패 시
- "받는 사람을 확인하세요" → 이메일 주소 재확인
- 팝업 다이얼로그 → Esc 후 재시도
```

---

## 실행 흐름

```
[1] 사용자 요청 파싱
    "홍길동에게 회의 일정 메일 보내줘"
    → 앱: Outlook, 작업: 메일 발송, 대상: 홍길동, 내용: 회의 일정

[2] pc_knowledge 조회
    → workflows/메일_발송.md 로드
    → apps/outlook.md 로드 (단축키, 특수 처리)

[3] 워크플로우 존재 여부에 따라 분기
    ┌─ 있음 → 저장된 절차대로 실행 (빠른 경로)
    └─ 없음 → screen_agent로 탐색 실행 (느린 경로)

[4] screen_agent 엔진으로 실행
    - 글로벌 screen_agent의 KVM API, 실행 루프, 폴백 전략 사용
    - 매 단계 스냅샷 검증

[5] 결과 학습
    ┌─ 성공 → 워크플로우 저장/업데이트
    └─ 실패 → corrections.md에 실패 패턴 + 보정 방법 기록
```

---

## 학습 메커니즘

### 워크플로우 자동 기록
- **새 작업 성공 시**: 실행한 절차를 `workflows/`에 마크다운으로 저장
- **같은 요청 재발 시**: 저장된 워크플로우를 로드하여 즉시 실행 (탐색 단계 스킵)
- **워크플로우 업데이트**: 더 효율적인 경로 발견 시 기존 워크플로우 갱신

### 실패 패턴 학습
- 실패한 조작과 성공한 보정 방법을 `corrections.md`에 기록
- 다음 실행 시 같은 상황 감지되면 보정 방법을 선제 적용

### 앱 지식 축적
- 새 앱을 처음 조작할 때 UI 구조, 단축키, 특수 처리를 `apps/`에 기록
- 세션마다 앱 지식이 누적되어 점점 빨라짐

---

## 한글 입력 전략

`/api/type`은 ASCII만 지원. 한글은 다음 순서로 시도:

```
1. PowerShell 경유 (가장 안정적)
   - PowerShell 창 활성화
   - Set-Clipboard -Value "한글 텍스트" 실행
   - 대상 앱으로 전환 → Ctrl+V

2. 직접 clipboard (PowerShell 없을 때)
   - xclip으로 라즈베리파이 클립보드 설정
   - Ctrl+V (KVM 환경에서는 제한적)
```

---

## 보안 규칙

1. **자격증명 금지**: 비밀번호, 인증서, OTP를 워크플로우/지식 파일에 절대 저장하지 않음
2. **인증 단계**: 로그인 필요 시 사용자에게 수동 처리 요청 또는 `secrets.yaml` 연동
3. **스냅샷 관리**: `/tmp/screen*.jpg`는 작업 완료 후 삭제 권장 (민감 정보 노출 방지)
4. **지식 파일 검토**: `pc_knowledge/`에 민감 정보가 기록되지 않았는지 주기적 확인

---

## screen_agent 연동 규칙

이 스킬은 글로벌 `screen_agent`의 **모든 핵심 규칙**을 상속한다:

1. CLI 우선 (PowerShell First)
2. 사전 확인 (Pre-Check)
3. 키보드 입력 우선 (마우스는 최후 수단)
4. 매 액션 후 스냅샷 확인
5. 단축키 실패 시 즉시 폴백
6. 절대좌표(move_abs) 우선
7. 루프 최대 20회

**추가 규칙**:
- 워크플로우 실행 중 예상치 못한 다이얼로그 → corrections.md 참조 후 처리
- 앱이 응답 없음 상태 → 3초 대기 → 재시도 → Alt+F4 후 재실행
- 한글 입력이 필요한 필드 → 자동으로 PowerShell clipboard 방식 전환

---

## 검증 기준

- [ ] 사용자 요청을 앱/작업/대상으로 올바르게 파싱
- [ ] pc_knowledge에서 관련 워크플로우/앱 지식 로드
- [ ] screen_agent 엔진을 통한 조작 성공
- [ ] 새 워크플로우 자동 저장 또는 기존 워크플로우 업데이트
- [ ] 실패 시 corrections.md에 보정 기록
- [ ] 한글 입력 정상 동작 (clipboard 방식)
- [ ] 보안 규칙 준수 (자격증명 미저장, 스냅샷 정리)

## 변경 이력

| 날짜 | 변경 내용 | 트리거 |
|------|----------|--------|
| 2026-03-28 | 초기 생성 — 3계층 아키텍처, 지식 저장소, 학습 메커니즘 | 사용자 요청 |
