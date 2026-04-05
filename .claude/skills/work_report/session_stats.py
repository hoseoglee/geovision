#!/usr/bin/env python3
"""현재 Claude Code 세션의 토큰 사용량과 소요시간을 추출한다.

Usage:
    python3 session_stats.py [session_id]

session_id를 생략하면 ~/.claude/history.jsonl에서 가장 최근 세션을 자동 감지한다.
출력: JSON 형식 (duration_min, input_tokens, output_tokens, cache_creation, cache_read, total_tokens)
"""
import json
import sys
import os
from datetime import datetime
from pathlib import Path

CLAUDE_HOME = Path(os.environ.get("CLAUDE_HOME", Path.home() / ".claude"))


def get_latest_session_id():
    history = CLAUDE_HOME / "history.jsonl"
    if not history.exists():
        return None
    last_line = None
    with open(history, encoding="utf-8") as f:
        for line in f:
            last_line = line
    if last_line:
        return json.loads(last_line.strip()).get("sessionId")
    return None


def find_session_file(session_id):
    projects_dir = CLAUDE_HOME / "projects"
    if not projects_dir.exists():
        return None
    for proj_dir in projects_dir.iterdir():
        candidate = proj_dir / f"{session_id}.jsonl"
        if candidate.exists():
            return candidate
    return None


def parse_ts(ts_str):
    return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))


def get_stats(session_id=None):
    if session_id is None:
        session_id = get_latest_session_id()
    if not session_id:
        return {"error": "세션 ID를 찾을 수 없음"}

    session_file = find_session_file(session_id)
    if not session_file:
        return {"error": f"세션 파일 없음: {session_id}"}

    total_input = 0
    total_output = 0
    total_cache_creation = 0
    total_cache_read = 0
    first_ts = None
    last_ts = None

    with open(session_file, encoding="utf-8") as f:
        for line in f:
            d = json.loads(line.strip())
            ts = d.get("timestamp")
            if ts and isinstance(ts, str):
                if first_ts is None:
                    first_ts = ts
                last_ts = ts
            if "message" in d and isinstance(d["message"], dict):
                u = d["message"].get("usage")
                if u:
                    total_input += u.get("input_tokens", 0)
                    total_output += u.get("output_tokens", 0)
                    total_cache_creation += u.get("cache_creation_input_tokens", 0)
                    total_cache_read += u.get("cache_read_input_tokens", 0)

    duration_min = 0
    if first_ts and last_ts:
        start = parse_ts(first_ts)
        end = parse_ts(last_ts)
        duration_min = round((end - start).total_seconds() / 60)

    return {
        "session_id": session_id,
        "duration_min": duration_min,
        "input_tokens": total_input,
        "output_tokens": total_output,
        "cache_creation": total_cache_creation,
        "cache_read": total_cache_read,
        "total_tokens": total_input + total_output,
    }


if __name__ == "__main__":
    sid = sys.argv[1] if len(sys.argv) > 1 else None
    result = get_stats(sid)
    print(json.dumps(result, ensure_ascii=False))
