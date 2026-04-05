#!/bin/bash
# context.sh — 칸반 역할별 Anima 컨텍스트를 조합하여 stdout으로 출력
# Usage: context.sh <역할> <프로젝트명> [카드ID] [카드제목] [카드설명]
# 역할: 기획, 개발, 리뷰, 아이디어

set -euo pipefail

ROLE="${1:-}"
PROJECT="${2:-}"
CARD_ID="${3:-}"
CARD_TITLE="${4:-}"
CARD_DESC="${5:-}"

if [[ -z "$ROLE" || -z "$PROJECT" ]]; then
  echo "Usage: $0 <역할> <프로젝트명> [카드ID] [카드제목] [카드설명]" >&2
  exit 1
fi

ANIMA_HOME="$HOME/.anima"
SOUL="$ANIMA_HOME/soul"
MEMORY="$SOUL/memory"
SKILLS="$SOUL/skills/kanban"
PAPYRUS="$HOME/papyrus"
WORKSPACE="$HOME/workspace"

DISPLAY_NAME="${PROJECT#project_}"

# ─── 역할 프롬프트 로드 (독립 스킬 우선 → 칸반 프롬프트 폴백) ───
# 역할 → 스킬 매핑: 기획→기획자, 개발→developer, 리뷰→검증자, 아이디어→kanban/prompts
declare -A ROLE_SKILL_MAP=(
  ["기획"]="기획자"
  ["개발"]="developer"
  ["리뷰"]="검증자"
)
SKILL_NAME="${ROLE_SKILL_MAP[$ROLE]:-}"
SKILL_FILE="$SOUL/skills/${SKILL_NAME}/SKILL.md"
PROMPT_FILE="$SKILLS/prompts/${ROLE}.md"

if [[ -n "$SKILL_NAME" && -f "$SKILL_FILE" ]]; then
  # 독립 스킬에서 로드 (frontmatter 제거, CRLF 대응)
  sed 's/\r$//' "$SKILL_FILE" | sed -n '/^---$/,/^---$/!p'
  echo ""
  echo "> **모드**: 칸반 파이프라인 — 반드시 칸반 출력 형식(JSON)으로 응답해라"
elif [[ -f "$PROMPT_FILE" ]]; then
  cat "$PROMPT_FILE"
else
  echo "## ${ROLE} 역할"
  echo "역할 프롬프트 파일을 찾을 수 없습니다" >&2
fi

echo ""
echo "---"
echo ""

# ─── 프로젝트 컨텍스트 ───
echo "# 프로젝트: ${DISPLAY_NAME}"
echo ""

# 아키텍처 (역할별 필요 섹션만 추출)
ARCH_FILE="$PAPYRUS/projects/${PROJECT}/아키텍처.md"
if [[ -f "$ARCH_FILE" ]]; then
  echo "## 아키텍처"
  case "$ROLE" in
    "기획")
      # 개요 + 기술스택 + 요구사항 (기존 요구사항 중복 방지)
      sed -n '/^## 개요/,/^## [^개]/p' "$ARCH_FILE" | head -n 20 || true
      sed -n '/^## 기술 스택/,/^## [^기술]/p' "$ARCH_FILE" | head -n 15 || true
      sed -n '/^## 요구사항/,/^## [^요]/p' "$ARCH_FILE" | head -n 40 || true
      ;;
    "개발")
      # 개요 + 기술스택 + 디렉토리 구조 + 핵심 모듈
      sed -n '/^## 개요/,/^## [^개]/p' "$ARCH_FILE" | head -n 20 || true
      sed -n '/^## 기술 스택/,/^## [^기술]/p' "$ARCH_FILE" | head -n 15 || true
      sed -n '/^## 디렉토리 구조/,/^## [^디]/p' "$ARCH_FILE" | head -n 30 || true
      sed -n '/^## 핵심 모듈/,/^## [^핵]/p' "$ARCH_FILE" | head -n 30 || true
      ;;
    "리뷰")
      # 개요 + 기술스택 + 핵심 모듈 (코드 리뷰 관점)
      sed -n '/^## 개요/,/^## [^개]/p' "$ARCH_FILE" | head -n 20 || true
      sed -n '/^## 기술 스택/,/^## [^기술]/p' "$ARCH_FILE" | head -n 15 || true
      sed -n '/^## 핵심 모듈/,/^## [^핵]/p' "$ARCH_FILE" | head -n 30 || true
      ;;
    "아이디어")
      # 개요 + 기술스택 (넓은 시야용)
      sed -n '/^## 개요/,/^## [^개]/p' "$ARCH_FILE" | head -n 20 || true
      sed -n '/^## 기술 스택/,/^## [^기술]/p' "$ARCH_FILE" | head -n 15 || true
      ;;
  esac
  echo ""
fi

# 스펙 문서 — 모든 역할에서 프로젝트 취지 파악용
SPEC_FILE="$PAPYRUS/projects/${PROJECT}/스펙.md"
if [[ -f "$SPEC_FILE" ]]; then
  echo "## 프로젝트 스펙 (취지·목표·핵심 기능)"
  cat "$SPEC_FILE"
  echo ""
fi

# 프로젝트 지식
KNOWLEDGE_FILE="$PAPYRUS/projects/${PROJECT}/_knowledge.md"
if [[ -f "$KNOWLEDGE_FILE" ]]; then
  echo "## 프로젝트 지식"
  head -n 80 "$KNOWLEDGE_FILE"
  echo ""
fi

# ─── Anima 컨텍스트 (역할별 선택적 로드) ───

# 역할별 교훈 카테고리 매핑
declare -A ROLE_LESSON_CATS=(
  ["기획"]="process understanding effective"
  ["개발"]="technical approach effective"
  ["리뷰"]="technical process approach effective"
  ["아이디어"]="effective"
)
# 역할별 Pre-Check Guards 매핑
declare -A ROLE_PRECHECKS=(
  ["기획"]="pre-check | skill pre-check | completion"
  ["개발"]="pre-check | code pre-check | docker"
  ["리뷰"]="pre-check | completion pre-check | code"
  ["아이디어"]=""
)
# 역할별 교훈 최대 문자수 (프롬프트 전체의 ~15% 이내 — 역할 프롬프트+프로젝트 컨텍스트 기준)
declare -A ROLE_LESSON_BUDGET=(
  ["기획"]="5000"
  ["개발"]="6000"
  ["리뷰"]="5000"
  ["아이디어"]="2000"
)

LESSON_CATS="${ROLE_LESSON_CATS[$ROLE]:-}"
PRECHECK_SECTIONS="${ROLE_PRECHECKS[$ROLE]:-}"
LESSON_BUDGET="${ROLE_LESSON_BUDGET[$ROLE]:-8000}"

# 교훈 — 구조화된 섹션 추출 (## category | title 단위)
LESSONS_FILE="$MEMORY/lessons.md"
META_FILE="${CONTEXT_META_FILE:-}"
GUARDS=""

if [[ -f "$LESSONS_FILE" && -n "$LESSON_CATS" ]]; then
  echo "## 과거 교훈 (실수 방지)"
  echo "> 아래 교훈을 숙지하고, 같은 실수를 반복하지 않도록 주의해라."
  echo ""

  # awk로 ## 섹션 단위 추출, 역할에 맞는 카테고리만 필터링, 예산 내 제한
  awk -v cats="$LESSON_CATS" -v budget="$LESSON_BUDGET" -v meta_file="$META_FILE" '
    BEGIN {
      n = split(cats, arr, " ")
      for (i = 1; i <= n; i++) cat_map[arr[i]] = 1
      total_chars = 0; count = 0; in_section = 0; section = ""; cur_cat = ""
      # 카테고리별 카운트
    }
    /^## [a-z]+ \| / {
      # 이전 섹션 flush
      if (in_section && section != "" && total_chars + length(section) <= budget) {
        printf "%s", section
        total_chars += length(section)
        count++
        cat_count[cur_cat]++
      }
      section = ""; in_section = 0
      # 카테고리 추출: "## category | title"
      line = $0; sub(/^## /, "", line)
      idx = index(line, " | ")
      if (idx > 0) {
        cur_cat = substr(line, 1, idx - 1)
      } else {
        cur_cat = ""
      }
      if (cur_cat in cat_map) {
        in_section = 1
        section = "### " line "\n"
      }
      next
    }
    /^# / {
      # H1 헤더 → 카테고리 경계, flush
      if (in_section && section != "" && total_chars + length(section) <= budget) {
        printf "%s", section
        total_chars += length(section)
        count++
        cat_count[cur_cat]++
      }
      section = ""; in_section = 0
      next
    }
    /^## pre-check/ {
      # Pre-Check 섹션은 별도 처리 — 여기서는 건너뜀
      if (in_section && section != "" && total_chars + length(section) <= budget) {
        printf "%s", section
        total_chars += length(section)
        count++
        cat_count[cur_cat]++
      }
      section = ""; in_section = 0
      next
    }
    {
      if (in_section) {
        section = section $0 "\n"
      }
    }
    END {
      # 마지막 섹션 flush
      if (in_section && section != "" && total_chars + length(section) <= budget) {
        printf "%s", section
        total_chars += length(section)
        count++
        cat_count[cur_cat]++
      }
      # 메타데이터 JSON 생성
      if (meta_file != "") {
        cat_json = ""
        for (c in cat_count) {
          if (cat_json != "") cat_json = cat_json ","
          cat_json = cat_json "\"" c "\":" cat_count[c]
        }
        printf "{\"lesson_count\":%d,\"lesson_chars\":%d,\"categories\":{%s}}", count, total_chars, cat_json > meta_file
      }
    }
  ' "$LESSONS_FILE"

  echo ""
fi

# Pre-Check Guards — 역할 관련 항목만 주입
if [[ -f "$LESSONS_FILE" && -n "$PRECHECK_SECTIONS" ]]; then
  GUARDS=$(awk -v sections="$PRECHECK_SECTIONS" '
    BEGIN {
      n = split(sections, arr, " ")
      # "pre-check" 와 "|" 와 카테고리를 합쳐서 매칭
      # sections 형식: "pre-check | skill pre-check | completion" (공백 구분)
      # 3단어씩 하나의 섹션: arr[1]="pre-check", arr[2]="|", arr[3]="skill", ...
      sec_count = 0
      for (i = 1; i <= n; i += 3) {
        if (i+2 <= n) {
          sec_count++
          sec_map[arr[i] " " arr[i+1] " " arr[i+2]] = 1
        }
      }
      in_section = 0; output = ""
    }
    /^## pre-check \| / {
      header = $0; sub(/^## /, "", header)
      # 설명 부분 제거하여 키만 추출: "pre-check | code — 설명" → "pre-check | code"
      key = header; gsub(/ —.*$/, "", key); gsub(/\s+$/, "", key)
      if (key in sec_map) {
        in_section = 1
        output = output "### " header "\n"
      } else {
        in_section = 0
      }
      next
    }
    /^## / || /^# / {
      in_section = 0
      next
    }
    {
      if (in_section) output = output $0 "\n"
    }
    END { printf "%s", output }
  ' "$LESSONS_FILE")

  if [[ -n "$GUARDS" ]]; then
    echo "## Pre-Check Guards (작업 전 점검)"
    echo "$GUARDS"
    echo ""
  fi
fi

# 메타데이터 파일 보강 (Pre-Check, knowledge 정보 추가)
if [[ -n "$META_FILE" && -f "$META_FILE" ]]; then
  # 기존 JSON에 추가 필드 병합
  EXISTING=$(cat "$META_FILE")
  HAS_PRECHECKS="false"
  [[ -n "$GUARDS" ]] && HAS_PRECHECKS="true"
  HAS_KNOWLEDGE="false"
  [[ -f "${KNOWLEDGE_FILE:-}" ]] && HAS_KNOWLEDGE="true"
  # 닫는 } 앞에 추가 필드 삽입
  echo "$EXISTING" | sed "s/}$/,\"role\":\"${ROLE}\",\"has_prechecks\":${HAS_PRECHECKS},\"has_knowledge\":${HAS_KNOWLEDGE}}/" > "$META_FILE"
elif [[ -n "$META_FILE" ]]; then
  # 교훈이 없는 경우 (0건) 기본 메타데이터 작성
  HAS_KNOWLEDGE="false"
  [[ -f "${KNOWLEDGE_FILE:-}" ]] && HAS_KNOWLEDGE="true"
  echo "{\"lesson_count\":0,\"lesson_chars\":0,\"categories\":{},\"role\":\"${ROLE}\",\"has_prechecks\":false,\"has_knowledge\":${HAS_KNOWLEDGE}}" > "$META_FILE"
fi

# 개발 패턴 — 기획/개발/리뷰에서 사용
if [[ "$ROLE" != "아이디어" ]]; then
  PATTERNS_FILE="$MEMORY/developer_patterns.md"
  if [[ -f "$PATTERNS_FILE" ]]; then
    echo "## 개발 패턴 (함정 & 효과적 전략)"
    head -n 60 "$PATTERNS_FILE"
    echo ""
  fi
fi

# 사용자 선호 — 개발/리뷰에서 사용
if [[ "$ROLE" == "개발" || "$ROLE" == "리뷰" ]]; then
  PREFS_FILE="$MEMORY/preferences.md"
  if [[ -f "$PREFS_FILE" ]]; then
    echo "## 사용자 선호 (코딩 컨벤션)"
    cat "$PREFS_FILE"
    echo ""
  fi
fi

# 최근 보고서 — 기획/아이디어에서 사용
if [[ "$ROLE" == "기획" || "$ROLE" == "아이디어" ]]; then
  echo "## 최근 작업 보고서"
  RECORDS_DIR="$PAPYRUS/records"
  if [[ -d "$RECORDS_DIR" ]]; then
    # 최근 3개 보고서의 제목과 작업 결과 섹션만 추출
    for f in $(ls -t "$RECORDS_DIR"/*.md 2>/dev/null | head -n 3); do
      echo "### $(basename "$f" .md)"
      # frontmatter의 project 필드 + 작업 결과 섹션만 추출
      sed -n '/^## 작업 결과/,/^## /p' "$f" | head -n 15 || true
      echo ""
    done
  fi
fi

# ─── 카드 정보 (개발/리뷰에서 사용) ───
if [[ -n "$CARD_TITLE" ]]; then
  echo "## 작업 대상 카드"
  echo "제목: ${CARD_TITLE}"
  echo "설명:"
  echo "${CARD_DESC:-설명 없음}"
  echo ""
fi

# ─── 카드 댓글 (개발에서 특히 중요 — 리뷰 반려 의견) ───
# 댓글은 server.js에서 Trello API로 조회하여 환경변수로 전달
CARD_COMMENTS="${CARD_COMMENTS:-}"
if [[ -n "$CARD_COMMENTS" ]]; then
  echo "## 이전 댓글 (검증 의견 포함)"
  echo "$CARD_COMMENTS"
  echo ""
  if [[ "$ROLE" == "개발" ]]; then
    echo "> **중요**: 위 댓글에 리뷰 반려 의견이 있다면, 해당 문제를 최우선으로 해결해라."
    echo ""
  fi
fi

# ─── git log & diff (리뷰에서 사용) ───
if [[ "$ROLE" == "리뷰" ]]; then
  WS_DIR="$WORKSPACE/$PROJECT"
  if [[ -d "$WS_DIR/.git" ]]; then
    echo "## 최근 커밋"
    git -C "$WS_DIR" log --oneline -10 2>/dev/null || echo "git log 없음"
    echo ""
    echo "## 최근 변경 파일 (git diff HEAD~1)"
    git -C "$WS_DIR" diff HEAD~1 --name-only 2>/dev/null || echo "변경 파일 없음"
    echo ""
    echo "## 변경 통계 (git diff HEAD~1 --stat)"
    git -C "$WS_DIR" diff HEAD~1 --stat 2>/dev/null || echo "변경 통계 없음"
    echo ""
  fi
fi

# ─── 칸반 회고 인사이트 (모든 역할에서 참조) ───
INSIGHTS_FILE="$PAPYRUS/records/kanban/insights.md"
if [[ -f "$INSIGHTS_FILE" ]]; then
  echo "## 칸반 회고 인사이트"
  # frontmatter 제거 후 본문만 출력
  sed -n '/^---$/,/^---$/!p' "$INSIGHTS_FILE" | head -n 60 || true
  echo ""
fi

# ─── 출력 형식 재강조 (프롬프트 끝에 위치하여 확실히 따르도록) ───
echo ""
echo "---"
echo ""
echo "**IMPORTANT**: 반드시 위 출력 형식의 JSON으로만 응답해라. 마크다운 설명이나 질문 없이 JSON만 출력해라."
