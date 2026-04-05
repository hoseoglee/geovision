---
name: work_report
description: |
  작업 결과 보고서를 마크다운 형식으로 생성하여 ~/papyrus/records/에 저장하고 텔레그램으로 알림을 전송한다.
  트리거: "작업 보고서 작성", "보고서 작성해", "work report", "완료보고", "완료보고서", "작업 결과 정리", "보고서 써줘"
  이메일 트리거: "보고서 회사 메일로 보내줘", "메일로 보내", "이메일로 보내줘", "보고서 메일"
  DO NOT TRIGGER: 단순 작업 요약 질문("뭐 했어?"), 주간 보고서(→ weekly_report), 핸드오프(→ handoff), 반성/리뷰/개선점(→ reflection)
user_invocable: true
---

# Work Report Skill

When the user asks to "create a work report" or "작업 보고서 작성", or at the end of a task, follow these steps:

1. **완료 후 검증 (Post-Completion Verification)** — 보고서 작성 전에 수행:
   - **작업 유형 판정**: 마이그레이션, 장애복구, 배포/릴리즈, 일반 개발 중 어디에 해당하는지 판단
   - **마이그레이션**: 감시 시스템(Argos 등) 자체 정상 동작 확인 → 인시던트 0개 확인 → 외부 API 연동 데이터 반환 확인 → 환경 차이 항목 전수 점검
   - **장애복구**: 원래 실패 기능 정상 확인 → 인접 기능 사이드이펙트 확인 → 모니터링 5분 관찰
   - **배포/릴리즈**: 핵심 API 정상 → UI 렌더링 확인 → 로그에 에러 없는지
   - **Docker 빌드 포함 시**: `docker run --rm --entrypoint cat <image> <변경파일>`로 실제 반영 확인 → 컨테이너 재시작 후 호스트 바인드 마운트 권한/소유자 유지 확인
   - **일반 개발**: 테스트 통과 → 빌드 성공 (해당 시)
   - 검증에서 문제 발견 시 **먼저 수정 후** 보고서를 작성한다
   - **검증 결과를 보고서의 "작업 결과" 섹션에 포함**한다

2. **Information Gathering**:
   - Review the conversation history and the changes made to the codebase.
   - Identify the core "Request" (요청사항), "Work Done" (작업 내용), and "Results" (작업 결과).
   - **관련 프로젝트 식별**: 작업이 특정 프로젝트에 관련되었는지 판단한다. `~/workspace/project_{name}/` 또는 `~/papyrus/projects/project_{name}/`에서 작업한 경우 해당 프로젝트명을 기록한다. 여러 프로젝트에 걸친 작업이면 모두 기록한다.
   - **주제 단위 보고서**: 보고서는 세션이 아닌 **주제(토픽)** 단위로 작성한다. 하나의 보고서 = 하나의 주제.
     - 주제 판단 기준: 같은 프로젝트 + 같은 목적의 작업 = 같은 주제. 프로젝트가 다르거나 목적이 다르면(리서치 vs 개발 vs 설정) 별도 보고서.
     - **같은 주제의 후속 작업**: 기존 보고서를 업데이트한다 (작업 내용/결과 추가, 회고 갱신, frontmatter 통계 업데이트).
     - **다른 주제의 새 작업**: 새 보고서를 생성한다.
   - **주제 전환 시 자동 작성**: 사용자의 새 요청이 이전과 다른 주제이면, 이전 주제 보고서를 먼저 작성한 후 새 작업을 시작한다.
   - **배포/커밋 완료 = 작업 완료**: 코드 작업은 배포 또는 머지 완료 시점에 보고서를 작성한다.
   - **세션 통계 수집**: `python3 ~/.anima/soul/skills/work_report/session_stats.py` 실행하여 토큰 사용량과 소요시간을 자동 수집한다. 출력은 JSON 형식이며 `duration_min`, `input_tokens`, `output_tokens`, `total_tokens` 등을 포함한다.

2. **Report Generation**:
   - `~/.anima/vessels/local/{adapter}.yaml`에서 location, machine, tool을 읽고, `python3 -m hermes_client instance get`을 실행하여 동적 인스턴스 번호를 가져온다 (Hermes 우선, 로컬 폴백). Vessel ID 형식: `{location}-{machine}-{tool}-{instance}` (예: `집-MacMini-claude-code-2`). **Vessel 파일의 instance 값은 사용하지 않는다** — 반드시 hermes_client instance의 결과를 사용한다.
   - Create a markdown report with the following structure:
     ```markdown
     ---
     tags: [report]
     date: yyyy-mm-dd
     vessel: [vessel ID]
     project: [관련 프로젝트명, 예: hermes / 여러 개면 [hermes, anima] / 없으면 생략]
     duration: [duration_min 값, 예: 15]
     tokens: [total_tokens 값]
     ---
     # 작업 결과 보고서

     **Vessel**: [vessel ID] @ [hostname]
     **프로젝트**: [관련 프로젝트명, 예: [[project_hermes]] / 여러 개면 [[project_hermes]], [[project_anima]] / 프로젝트 무관 작업이면 "일반"]
     **소요시간**: [session_stats.py의 duration_min 값 사용, 예: 15분]
     **토큰**: input: X + output: Y = total: Z (cache: W)

     ## AI가 이해한 요청사항
     [Summarize the user request clearly]

     ## 작업 내용
     1. [Step 1]
     2. [Step 2]

     ## 작업 결과
     1. [Result 1]
     2. [Result 2]

     ## 🎓 배움 노트
     이번 작업에서 사용한 기술과 방법을 정리합니다. 다음에 직접 해볼 수 있도록 단계별로 설명합니다.

     #### 1. {기술/도구/명령어}
     **한줄 요약**: {무엇인지 한 문장으로}
     **왜 사용했나**: {이번 작업에서 왜 필요했는지}
     **직접 해보기**:
     ```bash
     # 단계별 명령어
     ```
     **더 알아보기**: {공식 문서 URL 또는 추천 자료}

     [선생님 스킬(~/.anima/soul/skills/선생님/SKILL.md) 형식을 따른다]
     [포함 기준: 새로운 기술, 처음 사용한 도구, 사용자가 직접 활용 가능한 명령어/패턴]
     [제외 기준: AI 내부 로직, 사용자가 이미 잘 아는 기본 명령어, 단순 조회]
     [배울 내용이 없는 단순 작업이면 이 섹션 생략]

     ## 관련 문서
     - [[관련_papyrus_문서]] (있으면 wikilink로 연결)

     ## 참고자료 (References)
     - [제목](URL) — 인터넷 자료
     - [[내부문서제목]] — 내부 문서
     - 참고자료가 없으면 "없음"으로 표기

     ## 다음에 하면 좋을 작업
     1. [현재 작업의 연장선에서 자연스럽게 이어질 수 있는 후속 작업 5가지를 제안]
     2. [...]
     3. [...]
     4. [...]
     5. [...]

     ## 회고 (Retrospective)

     [작업 규모에 따라 깊이가 달라진다]
     [경량(30분 미만): 교훈 있으면만 기록, 잘한 점/개선점 생략 가능]
     [표준(30분~3시간): 아래 기본 템플릿 사용]
     [중량(3시간+ 또는 마이그레이션/장애복구): 5 Whys 필수 추가]

     ### 잘한 점
     - [이번 작업에서 효과적이었던 접근법, 도구 사용, 판단]

     ### 개선할 점
     - [비효율적이었던 부분, 실수, 사용자 교정이 있었던 부분]
     - [최소 1개 이상 기록한다. 완벽한 작업이면 "향후 리스크: ..."로 잠재 위험 식별]

     ### 근본 원인 분석 (5 Whys) — 중량 작업 시 필수
     [개선할 점 중 가장 중요한 문제에 대해 5 Whys를 수행한다]
     **문제**: [무엇이 잘못되었는가]
     1. **왜?** [직접 원인]
     2. **왜?** [그 원인의 원인]
     3. **왜?** [더 깊은 원인]
     4. **왜?** [구조적/시스템적 원인]
     5. **왜?** [근본 원인]
     → **근본 원인**: [한 문장 요약]
     → **재발 방지**: [구체적 조치]

     ### 재발방지 체크리스트 — 중량 작업 시 필수
     [5 Whys에서 도출된 재발방지 조치를 체크리스트로 변환]
     - [ ] [다음에 같은 유형의 작업 시 확인할 항목 1]
     - [ ] [확인할 항목 2]
     - [ ] [확인할 항목 3]
     [이 체크리스트는 lessons.md의 해당 교훈에 첨부하고, _knowledge.md에도 추가한다]

     ### 교훈 기록
     - [이번 작업에서 새로 배운 것, lessons.md에 추가할 항목이 있으면 기록]
     - 교훈이 없으면 "없음"

     ### 지침 점검
     - [이번 작업에서 우회/폴백을 사용했는가? → 지침에 문서화되어 있는가?]
     - [새 도구/패턴을 발견했는가? → 반복 사용될 가능성이 있으면 지침에 추가]
     - [사용자가 직접 해결 방법을 알려줬는가? → 지침에 빠져있었다는 신호]
     - 추가할 내용이 없으면 "없음"
     ```

3. **File Saving**:
   - 작업명을 한글로 간결하게 정한다 (예: `시크릿관리_구현`, `토큰_효율화_적용`).
   - 파일명 형식: `yyyy-mm-dd-hh-mm_{작업명}.md`.
   - Save the file to: `~/papyrus/records/`.
   - Use the Write tool to save the content.

4. **Papyrus 동기화**:
   - 보고서 저장 후 `cd ~/papyrus && git add -A && git commit -m "report: {work_name}" && git push origin main`을 실행하여 변경사항을 GitHub에 백업한다.
   - 동기화 실패 시에도 보고서 저장은 성공으로 처리한다.

5. **아키텍처 문서 연동 + 현행화**:
   - 관련 프로젝트가 있고, `~/papyrus/projects/{프로젝트}/아키텍처.md`가 존재하면:
     - `## 관련 보고서` 섹션에 `- [[보고서파일명(확장자 제외)]]` 옵시디언 링크를 추가한다 (섹션 없으면 생성)
     - 이미 링크가 있으면 중복 추가하지 않는다
   - **IMPORTANT — 아키텍처 현행화 체크**: 이번 작업에서 다음 중 하나라도 해당하면 아키텍처.md를 현행화한다:
     - 새 기능(FR-) 구현 → 요구사항 테이블에 추가
     - 시스템 구조 변경 (새 서비스, 경로, 포트) → 구성도 업데이트
     - 기술적 의사결정 → 의사결정 기록 추가
     - 변경 이력 → 변경 이력 테이블에 추가
   - 해당 없으면 (단순 버그 수정, 문서 작업 등) 건너뜀

6. **교훈 반영 (Lesson Integration)**:
   - 보고서의 "회고 > 개선할 점"에서 교훈으로 남길 항목이 있으면 `~/.anima/soul/memory/lessons.md`에 추가한다.
   - 기존 교훈과 중복되면 추가하지 않는다.
   - 교훈 추가 후 `~/.anima/sync.sh push`로 동기화한다.
   - 또한, 기존 lessons.md의 교훈을 이번 작업에서 성공적으로 적용했다면 해당 교훈 항목에 `- **적용 확인**: yyyy-mm-dd 적용 성공` 라인을 추가한다.

7. **Confirmation (세션 요약 표시)**:
   - 보고서 저장 경로를 알려준다.
   - 교훈이 추가되었으면 어떤 교훈이 기록되었는지 간단히 알려준다.
   - **반드시 마지막에 세션 요약 테이블을 표시한다**:
     ```markdown
     ### 세션 요약

     | 항목 | 내용 |
     |---|---|
     | 주요 작업 | [핵심 작업 1줄 요약] |
     | 수정 파일 | [변경된 주요 파일/모듈 나열] |
     | 커밋 | [N건 push 완료 / 커밋 없음] |
     | 동기화 | [anima/papyrus push 상태] |
     | 후속 제안 | [가장 중요한 다음 작업 1개] |
     ```
   - 이 테이블은 사용자가 작업 결과를 한눈에 파악할 수 있도록 핵심만 압축한 것이다.

8. **텔레그램 알림 (Telegram Notification)**:
   - 보고서 작성 및 동기화 완료 후, 텔레그램으로 축약된 작업 결과를 전송한다.
   - **시크릿 조회**:
     ```bash
     TOKEN=$(~/.anima/scripts/secret.sh get telegram.jarvis)
     CHAT_ID=$(~/.anima/scripts/secret.sh get telegram.chat_id)
     ```
   - **보고서 파일 첨부 + 축약 요약 전송** (`sendDocument` API 사용):
     ```bash
     curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendDocument" \
       -F chat_id="${CHAT_ID}" \
       -F document=@"${REPORT_FILE_PATH}" \
       -F parse_mode="Markdown" \
       -F caption="$(cat <<'CAPTION'
     ✅ *작업 완료* — {작업명}

     📂 {프로젝트명 또는 "일반"}
     🔧 {주요 변경 1-2개, 간결하게}
     ⏱ {소요시간}분 · 🪙 {토큰 요약}

     💡 *다음*: {후속 작업 1순위}
     CAPTION
     )"
     ```
   - **캡션 작성 규칙**:
     - 1행: 상태 이모지 + 카테고리 + 대시 + 제목 (볼드)
     - 2행: 빈 줄
     - 3~5행: 핵심 정보 (프로젝트, 변경사항, 시간/토큰)
     - 6행: 빈 줄
     - 7행: 후속 작업 (💡)
     - 작업명은 보고서 제목에서 추출, 변경 파일은 가장 중요한 1-2개만
   - **전송 실패 처리**:
     - 시크릿 조회 실패 시: 경고 출력 후 건너뜀 (보고서 자체는 이미 저장됨)
     - API 호출 실패 시: 에러 로그 출력 후 건너뜀 (알림 실패가 보고서를 무효화하지 않음)
     - `"ok":true` 확인하여 전송 성공 여부 판단
   - **anima-worker 연동**:
     - 사용자가 텔레그램에서 이 알림에 답장하면, anima-worker가 답장 내용을 새 작업으로 수신
     - anima-worker는 답장 내용을 Claude Code headless 세션으로 전달하여 후속 작업을 자동 실행
     - 후속 세션은 보고서 파일을 참조하여 이전 작업의 컨텍스트를 이어받음

9. **이메일 전송 (Email Notification)**:
   - 사용자가 "보고서 회사 메일로 보내줘", "메일로 보내", "이메일로 보내줘" 등 요청 시 실행한다.
   - **자동 실행하지 않음** — 사용자가 명시적으로 요청할 때만 발송한다.
   - **수신 주소 결정**:
     - "회사 메일" → `~/.anima/soul/memory/preferences.md`의 "회사 이메일" 항목 사용 (기본: hoseog.lee@samsung.com)
     - 사용자가 직접 이메일 주소를 지정하면 해당 주소 사용
   - **발송 방법**:
     ```bash
     python3 ~/.anima/soul/skills/work_report/send_email.py \
       "${REPORT_FILE_PATH}" \
       "hoseog.lee@samsung.com" \
       "[작업보고서] ${WORK_NAME}"
     ```
   - **SMTP 설정**: anima secrets에서 조회 (`smtp.host`, `smtp.port`, `smtp.user`, `smtp.password`)
     - secrets 미설정 시: "SMTP 설정이 없습니다. `~/.anima/secrets.yaml`에 smtp.host/user/password를 추가해주세요." 안내
   - **전송 실패 처리**:
     - SMTP 설정 없음: 안내 메시지 출력 후 건너뜀
     - 발송 실패: 에러 내용 출력 후 건너뜀 (보고서 자체는 이미 저장됨)
   - **대상 보고서**: 가장 최근 작성한 보고서 파일. 보고서 작성 직후라면 방금 저장한 파일, 별도 요청이면 `~/papyrus/records/`에서 가장 최신 파일

## 검증 기준

- [ ] 보고서에 Vessel ID, 소요시간, 토큰 정보, 관련 프로젝트가 포함됨
- [ ] 관련 프로젝트가 있으면 아키텍처 문서에 보고서 옵시디언 링크가 추가됨
- [ ] "회고" 섹션에 잘한 점/개선할 점/교훈 기록이 포함됨
- [ ] 보고서가 ~/papyrus/records/에 올바른 파일명 형식으로 저장됨
- [ ] papyrus git push 완료
- [ ] 교훈이 있으면 lessons.md에 반영됨
- [ ] 세션 요약 테이블이 사용자에게 표시됨
- [ ] "배움 노트" 섹션이 포함됨 (새 기술/도구 사용 시, 단순 작업이면 생략 가능)
- [ ] 텔레그램 알림이 전송됨 (보고서 파일 첨부)
- [ ] 이메일 전송 요청 시 send_email.py로 발송됨 (SMTP 설정 필요)

## 변경 이력

| 날짜 | 변경 내용 | 트리거 |
|------|----------|--------|
| 2026-03-07 | 초기 생성 | 사용자 요청 |
| 2026-03-10 | 텔레그램 알림 단계(7단계) 추가 | 사용자 요청 |
| 2026-03-10 | 표준 템플릿 준수 (frontmatter, DO NOT TRIGGER, 검증 기준, 변경 이력) | /anima improve |
| 2026-03-11 | 이메일 전송 기능(8단계) 추가, send_email.py 스크립트 생성 | 사용자 요청 |
| 2026-03-12 | "배움 노트" 섹션 추가 (선생님 스킬 연동) | 사용자 요청 |
| 2026-03-15 | 관련 프로젝트 명시 (frontmatter project 필드 + 본문 프로젝트 라인), 아키텍처 문서 연동 단계(5단계) 추가 | 사용자 요청 |
