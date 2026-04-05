#!/bin/bash
# feedback.sh — 칸반 결과를 Anima에 피드백
# Usage: feedback.sh <역할> <verdict> <프로젝트명> <카드ID> <note> [lesson_category] [lesson_title]
# verdict: pass, fail, done (개발 완료)
# lesson_category: technical, process, approach 등 (리뷰 fail 시)
# lesson_title: 교훈 제목 (리뷰 fail 시)

set -euo pipefail

ROLE="${1:-}"
VERDICT="${2:-}"
PROJECT="${3:-}"
CARD_ID="${4:-}"
NOTE="${5:-}"
LESSON_CATEGORY="${6:-}"
LESSON_TITLE="${7:-}"

if [[ -z "$ROLE" || -z "$VERDICT" || -z "$PROJECT" ]]; then
  echo "Usage: $0 <역할> <verdict> <프로젝트명> <카드ID> <note> [lesson_category] [lesson_title]" >&2
  exit 1
fi

ANIMA_HOME="$HOME/.anima"
MEMORY="$ANIMA_HOME/soul/memory"
PAPYRUS="$HOME/papyrus"
TODAY=$(date +%Y-%m-%d)
DISPLAY_NAME="${PROJECT#project_}"

LESSONS_FILE="$MEMORY/lessons.md"
PATTERNS_FILE="$MEMORY/developer_patterns.md"
KNOWLEDGE_FILE="$PAPYRUS/projects/${PROJECT}/_knowledge.md"
ARCH_FILE="$PAPYRUS/projects/${PROJECT}/아키텍처.md"

# ─── 리뷰 fail → lessons.md에 교훈 기록 ───
if [[ "$ROLE" == "리뷰" && "$VERDICT" == "fail" ]]; then
  # 교훈 카테고리와 제목이 있으면 기록
  CATEGORY="${LESSON_CATEGORY:-technical}"
  TITLE="${LESSON_TITLE:-칸반 리뷰 반려}"

  # lessons.md에 추가
  if [[ -f "$LESSONS_FILE" ]]; then
    cat >> "$LESSONS_FILE" << LESSON_EOF

## ${CATEGORY} | ${TITLE}

- **날짜**: ${TODAY}
- **상황**: 칸반 리뷰에서 프로젝트 "${DISPLAY_NAME}" 카드 반려
- **잘못한 점**: ${NOTE}
- **교훈**: 다음 개발 시 이 패턴을 사전 체크해야 함
- **심각도**: medium
- **출처**: kanban-review
LESSON_EOF
    echo "[feedback] lessons.md에 교훈 기록: ${CATEGORY} | ${TITLE}"
  fi

  # 같은 카드가 2회 이상 fail인지 확인 → developer_patterns.md에 함정 추가
  if [[ -f "$LESSONS_FILE" ]]; then
    FAIL_COUNT=$(grep -c "카드.*${CARD_ID}.*반려\|칸반 리뷰.*반려" "$LESSONS_FILE" 2>/dev/null || echo "0")
    if [[ "$FAIL_COUNT" -ge 2 ]]; then
      if [[ -f "$PATTERNS_FILE" ]]; then
        # "반복 실수/함정" 섹션에 추가
        if grep -q "반복 실수" "$PATTERNS_FILE" 2>/dev/null; then
          cat >> "$PATTERNS_FILE" << PATTERN_EOF

- **[칸반 반복 반려]** ${TITLE}: ${NOTE} (${TODAY}, 프로젝트: ${DISPLAY_NAME})
PATTERN_EOF
          echo "[feedback] developer_patterns.md에 함정 추가: ${TITLE}"
        fi
      fi
    fi
  fi
fi

# ─── 리뷰 pass → _knowledge.md에 설계 결정 기록 ───
if [[ "$ROLE" == "리뷰" && "$VERDICT" == "pass" ]]; then
  if [[ -f "$KNOWLEDGE_FILE" ]]; then
    # "검증 완료 결정사항" 섹션 확인/추가
    if ! grep -q "## 검증 완료 결정사항" "$KNOWLEDGE_FILE" 2>/dev/null; then
      echo -e "\n## 검증 완료 결정사항" >> "$KNOWLEDGE_FILE"
    fi
    echo "- [${TODAY}] ${NOTE}" >> "$KNOWLEDGE_FILE"
    echo "[feedback] _knowledge.md에 검증 완료 기록"
  fi
fi

# ─── 개발 완료 → _knowledge.md에 구현 지식 기록 ───
if [[ "$ROLE" == "개발" && "$VERDICT" == "done" ]]; then
  # 개발 결과에서 lessons_learned가 있으면 기록
  LESSONS_LEARNED="${LESSONS_LEARNED:-}"
  if [[ -n "$LESSONS_LEARNED" ]]; then
    if [[ -f "$PATTERNS_FILE" ]]; then
      if ! grep -q "## 칸반 개발 패턴" "$PATTERNS_FILE" 2>/dev/null; then
        echo -e "\n## 칸반 개발 패턴" >> "$PATTERNS_FILE"
      fi
      echo "- [${TODAY}] ${DISPLAY_NAME}: ${LESSONS_LEARNED}" >> "$PATTERNS_FILE"
      echo "[feedback] developer_patterns.md에 개발 패턴 기록"
    fi
  fi
fi

# ─── 기획 → 아키텍처.md 요구사항 섹션에 추가 ───
if [[ "$ROLE" == "기획" && "$VERDICT" == "done" ]]; then
  if [[ -f "$ARCH_FILE" ]]; then
    # 요구사항 섹션이 있으면 추가
    if grep -q "## 요구사항" "$ARCH_FILE" 2>/dev/null; then
      # NOTE에는 생성된 카드 제목들이 줄바꿈으로 전달됨
      while IFS= read -r card_title; do
        if [[ -n "$card_title" ]]; then
          echo "- [${TODAY}] ${card_title} (칸반 기획)" >> "$ARCH_FILE"
        fi
      done <<< "$NOTE"
      echo "[feedback] 아키텍처.md 요구사항에 기획 카드 추가"
    fi
  fi
fi

echo "[feedback] 완료: ${ROLE} / ${VERDICT} / ${DISPLAY_NAME}"
