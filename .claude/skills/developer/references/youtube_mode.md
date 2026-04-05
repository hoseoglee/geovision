# YouTube 모드 상세 (/developer youtube)

YouTube 영상의 스크립트(자막/트랜스크립트)를 소스로 하여, 프로젝트 생성부터 개발 완료까지 자동으로 진행한다.

## YouTube 워크플로우

```
┌──────────────────────────────────────────────────────────┐
│  Phase Y1: FETCH (영상 정보 + 스크립트 수집)              │
│  ├─ YouTube 영상 메타데이터 수집 (제목, 설명, 길이)       │
│  └─ 스크립트/자막 추출                                    │
│                                                          │
│  Phase Y2: ANALYZE (스크립트 분석 → 프로젝트 정의)        │
│  └─ 스크립트 내용 분석 → 프로젝트 개요, 기능 목록,       │
│     기술 스택 추천, 아키텍처 제안 도출                     │
│                                                          │
│  Phase Y3: CREATE (프로젝트 생성)                         │
│  └─ /create_project 스킬로 워크스페이스 + papyrus 생성    │
│                                                          │
│  Phase Y4: SPEC FROM SCRIPT (스크립트 → SDD 스펙)        │
│  └─ 분석 결과를 SDD 스펙으로 변환 → Phase 1로 합류       │
│                                                          │
│  ════════ 이후 일반 Developer 워크플로우 ════════         │
│  Phase 0~8: LEARN → SPEC(plan만) → SCAFFOLD → BUILD →   │
│            HARNESS → DEPLOY → VERIFY → REPORT → META     │
└──────────────────────────────────────────────────────────┘
```

## Phase Y1: FETCH (영상 정보 + 스크립트 수집)

YouTube 영상에서 메타데이터와 스크립트를 추출한다.

1. **메타데이터 수집**
   - `yt-dlp --dump-json --no-download "<url>"` 로 영상 정보 추출
   - 추출 항목: title, description, duration, upload_date, channel
   - yt-dlp 미설치 시: `pip install yt-dlp` 자동 실행

2. **스크립트 추출** (우선순위 순)
   - **방법 1**: yt-dlp 자막 다운로드
     ```bash
     yt-dlp --write-auto-sub --sub-lang ko,en --skip-download --sub-format vtt -o "/tmp/yt_script" "<url>"
     ```
     - 한국어 자막 우선, 없으면 영어, 없으면 자동 생성 자막
   - **방법 2**: youtube-transcript-api (Python)
     ```bash
     pip install youtube-transcript-api
     python3 -c "
     from youtube_transcript_api import YouTubeTranscriptApi
     transcript = YouTubeTranscriptApi.get_transcript('VIDEO_ID', languages=['ko','en'])
     for t in transcript: print(t['text'])
     "
     ```
   - **방법 3**: WebFetch로 영상 페이지에서 자막 데이터 추출

3. **스크립트 정리**
   - 타임스탬프 제거, 중복 라인 제거
   - 연속된 짧은 문장을 문단으로 병합
   - `/tmp/yt_script_clean.txt`에 정리된 텍스트 저장

4. **원본 보존**
   - 스크립트 원문을 프로젝트 생성 후 `docs/youtube_source.md`에 저장:
     ```markdown
     ---
     source: <YouTube URL>
     title: <영상 제목>
     channel: <채널명>
     duration: <영상 길이>
     fetched: <날짜>
     ---
     # YouTube 원본 스크립트
     <정리된 스크립트 전문>
     ```

## Phase Y2: ANALYZE (스크립트 분석)

스크립트 내용을 분석하여 프로젝트 정의를 도출한다.

**분석 프롬프트 구조:**
```
다음은 YouTube 영상 "{title}"의 스크립트입니다.

<script>
{cleaned_script}
</script>

이 영상에서 설명하는 소프트웨어/서비스/기능을 분석하여 다음을 도출하세요:

1. **프로젝트 개요**: 무엇을 만드는 프로젝트인가? (1-2문장)
2. **핵심 기능 목록**: 영상에서 언급된 기능들을 우선순위 순으로 나열
3. **기술 스택 추천**: 영상에서 명시적으로 언급된 기술 + 적합한 기술 제안
4. **아키텍처 제안**: 프론트엔드/백엔드/DB/인프라 구성
5. **MVP 범위**: 전체 기능 중 MVP로 먼저 구현할 핵심 기능 3-5개
6. **프로젝트명 제안**: (--name 미지정 시) 영어 소문자+하이픈, 간결하게
```

**분석 결과를 사용자에게 제시:**
```
🎬 YouTube → Project 분석 결과

📹 영상: "{title}" ({duration})
📺 채널: {channel}

📋 프로젝트 개요:
  {project_summary}

🛠 추천 기술 스택:
  FE: {frontend}  |  BE: {backend}  |  DB: {database}

⭐ MVP 핵심 기능 (우선순위):
  1. {feature_1}
  2. {feature_2}
  3. {feature_3}

📦 프로젝트명: {project_name}

이대로 진행할까요? (수정 사항이 있으면 말씀해주세요)
```

- `--mode auto` 시: 확인 없이 바로 진행
- `--mode guided` (기본): 사용자 확인 후 진행

## Phase Y3: CREATE (프로젝트 생성)

`/create_project` 스킬을 호출하여 프로젝트를 생성한다.

- workspace: `~/workspace/project_{name}/`
- papyrus: `~/papyrus/projects/project_{name}/`
- GitHub repo 생성 (create_project 스킬 기본 동작)
- `docs/youtube_source.md`에 원본 스크립트 저장

## Phase Y4: SPEC FROM SCRIPT (스크립트 → SDD 스펙)

분석 결과를 SDD 스펙으로 변환한다.

1. **constitution.md 생성** (`/sdd init` 호출)
   - 프로젝트 개요, 기술 스택, 코딩 컨벤션을 분석 결과에서 자동 채움

2. **기능 스펙 생성** (`/sdd spec`)
   - MVP 기능 각각에 대해 스펙 작성
   - YouTube 스크립트에서 언급된 구체적 동작을 AC(수락 기준)으로 변환
   - 스크립트 원문을 참조하여 세부사항 누락 방지:
     ```markdown
     > 📹 YouTube 원본 참조: docs/youtube_source.md 라인 42-58
     ```

3. **Phase 1 합류**
   - spec이 이미 작성되었으므로 → `/sdd plan` (계획 작성)부터 시작
   - 이후 일반 Developer 워크플로우 Phase 0~8 실행

## 전체 예시

```bash
# 기본 사용 (guided 모드)
/developer youtube https://youtu.be/dQw4w9WgXcQ

# 프로젝트명 지정 + 자동 모드
/developer youtube https://youtu.be/dQw4w9WgXcQ --name my-app --mode auto

# 긴 URL도 지원
/developer youtube https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

## 주의사항

- **자막 없는 영상**: 자동 생성 자막(auto-sub)을 사용하되, 정확도가 낮을 수 있음을 사용자에게 알림
- **비개발 영상**: 스크립트 분석 결과 소프트웨어 프로젝트로 변환이 어려운 경우, 사용자에게 확인 후 진행
- **긴 영상 (60분+)**: 스크립트를 섹션별로 나눠 분석. MVP 범위를 좁게 설정
- **영어 영상**: 분석은 영어로 하되, 스펙/문서는 한국어로 작성 (persona.md 규칙)
- **스크립트 추출 실패**: 3가지 방법 모두 실패 시 사용자에게 영상 내용을 직접 설명해달라고 요청
