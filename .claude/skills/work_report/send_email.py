#!/usr/bin/env python3
"""보고서를 이메일로 발송하는 스크립트.

Usage:
    python3 send_email.py <report_file> <to_email> [subject]

SMTP 설정은 anima secrets에서 읽음:
    smtp.host, smtp.port, smtp.user, smtp.password

secrets 조회 실패 시 환경변수 사용:
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
"""
import sys
import os
import subprocess
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from email.utils import encode_rfc2231
from pathlib import Path
import json


def get_secret(key: str) -> str:
    """anima secret.sh에서 값을 가져온다."""
    script = os.path.expanduser("~/.anima/scripts/secret.sh")
    try:
        result = subprocess.run(
            [script, "get", key],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return ""


def get_smtp_config() -> dict:
    """SMTP 설정을 가져온다. secrets 우선, 환경변수 fallback."""
    return {
        "host": get_secret("smtp.host") or os.environ.get("SMTP_HOST", ""),
        "port": int(get_secret("smtp.port") or os.environ.get("SMTP_PORT", "587")),
        "user": get_secret("smtp.user") or os.environ.get("SMTP_USER", ""),
        "password": get_secret("smtp.password") or os.environ.get("SMTP_PASSWORD", ""),
    }


def send_report(report_path: str, to_email: str, subject: str = "") -> dict:
    """보고서를 이메일로 발송한다."""
    report = Path(report_path)
    if not report.exists():
        return {"ok": False, "error": f"파일 없음: {report_path}"}

    config = get_smtp_config()
    if not config["host"] or not config["user"] or not config["password"]:
        return {"ok": False, "error": "SMTP 설정 없음 (smtp.host/user/password in secrets)"}

    content = report.read_text(encoding="utf-8")

    # 제목 자동 생성: 파일명에서 추출
    if not subject:
        name = report.stem  # 2026-03-11-11-49_작업명
        parts = name.split("_", 1)
        work_name = parts[1] if len(parts) > 1 else name
        subject = f"[작업보고서] {work_name}"

    msg = MIMEMultipart()
    msg["From"] = config["user"]
    msg["To"] = to_email
    msg["Subject"] = subject

    # 본문: 간단한 안내만 (내용은 첨부파일로)
    body = f"작업 보고서가 첨부되어 있습니다.\n\n파일명: {report.name}"
    msg.attach(MIMEText(body, "plain", "utf-8"))

    # 첨부: 원본 .md 파일
    attachment = MIMEBase("application", "octet-stream")
    attachment.set_payload(report.read_bytes())
    encoders.encode_base64(attachment)
    attachment.add_header(
        "Content-Disposition",
        "attachment",
        filename=("utf-8", "", report.name),
    )
    msg.attach(attachment)

    try:
        with smtplib.SMTP(config["host"], config["port"], timeout=30) as server:
            server.starttls()
            server.login(config["user"], config["password"])
            server.send_message(msg)
        return {"ok": True, "to": to_email, "subject": subject}
    except Exception as e:
        return {"ok": False, "error": str(e)}


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"ok": False, "error": "Usage: send_email.py <file> <to> [subject]"}))
        sys.exit(1)

    report_file = sys.argv[1]
    to_email = sys.argv[2]
    subject = sys.argv[3] if len(sys.argv) > 3 else ""

    result = send_report(report_file, to_email, subject)
    print(json.dumps(result, ensure_ascii=False))
    sys.exit(0 if result["ok"] else 1)
