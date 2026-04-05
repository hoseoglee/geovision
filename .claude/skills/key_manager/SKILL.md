---
name: key_manager
description: |
  Anima secrets에서 API 키를 찾아 프로젝트에 설정하는 스킬.
  트리거: "키 찾아줘", "API 키 설정해", "OpenAI 키 필요", ".env 설정해", "key manager"
  DO NOT TRIGGER: 키 생성/발급 요청, 외부 서비스 가입
---

# Key Manager Skill

프로젝트에 필요한 API 키를 Anima secrets에서 찾아 자동으로 설정한다.

## 실행 절차

### 1. 필요한 키 파악

- 프로젝트의 `env_example.txt`, `.env.example`, `.env.sample`, `env_example` 등을 읽어 필요한 키 목록을 파악한다.
- 또는 사용자가 직접 요청한 키 이름을 사용한다.

### 2. Anima secrets에서 키 검색

```bash
# 키 목록 확인 (마스킹된 상태)
bash ~/.anima/scripts/secret.sh list --password <pw>

# 특정 키 조회 (dot notation)
bash ~/.anima/scripts/secret.sh get openai.api_key --password <pw>
bash ~/.anima/scripts/secret.sh get github.token --password <pw>
```

- **비밀번호**: 사용자에게 Anima secrets 비밀번호를 물어본다.
- **IMPORTANT**: 비밀번호는 `--password` 인자로 전달한다. 대화에 비밀번호를 출력하지 않는다.
- **IMPORTANT**: 조회한 키 값을 대화에 절대 출력하지 않는다. 변수에 담아 바로 `.env` 파일에 쓴다.

### 3. 키 설정

키를 찾은 경우:
- 프로젝트의 `.env` 파일에 키를 설정한다.
- `.env`가 `.gitignore`에 포함되어 있는지 확인한다 (없으면 추가).

키를 못 찾은 경우:
- 사용자에게 "Anima secrets에 {키이름}이 등록되어 있지 않습니다"라고 알린다.
- 사용자가 키를 제공하면:
  1. `.env`에 설정
  2. `secrets.yaml`에 추가할지 물어본다
  3. 추가한다면 `secret.sh encrypt`로 재암호화

### 4. 결과 보고

- 설정된 키 목록 (마스킹: `sk-proj-****`)
- 누락된 키 목록
- `.env` 파일 경로

## secrets.yaml 구조 (참고)

```yaml
openai:
  api_key: "sk-..."
github:
  token: "ghp_..."
anthropic:
  api_key: "sk-ant-..."
```

## 키 이름 매핑 (env → secrets.yaml)

| .env 변수 | secrets.yaml 경로 |
|-----------|------------------|
| OPENAI_API_KEY | openai.api_key |
| ANTHROPIC_API_KEY | anthropic.api_key |
| GITHUB_TOKEN | github.token |
| GOOGLE_API_KEY | google.api_key |
| GEMINI_API_KEY | google.gemini_api_key |

매핑에 없는 키는 `{서비스명}.{키종류}` 형태로 추론한다.

## 검증 기준

- [ ] secrets.yaml.enc에서 복호화 성공
- [ ] 필요한 키를 secrets에서 찾아 .env에 설정
- [ ] 키 값이 대화/보고서에 노출되지 않음
- [ ] .env가 .gitignore에 포함됨
