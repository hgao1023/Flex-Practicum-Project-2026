"""
Report scheduler for automated report generation.
"""
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional
from pathlib import Path

from backend.core.config import COMPANIES, BASE_DIR

REPORTS_DIR = BASE_DIR / "data" / "reports"
SCHEDULE_FILE = BASE_DIR / "data" / "report_schedule.json"
_schedules = {}
_generated_reports = []


def _ensure_dirs():
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def _load_schedules():
    global _schedules
    if SCHEDULE_FILE.exists():
        try:
            with open(SCHEDULE_FILE) as f:
                _schedules = json.load(f)
        except Exception:
            _schedules = {}


def _save_schedules():
    _ensure_dirs()
    SCHEDULE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SCHEDULE_FILE, "w") as f:
        json.dump(_schedules, f, indent=2, default=str)


def schedule_weekly_report(report_type="comprehensive", recipients=None):
    sid = str(uuid.uuid4())[:8]
    s = {"id": sid, "frequency": "weekly", "report_type": report_type, "recipients": recipients or [],
         "created_at": datetime.now().isoformat(),
         "next_run": (datetime.now() + timedelta(days=7 - datetime.now().weekday())).isoformat(), "status": "active"}
    _schedules[sid] = s
    _save_schedules()
    return s


def schedule_monthly_report(report_type="comprehensive", recipients=None):
    sid = str(uuid.uuid4())[:8]
    now = datetime.now()
    nr = now.replace(year=now.year + 1, month=1, day=1) if now.month == 12 else now.replace(month=now.month + 1, day=1)
    s = {"id": sid, "frequency": "monthly", "report_type": report_type, "recipients": recipients or [],
         "created_at": now.isoformat(), "next_run": nr.isoformat(), "status": "active"}
    _schedules[sid] = s
    _save_schedules()
    return s


def get_scheduled_reports():
    _load_schedules()
    return list(_schedules.values())


def cancel_scheduled_report(schedule_id):
    _load_schedules()
    if schedule_id in _schedules:
        _schedules[schedule_id]["status"] = "cancelled"
        _save_schedules()
        return True
    return False


def run_scheduled_report(report_type="comprehensive", options=None):
    r = {"id": str(uuid.uuid4())[:8], "report_type": report_type, "generated_at": datetime.now().isoformat(),
         "companies": list(COMPANIES.keys()), "status": "completed",
         "summary": f"Generated {report_type} report for {len(COMPANIES)} companies."}
    _generated_reports.append(r)
    return r


def get_generated_reports(limit=10):
    return _generated_reports[-limit:]
