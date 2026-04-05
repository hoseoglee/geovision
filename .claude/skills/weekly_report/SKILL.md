---
name: weekly_report
description: |
  Papyrus에 누적된 작업 보고서(records)를 기반으로 주 단위 요약 보고서를 자동 생성하는 스킬.
  트리거: "주간 보고서 작성해", "이번 주 작업 요약해줘", "주간 요약 생성", "weekly report", "이번주에 뭐했어"
  DO NOT TRIGGER: 단일 작업 보고서(→ work_report), 일간 보고서, 작업 중 상태 확인
user_invocable: true
---

# 주간 요약 보고서 자동 생성 스킬 (Weekly Report Skill)

사용자가 주간 단위의 개발 성과나 활동 요약을 요청할 때 이 스킬을 실행합니다. 
AI는 `~/papyrus/records/` 폴더 내의 최근 7일(또는 이번 주) 작업 보고서들을 분석하여 정형화된 주간 요약 문서를 생성합니다.

## 실행 절차 (Workflow)

1. **기간 설정 및 대상 파일 수집**
   - 현재 시간을 기준으로 분석 대상이 되는 한 주(월요일~일요일)의 날짜 범위를 인식합니다.
   - `~/papyrus/records/` 디렉토리 내에서 해당 날짜 범위에 생성된 작업 보고서(`.md` 파일)들을 모두 찾습니다. (파일명: `yyyy-mm-dd-hh-mm_*.md` 형식)

2. **통계 데이터 집계 (Statistics)**
   - 수집된 보고서들의 Frontmatter(`duration`, `tokens`) 값을 파싱하고 합산하여 총 소요시간 및 토큰 사용량을 계산합니다.
   - 어느 Vessel에서 주로 작업이 이루어졌는지, 어떤 프로젝트/태그(`tags`)가 가장 많이 다뤄졌는지 요약합니다.

3. **작업 내용 요약 (Content Summarization)**
   - 각 보고서의 `## 작업 내용` 및 `## 관련 문서` 등을 읽고, 핵심 성과와 진행 상황을 프로젝트별 또는 테마별로 분류 및 요약합니다.
   - 문제 해결 방식이나 중요 결정 사항도 포함합니다.

4. **문서 생성 (Document Creation)**
   - 집계 및 요약된 내용을 바탕으로 아래의 "주간 요약 보고서 포맷"에 맞춰 Markdown 문서를 작성합니다.
   - 문서가 저장될 경로는 `~/papyrus/records/weekly/yyyy-Www_Weekly_Report.md` 입니다. (예: `2026-W10_Weekly_Report.md`) (필요 시 `weekly` 폴더를 생성합니다.)

5. **학습 하네스 분석 (Lesson Harness Analysis)**
   - `~/.anima/soul/memory/lessons.md`를 분석하여 해당 주에 기록된 교훈을 분류별(process, technical, understanding, communication, approach, effective)로 집계합니다.
   - 같은 유형의 실수가 반복되고 있는지 패턴을 파악하고, 근본 원인을 분석합니다.
   - 적용 확인(적용 확인: yyyy-mm-dd)이 3회 이상인 교훈은 승격 대상으로 식별합니다.
   - 이전 주간 보고서가 있으면 비교하여 실수 감소/증가 추이를 파악합니다.

6. **Anima 동기화 (Sync)**
   - 문서 생성이 완료되면, 터미널에서 `bash ~/.anima/sync.sh push`를 실행하여 갱신된 Papyrus 리포지토리를 GitHub에 백업 및 동기화합니다.

7. **텔레그램 알림 (Telegram Notification)**
   - 주간 보고서 파일을 첨부하여 텔레그램으로 요약을 전송한다.
   - **시크릿 조회**:
     ```bash
     TOKEN=$(~/.anima/scripts/secret.sh get telegram.jarvis)
     CHAT_ID=$(~/.anima/scripts/secret.sh get telegram.chat_id)
     ```
   - **보고서 파일 첨부 + 요약 전송** (`sendDocument` API 사용):
     ```bash
     curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendDocument" \
       -F chat_id="${CHAT_ID}" \
       -F document=@"${REPORT_FILE_PATH}" \
       -F parse_mode="Markdown" \
       -F caption="$(cat <<'CAPTION'
     📊 *주간 보고서* — {yyyy}년 {ww}주차

     📋 보고서 {N}건 · ⏱ 총 {시간}분 · 🪙 {토큰}
     🏆 {핵심 성과 1줄 요약}
     📈 교훈: 신규 {N}건, 적용 {N}건

     💡 *다음 주*: {최우선 계획 1개}
     CAPTION
     )"
     ```
   - **전송 실패 처리**: 시크릿/API 실패 시 경고 출력 후 건너뜀 (보고서는 이미 저장됨)

---

## 주간 요약 보고서 포맷 (Template)

```markdown
---
tags: [weekly, report, summary]
date: {yyyy-mm-dd}
week: {yyyy-Www}
total_duration: {합산_숫자}
total_tokens: {합산_숫자}
---

# 주간 업무 요약 보고서 ({yyyy}년 {ww}주차)

**조사 기간**: {yyyy-mm-dd} ~ {yyyy-mm-dd}
**총 작업 시간**: {합산시간}분
**총 토큰 사용량**: {합산토큰}
**주요 참여 Vessel**: {가장 많이 참여한 Vessel들}

## 1. 이번 주 핵심 성과 (Highlights)
(주기적으로 언급된 중요 개발 사항을 3~5개의 핵심 불릿 포인트로 요약)
- 
- 
- 

## 2. 프로젝트별 진행 상황 (By Project)

### [프로젝트 A]
- 상세 작업 내역 1 (관련 문서 링크)
- 상세 작업 내역 2 (관련 문서 링크)

### [프로젝트 B]
- 상세 작업 내역 1 (관련 문서 링크)
- 상세 작업 내역 2 (관련 문서 링크)

## 3. 통계 및 인사이트 (Insights)
- **일별 작업량**: 요일별 보고서 수와 소요시간 막대 그래프 (텍스트)
- **스킬 사용 빈도**: 어떤 스킬이 가장 많이 트리거되었는지 (tags 기반 집계)
- **평균 작업 소요시간**: 보고서당 평균 duration
- **토큰 효율성**: 작업당 평균 토큰 사용량 추이
- (가장 많은 리소스를 투자한 작업이나 주목할 만한 문제 해결 패턴 분석)

## 4. 학습 하네스 분석 (Lesson Harness Analysis)

### 교훈 통계
- 이번 주 신규 교훈: X건 (process: N, technical: N, understanding: N, communication: N, approach: N, effective: N)
- 적용 확인: Y건
- 승격 대상: (적용 확인 3회 이상인 교훈 목록)

### 반복 패턴
- [같은 유형의 실수가 반복되고 있으면 근본 원인 분석]

### 개선 추이
- [이전 주 대비 실수 감소/증가 추적]

## 5. 다음 주 계획 제안 (Next Steps)
- (이번 주 완료되지 않았거나 각 보고서의 "다음에 하면 좋을 작업"을 기반으로 도출된 다음 주 액션 아이템)

```

## 검증 기준

- [ ] 해당 주의 모든 보고서가 수집됨
- [ ] 통계(총 소요시간, 총 토큰, Vessel 분포)가 정확히 집계됨
- [ ] 프로젝트별 진행 상황이 요약됨
- [ ] 학습 하네스 분석(교훈 분류별 빈도, 반복 패턴, 승격 후보)이 포함됨
- [ ] ~/papyrus/records/weekly/에 올바른 파일명으로 저장됨
- [ ] sync.sh push 완료
- [ ] 텔레그램 알림이 전송됨 (보고서 파일 첨부)

## 변경 이력

| 날짜 | 변경 내용 | 트리거 |
|------|----------|--------|
| 2026-03-07 | 초기 생성 | 사용자 요청 |
| 2026-03-10 | 표준 템플릿 준수 (frontmatter, DO NOT TRIGGER, 검증 기준, 변경 이력) | /anima improve |
| 2026-03-19 | 텔레그램 알림 단계(7단계) 추가, 메시지 포맷 통일 | 텔레그램 포맷 통일 작업 |
