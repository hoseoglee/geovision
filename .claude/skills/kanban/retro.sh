#!/bin/bash
# retro.sh — 칸반 JSONL 로그 분석 → 회고 통계 출력
# Usage: retro.sh [기간] (기본: 7일)
# 출력: 마크다운 형식 통계 (AI가 이를 기반으로 회고 보고서 작성)

set -euo pipefail

DAYS="${1:-7}"
KANBAN_LOG_DIR="$HOME/papyrus/records/kanban"

if [[ ! -d "$KANBAN_LOG_DIR" ]]; then
  echo "칸반 로그 디렉토리 없음: $KANBAN_LOG_DIR"
  exit 0
fi

# 최근 N일 JSONL 파일 수집
LOGS=""
for i in $(seq 0 $((DAYS - 1))); do
  DATE=$(date -d "-${i} days" +%Y-%m-%d 2>/dev/null || date -v-${i}d +%Y-%m-%d 2>/dev/null)
  FILE="$KANBAN_LOG_DIR/${DATE}.jsonl"
  if [[ -f "$FILE" ]]; then
    LOGS="$LOGS $FILE"
  fi
done

if [[ -z "$LOGS" ]]; then
  echo "최근 ${DAYS}일간 칸반 로그 없음"
  exit 0
fi

echo "# 칸반 활동 통계 (최근 ${DAYS}일)"
echo ""

# 총 건수
TOTAL=$(cat $LOGS | wc -l)
echo "## 총 처리: ${TOTAL}건"
echo ""

# 역할별 건수
echo "## 역할별 처리"
cat $LOGS | python3 -c "
import sys, json
from collections import Counter, defaultdict
lines = [json.loads(l) for l in sys.stdin if l.strip()]
roles = Counter(e['role'] for e in lines)
for r, c in roles.most_common():
    print(f'- {r}: {c}건')
print()

# 역할별 평균 처리 시간
print('## 역할별 평균 처리 시간')
durations = defaultdict(list)
for e in lines:
    if e.get('durationMs', 0) > 0:
        durations[e['role']].append(e['durationMs'])
for r, ds in sorted(durations.items()):
    avg = sum(ds) / len(ds) / 1000
    print(f'- {r}: {avg:.1f}초 (평균)')
print()

# 프로젝트별 처리
print('## 프로젝트별 처리')
projects = Counter(e['project'] for e in lines)
for p, c in projects.most_common():
    print(f'- {p}: {c}건')
print()

# 리뷰 성공률
reviews = [e for e in lines if e['role'] == '리뷰' and e.get('verdict')]
if reviews:
    passes = sum(1 for r in reviews if r['verdict'] == 'pass')
    print(f'## 리뷰 성공률: {passes}/{len(reviews)} ({100*passes//len(reviews)}%)')
else:
    print('## 리뷰 성공률: (데이터 없음)')
print()

# 에러 건수
errors = [e for e in lines if e.get('error')]
if errors:
    print(f'## 에러: {len(errors)}건')
    for e in errors[:5]:
        print(f'- [{e[\"role\"]}] {e[\"project\"]}: {e[\"error\"][:100]}')
else:
    print('## 에러: 0건')
print()

# 재작업 카드 (같은 traceId가 2회 이상)
trace_counts = Counter(e.get('traceId','') for e in lines if e.get('traceId'))
reworks = {t: c for t, c in trace_counts.items() if c >= 2}
if reworks:
    print(f'## 재작업 카드: {len(reworks)}건')
    for t, c in sorted(reworks.items(), key=lambda x: -x[1])[:10]:
        print(f'- {t}: {c}회 처리')
else:
    print('## 재작업 카드: 0건')
print()

# fail 사유 (outputSummary에서 추출)
fails = [e for e in lines if e['role'] == '리뷰' and e.get('verdict') == 'fail']
if fails:
    print(f'## 리뷰 반려 사유 ({len(fails)}건)')
    for f in fails[:10]:
        summary = f.get('outputSummary', '')[:150]
        print(f'- [{f[\"project\"]}] {summary}')
print()
" 2>/dev/null || echo "(python3 분석 실패)"
