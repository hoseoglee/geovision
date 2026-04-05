---
name: android_agent
description: |
  ADB를 통해 안드로이드 폰 화면을 보면서 터치/입력으로 자율 제어하는 스킬.
  트리거: "폰에서 ~해줘", "안드로이드에서 ~해줘", "핸드폰 ~해줘", "android agent", "폰 제어", "폰 화면", "녹음해줘", "녹취록", "음성 녹음"
  DO NOT TRIGGER: 로컬 파일 작업, PC 제어(→ screen_agent), ADB 설치/설정만 요청
user_invocable: true
---

# Android Agent Skill

ADB를 통해 안드로이드 폰의 화면을 캡처하고, Vision으로 분석한 뒤, 터치/스와이프/키 입력으로 자율 제어한다.

---

## 초기화 (매 세션 최초 1회)

스킬 실행 시 아래 순서로 디바이스 정보를 동적으로 수집한다. **절대 하드코딩하지 않는다.**

```bash
# 1. 연결 확인
adb devices

# 2. 디바이스 정보 수집
MODEL=$(adb shell getprop ro.product.model)
ANDROID_VER=$(adb shell getprop ro.build.version.release)
RESOLUTION=$(adb shell wm size)  # 예: "Physical size: 480x854"
WIDTH=$(echo $RESOLUTION | grep -oP '\d+(?=x)')
HEIGHT=$(echo $RESOLUTION | grep -oP '(?<=x)\d+')

# 3. 화면 상태 확인
adb shell dumpsys power | grep "Display Power"  # state=ON or OFF

# 4. 화면 꺼짐 시간 연장 (작업 중 꺼짐 방지)
adb shell settings put system screen_off_timeout 600000

# 5. ADB Keyboard 설치 여부 확인 (한글 입력용)
adb shell pm list packages | grep adbkeyboard
```

수집한 WIDTH, HEIGHT 값을 이후 스와이프 좌표 계산에 사용한다.

---

## API 레퍼런스

### 스크린샷 캡처
```bash
adb shell screencap -p /sdcard/_screen.png && adb pull /sdcard/_screen.png /tmp/android_screen.png
# Read 툴로 이미지 로드 → Vision으로 분석
```

### 화면 켜기/끄기
```bash
# 화면 켜기
adb shell input keyevent KEYCODE_WAKEUP

# 화면 끄기
adb shell input keyevent KEYCODE_SLEEP
```

### 잠금 해제
```bash
# 스와이프로 잠금 해제 — 좌표는 해상도에 비례 계산
# 중앙X = WIDTH/2, 하단Y = HEIGHT*0.82, 상단Y = HEIGHT*0.35
adb shell input swipe $((WIDTH/2)) $((HEIGHT*82/100)) $((WIDTH/2)) $((HEIGHT*35/100)) 300
```

### 터치 (탭)
```bash
# (x, y) 좌표 탭 — 스크린샷 이미지의 픽셀 좌표 그대로 사용
adb shell input tap <x> <y>
```

### 길게 누르기
```bash
# (x, y)에서 2초간 길게 누르기 (같은 좌표로 느린 스와이프)
adb shell input swipe <x> <y> <x> <y> 2000
```

### 스와이프
```bash
# 아래로 스크롤 (위로 스와이프): 해상도 비례 계산
# 중앙X, 하단70%→상단25%
adb shell input swipe $((WIDTH/2)) $((HEIGHT*70/100)) $((WIDTH/2)) $((HEIGHT*25/100)) 500

# 위로 스크롤 (아래로 스와이프)
adb shell input swipe $((WIDTH/2)) $((HEIGHT*25/100)) $((WIDTH/2)) $((HEIGHT*70/100)) 500

# 좌로 스와이프
adb shell input swipe $((WIDTH*83/100)) $((HEIGHT/2)) $((WIDTH*17/100)) $((HEIGHT/2)) 300

# 우로 스와이프
adb shell input swipe $((WIDTH*17/100)) $((HEIGHT/2)) $((WIDTH*83/100)) $((HEIGHT/2)) 300
```

### 텍스트 입력 (영문/숫자만)
```bash
# 공백은 %s로 입력
adb shell input text "hello%sworld"
```

### 한글 입력 (ADB Keyboard 필수)
```bash
# 1. ADB Keyboard로 전환
adb shell ime set com.android.adbkeyboard/.AdbIME

# 2. 한글 텍스트 입력 — 반드시 adb shell "..." 형식으로, 안쪽은 작은따옴표
adb shell "am broadcast -a ADB_INPUT_TEXT --es msg '한글 텍스트'"

# 3. 작업 후 원래 키보드로 복원 (선택)
adb shell ime set <원래_IME_ID>
```

**IMPORTANT**: 한글 입력 시 반드시 `adb shell "am broadcast -a ADB_INPUT_TEXT --es msg '텍스트'"` 형식을 사용한다.
외부 따옴표를 쌍따옴표, 내부 msg 값을 작은따옴표로 감싸야 한글이 정상 전달된다.

### 키 이벤트
```bash
adb shell input keyevent KEYCODE_HOME          # 홈
adb shell input keyevent KEYCODE_BACK          # 뒤로가기
adb shell input keyevent KEYCODE_APP_SWITCH    # 최근 앱
adb shell input keyevent KEYCODE_ENTER         # Enter
adb shell input keyevent KEYCODE_DEL           # 백스페이스
adb shell input keyevent KEYCODE_VOLUME_UP     # 볼륨 업
adb shell input keyevent KEYCODE_VOLUME_DOWN   # 볼륨 다운
adb shell input keyevent KEYCODE_MOVE_END      # 커서 끝으로
```

### 앱 실행
```bash
# Intent 방식 (권장) — --activity-clear-task로 신선한 상태 보장
adb shell am start -a android.settings.SETTINGS --activity-clear-task  # 설정
adb shell am start -a android.intent.action.VIEW -d "http://google.com" com.android.chrome  # 크롬+URL

# 패키지명 방식 (앱 런처)
adb shell monkey -p <패키지명> -c android.intent.category.LAUNCHER 1

# 설치된 앱 목록
adb shell pm list packages -3         # 3rd party만
adb shell pm list packages | grep -i "keyword"
```

### 앱 종료
```bash
adb shell am force-stop <패키지명>
```

### 알림바 열기/닫기
```bash
adb shell cmd statusbar expand-notifications   # 열기
adb shell cmd statusbar collapse               # 닫기
```

### 현재 화면 Activity 확인
```bash
adb shell dumpsys activity activities | grep mResumedActivity
```

---

## 실행 루프

```
[0] 초기화 — 디바이스 정보 동적 수집, 화면 타임아웃 연장
[1] 화면 상태 확인 → 꺼져있으면 WAKEUP + 잠금 해제
[2] 스크린샷 캡처 → /tmp/android_screen.png
[3] Read 툴로 이미지 로드 → Vision으로 화면 분석
[4] 목표 요소 위치 파악 (이미지 픽셀 좌표 = ADB 터치 좌표)
[5] adb shell input tap/swipe/text 등으로 조작
[6] 적절한 대기 (UI 전환: 0.5~1초, 웹 로딩: 3~5초, 앱 시작: 1~2초)
[7] 스크린샷 다시 캡처 → 결과 확인
[8] 목표 달성 시 종료 / 미달성 시 [2]로 반복
```

---

## 핵심 규칙

1. **디바이스 정보 하드코딩 금지** — 해상도, 모델명 등은 매 세션 초기화 시 동적으로 수집
2. **매 액션 후 반드시 스크린샷으로 결과 확인** — 탭/스와이프가 의도대로 됐는지 검증
3. **좌표는 스크린샷 픽셀 좌표 그대로** — 스크린샷 이미지 좌표 = ADB 터치 좌표 (변환 불필요)
4. **스와이프 좌표는 해상도 비례 계산** — 절대값 하드코딩 금지, WIDTH/HEIGHT 기반 비율로 계산
5. **화면 꺼져 있으면 먼저 WAKEUP** — `dumpsys power | grep "Display Power"`로 상태 확인
6. **작업 시작 시 화면 타임아웃 연장** — `screen_off_timeout 600000` (10분)
7. **앱 실행 시 `--activity-clear-task`** — 이전 상태(하위 화면)가 남아있는 문제 방지
8. **영문은 `input text`, 한글은 ADB Keyboard broadcast** — 혼합 시 영문 먼저 → 한글 전환 → 입력 → 복원
9. **웹 로딩은 넉넉히 대기** — 3~5초, 로딩 완료 후 스크린샷으로 확인
10. **불확실할 때는 스크린샷 먼저** — 추측으로 탭하지 말고 현재 화면 확인 후 행동
11. **루프 최대 20회** — 20회 반복 후 목표 미달성이면 사용자에게 보고 후 중단

---

## ADB Keyboard 설치 (한글 입력용, 최초 1회)

```bash
# 1. APK 다운로드 및 설치
wget -q -O /tmp/ADBKeyboard.apk "https://github.com/senzhk/ADBKeyBoard/raw/master/ADBKeyboard.apk"
adb install /tmp/ADBKeyboard.apk

# 2. 입력기 활성화
adb shell ime enable com.android.adbkeyboard/.AdbIME

# 3. 설치 확인
adb shell pm list packages | grep adbkeyboard
```

설치 후 한글 입력이 필요할 때만 `ime set`으로 전환하고, 작업 후 원래 키보드로 복원한다.

---

## 사용 예시

### 예시 1: 크롬으로 웹사이트 접속
```
1. 초기화 — 디바이스 정보 수집, 타임아웃 연장
2. 화면 켜기 (WAKEUP) → 잠금 해제 (swipe up)
3. am start로 크롬+URL 실행: am start -a android.intent.action.VIEW -d "http://..." com.android.chrome
4. 3~5초 대기 → 스크린샷 → 페이지 로딩 확인
```

### 예시 2: 구글 검색 (영문)
```
1. 크롬에서 google.com 접속
2. 검색창 탭 → input text "search%sterm" → Enter
3. 3초 대기 → 스크린샷 → 검색 결과 확인
```

### 예시 3: 한글 텍스트 입력 (카카오톡 등)
```
1. 원래 IME 확인: settings get secure default_input_method
2. ADB Keyboard로 전환: ime set com.android.adbkeyboard/.AdbIME
3. 입력창 탭
4. 한글 입력: adb shell "am broadcast -a ADB_INPUT_TEXT --es msg '안녕하세요'"
5. 스크린샷으로 확인
6. 원래 IME로 복원
```

### 예시 4: 설정 앱 탐색
```
1. am start -a android.settings.SETTINGS --activity-clear-task
2. 스크린샷 → 메뉴 확인 → 스크롤/탭
3. 목표 설정 항목 찾을 때까지 스크롤 + 스크린샷 반복
```

### 예시 5: 알림 확인
```
1. cmd statusbar expand-notifications
2. 스크린샷 → 알림 내용 읽기
3. cmd statusbar collapse
```

---

## 녹취록 (Voice Recording + Transcription)

폰의 마이크로 녹음하고, 로컬로 가져와 녹취록을 작성한다.
Anima Recorder 앱(VAD 기반)이 설치되어 있으면 ADB broadcast로 제어하고,
없으면 내장 녹음 앱을 android_agent로 UI 제어한다.

### Anima Recorder 앱 제어 (권장)

```bash
# 녹음 시작 (Android 8.0+: 명시적 broadcast 필수)
adb shell am broadcast -a com.anima.voicerecorder.START -n com.anima.voicerecorder/.CommandReceiver

# 녹음 중지
adb shell am broadcast -a com.anima.voicerecorder.STOP -n com.anima.voicerecorder/.CommandReceiver

# 상태 확인
adb shell am broadcast -a com.anima.voicerecorder.STATUS -n com.anima.voicerecorder/.CommandReceiver

# 녹음 파일 가져오기 (VAD로 무음 제거된 WAV)
adb shell "ls -t /sdcard/VoiceRecorder/*.wav | head -1"
adb pull <파일경로> /tmp/recording.wav
```

앱 특징:
- **VAD(Voice Activity Detection)**: 음성 감지 시에만 녹음 → 용량 절감
- **포그라운드 서비스**: 화면 꺼져도 녹음 지속
- **WAV 16kHz mono**: STT에 최적화된 포맷
- **리딩 버퍼 300ms**: 음성 시작 부분이 잘리지 않음

### 앱 미설치 시 — 내장 녹음 앱 UI 제어 (폴백)

```bash
# 녹음 앱 실행
adb shell am start -n com.android.soundrecorder/.SoundRecorder --activity-clear-task
sleep 2
# 스크린샷 → 녹음 버튼 위치 파악 → 탭
# ... (android_agent 실행 루프로 제어)
# 정지 → 완료 → 파일 찾기
adb shell "find /sdcard/ -maxdepth 2 -name '*.3gpp' -mmin -5"
adb pull <파일경로> /tmp/recording.3gpp
# 3gpp → wav 변환 (STT 입력용)
ffmpeg -i /tmp/recording.3gpp -ar 16000 -ac 1 /tmp/recording.wav
```

### 녹취록 작성 워크플로우

```
[1] 녹음 시작 (broadcast 또는 UI 제어)
[2] 사용자가 중지 요청하면 녹음 중지
[3] 파일을 로컬로 pull
[4] ffmpeg로 WAV 변환 (필요 시)
[5] Whisper API 또는 로컬 STT로 텍스트 변환
[6] 녹취록 마크다운 생성 → ~/papyrus/records/에 저장
```

### STT (Speech-to-Text) 방법

```bash
# 방법 1: OpenAI Whisper API (권장 — 한국어 정확도 높음)
OPENAI_KEY=$(~/.anima/scripts/secret.sh get openai.api_key)
curl -s https://api.openai.com/v1/audio/transcriptions \
  -H "Authorization: Bearer $OPENAI_KEY" \
  -F model="whisper-1" \
  -F language="ko" \
  -F file="@/tmp/recording.wav"

# 방법 2: 로컬 Whisper (오프라인, 느림)
# pip install openai-whisper
# whisper /tmp/recording.wav --model small --language ko
```

### 녹취록 마크다운 형식

```markdown
---
tags: [녹취록, 음성기록]
date: {yyyy-mm-dd}
---

# 녹취록 {yyyy-mm-dd HH:MM}

- **녹음 시간**: {시작} ~ {종료} ({총 분:초})
- **원본 파일**: {파일명}
- **용량 절감**: {VAD 절감률}%

## 내용

{STT 변환 텍스트}

## 참고자료 (References)

없음
```

### Anima Recorder 앱 설치

```bash
# 프로젝트 위치: ~/workspace/project_voice_recorder/
cd ~/workspace/project_voice_recorder
./build.sh                                    # APK 빌드
adb install -r build/anima-recorder.apk       # 설치
# 최초 1회: 앱 실행하여 권한 허용
adb shell am start -n com.anima.voicerecorder/.MainActivity
# 스크린샷 → "권한 허용" 버튼 탭 → 마이크/저장소 권한 승인
```

---

## 검증 기준

- [x] ADB 연결 확인 (`adb devices`에 디바이스 표시)
- [x] 디바이스 정보 동적 수집 (모델, 해상도, Android 버전)
- [x] 스크린샷 캡처 및 Vision 분석 성공
- [x] 화면 켜기 (WAKEUP) + 잠금 해제 (스와이프) 성공
- [x] 터치(tap)가 목표 위치에 정확히 수행됨
- [x] 스와이프가 정상 동작 (스크롤, 잠금해제)
- [x] 앱 실행 (intent + --activity-clear-task) 성공
- [x] 앱 전환 (최근 앱) 성공
- [x] 뒤로가기/홈 네비게이션 성공
- [x] 알림바 열기/닫기 성공
- [x] 텍스트 입력 (영문, `input text`) 성공
- [x] 한글 입력 (ADB Keyboard broadcast) 성공
- [x] 웹페이지 로딩 + 스크롤 성공
- [ ] 20회 루프 이내에 목표 달성 또는 사용자에게 보고
- [ ] 녹음 시작/중지 (Anima Recorder broadcast 또는 내장 앱 UI)
- [ ] 녹음 파일 로컬 pull 성공
- [ ] STT 변환 성공 (Whisper API)
- [ ] 녹취록 마크다운 ~/papyrus/records/ 저장

---

## 변경 이력

| 날짜 | 변경 내용 | 트리거 |
|------|----------|--------|
| 2026-03-12 | 초기 생성 | 사용자 요청 |
| 2026-03-12 | 10개 시나리오 테스트 후 전면 개선: 디바이스 동적 감지, 해상도 비례 좌표, 화면 타임아웃 연장, ADB Keyboard 한글 입력 검증, --activity-clear-task 추가, 웹 로딩 대기 시간 가이드 | 실전 테스트 |
| 2026-03-12 | 녹취록 기능 추가: Anima Recorder 앱(VAD) + STT + 녹취록 마크다운 저장 워크플로우 | 사용자 요청 |
