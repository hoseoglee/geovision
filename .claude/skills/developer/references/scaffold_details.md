# Scaffold 상세 (Phase 2 참조)

## 폴더 구조 표준

Agent B가 프로젝트 구조를 생성할 때 반드시 따르는 5가지 원칙과 언어별 템플릿.

**5가지 원칙:**

1. **Root = Gateway** — 루트에는 진입점(README, 설정 파일, 매니페스트)만 둔다. 실행 코드, 테스트, 문서, 데이터는 전용 디렉토리로 분리
2. **관심사 분리** — 소스(src/), 테스트(tests/), 문서(docs/), 스크립트(scripts/), 에셋(assets/), 데이터(data/)를 명확히 분리
3. **산출물 비추적** — 빌드 산출물, 로그, 캐시는 .gitignore에 등록. logs/, dist/, build/, __pycache__/, node_modules/
4. **내부 아키텍처 보존** — src/ 내부 구조는 프로젝트 도메인에 맞게 자유롭게 구성 (core/, api/, models/, services/ 등)
5. **도구 설정 숨김** — .env, .vscode/, .idea/ 등 도구별 설정은 루트에 두되 .gitignore로 관리

**Python 프로젝트 템플릿:**
```
project_name/
├── README.md
├── pyproject.toml (또는 requirements.txt)
├── .gitignore
├── .env.example
├── src/
│   └── {패키지명}/
│       ├── __init__.py
│       ├── core/          # 핵심 로직, 설정
│       └── ...            # 도메인별 모듈
├── tests/
│   ├── conftest.py
│   └── test_*.py
├── scripts/               # 설치, 배포, 유틸리티 스크립트
├── docs/                  # 설계 문서, API 문서
├── data/                  # 샘플 데이터, fixtures (대용량은 .gitignore)
└── logs/                  # .gitignore 등록
```

**Node/TypeScript 프로젝트 템플릿:**
```
project_name/
├── README.md
├── package.json
├── tsconfig.json
├── .gitignore
├── .env.example
├── src/
│   ├── index.ts
│   └── ...
├── tests/
├── scripts/
├── docs/
├── public/                # 정적 파일 (웹)
└── dist/                  # .gitignore 등록
```

**기존 프로젝트 리팩터링 시:**
- 루트에 실행 코드가 3개 이상이면 src/로 이동 제안
- 테스트 파일이 소스와 섞여 있으면 tests/로 분리
- 문서/보고서가 루트에 있으면 docs/ 또는 reports/로 이동
- `__init__.py`와 임포트 경로를 함께 업데이트

## 로깅 규약 (log_healer 연동)

모든 프로젝트에 동일한 로깅 구조를 적용하여 **log_healer 스킬이 자동으로 에러를 감지·수정**할 수 있게 한다.

**로그 파일 경로 (고정 규약):**
```
logs/
├── app.log        # 전체 로그 (INFO 이상)
└── error.log      # 에러 전용 (ERROR, CRITICAL) — log_healer가 스캔하는 파일
```

**Python 보일러플레이트 — `src/{패키지}/core/logger.py`:**
```python
"""표준 로깅 설정 — JSON 구조화 로깅, app.log + error.log 이중 출력"""
import json
import logging
from pathlib import Path

LOG_DIR = Path(__file__).resolve().parents[3] / "logs"  # 프로젝트루트/logs/
LOG_DIR.mkdir(exist_ok=True)


class JsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "ts": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "file": f"{record.pathname}:{record.lineno}",
            **({"exc": self.formatException(record.exc_info)} if record.exc_info else {}),
        }, ensure_ascii=False)


def setup_logging(name: str = __name__, level: int = logging.INFO) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    logger.setLevel(level)

    fmt = JsonFormatter()

    # 콘솔
    ch = logging.StreamHandler()
    ch.setLevel(level)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    # app.log (INFO+)
    fh = logging.FileHandler(LOG_DIR / "app.log", encoding="utf-8")
    fh.setLevel(logging.INFO)
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    # error.log (ERROR+) — log_healer 스캔 대상
    eh = logging.FileHandler(LOG_DIR / "error.log", encoding="utf-8")
    eh.setLevel(logging.ERROR)
    eh.setFormatter(fmt)
    logger.addHandler(eh)

    return logger
```

**Node/TypeScript는 동일 규약을 따르되 구현은 `winston` 또는 `pino`로 대체한다.**

**Agent B 필수 작업:**
1. `logs/` 디렉토리 생성
2. `.gitignore`에 `logs/*.log` 추가
3. `src/{패키지}/core/logger.py` (또는 해당 언어 동등물) 생성
4. 기존 `print()` 디버깅 대신 `logger.info()`/`logger.error()` 사용을 constitution.md에 명시

**log_healer 자동 연동 조건:**
- `logs/error.log`가 존재하면 log_healer가 자동으로 스캔 가능
- JSON 형식이면 에러 파싱·핑거프린트·중복 억제가 정확하게 동작
- `tools/log_scanner/config.yaml`에 프로젝트를 등록하면 cron 자동 스캔 활성화
