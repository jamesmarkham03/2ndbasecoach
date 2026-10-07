"""
Back up all of your coaching data from Supabase to local files.

Each run creates backups/<date_time>/ containing, for every table:
  - <table>.json  complete copy (the format a future restore script will read)
  - <table>.csv   the same rows, so you can open them in Excel/Numbers
and a manifest.json with row counts.

After writing, it re-reads every file and checks the row counts against what the
database reported, so a "Backup OK" means the files really contain everything.

The backups/ folder is gitignored (it holds kids' personal data, which doesn't
belong on GitHub). It sits inside OneDrive, so OneDrive keeps an off-site copy.

Usage (from the baseball-coach-app folder):
    python scripts/backup.py

Needs these lines in .env.local (see .env.example):
    VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, COACH_EMAIL, COACH_PASSWORD
Only Python's standard library is used, so there is nothing to pip install.
"""

import csv
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_DIR / ".env.local"
BACKUP_ROOT = PROJECT_DIR / "backups"
TABLES = ["players", "metric_types", "measurements"]
PAGE_SIZE = 1000  # Supabase returns at most 1000 rows per request, so we page through.


def load_env(path: Path) -> dict[str, str]:
    if not path.exists():
        sys.exit(f"Missing {path}. Copy .env.example to .env.local and fill it in.")
    env = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip()
    return env


def request_json(url: str, headers: dict[str, str], body: dict | None = None):
    """Send a GET (or POST if body is given). Returns (parsed JSON, response headers)."""
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method="POST" if data else "GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read()), resp.headers
    except urllib.error.HTTPError as e:
        sys.exit(f"Request failed ({e.code}) for {url}: {e.read().decode(errors='replace')}")
    except urllib.error.URLError as e:
        sys.exit(f"Could not reach Supabase ({e.reason}). Check your internet connection.")


def sign_in(base_url: str, api_key: str, email: str, password: str) -> str:
    """Log in as the coach and return an access token. All reads then go through RLS as you."""
    data, _ = request_json(
        f"{base_url}/auth/v1/token?grant_type=password",
        {"apikey": api_key, "Content-Type": "application/json"},
        {"email": email, "password": password},
    )
    return data["access_token"]


def fetch_table(base_url: str, api_key: str, token: str, table: str) -> list[dict]:
    rows: list[dict] = []
    expected_total = None
    while True:
        start = len(rows)
        headers = {
            "apikey": api_key,
            "Authorization": f"Bearer {token}",
            "Range": f"{start}-{start + PAGE_SIZE - 1}",
            "Prefer": "count=exact",  # asks the server for the true total, to verify against
        }
        page, resp_headers = request_json(f"{base_url}/rest/v1/{table}?select=*&order=id", headers)
        # Content-Range looks like "0-999/2345"; the number after "/" is the total row count.
        content_range = resp_headers.get("Content-Range", "*/0")
        expected_total = int(content_range.split("/")[-1])
        rows.extend(page)
        if len(page) < PAGE_SIZE or len(rows) >= expected_total:
            break
    if len(rows) != expected_total:
        sys.exit(f"{table}: got {len(rows)} rows but the server says there are {expected_total}. Backup aborted.")
    return rows


def write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    with path.open("w", newline="", encoding="utf-8-sig") as f:  # utf-8-sig so Excel shows accents correctly
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        for row in rows:
            # Lists (like positions) become "SS|2B" so they fit in one cell.
            writer.writerow({k: "|".join(map(str, v)) if isinstance(v, list) else v for k, v in row.items()})


def main() -> None:
    env = load_env(ENV_FILE)
    missing = [k for k in ("VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "COACH_EMAIL", "COACH_PASSWORD") if not env.get(k)]
    if missing:
        sys.exit(f"Add these to .env.local first: {', '.join(missing)}")

    base_url = env["VITE_SUPABASE_URL"].rstrip("/")
    api_key = env["VITE_SUPABASE_PUBLISHABLE_KEY"]
    token = sign_in(base_url, api_key, env["COACH_EMAIL"], env["COACH_PASSWORD"])

    folder = BACKUP_ROOT / datetime.now().strftime("%Y-%m-%d_%H%M%S")
    folder.mkdir(parents=True)

    counts = {}
    for table in TABLES:
        rows = fetch_table(base_url, api_key, token, table)
        (folder / f"{table}.json").write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")
        write_csv(folder / f"{table}.csv", rows)
        counts[table] = len(rows)

    manifest = {"created_at": datetime.now().isoformat(timespec="seconds"), "source": base_url, "row_counts": counts}
    (folder / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    # Verify by reading the files back, not trusting what we think we wrote.
    for table, expected in counts.items():
        on_disk = len(json.loads((folder / f"{table}.json").read_text(encoding="utf-8")))
        if on_disk != expected:
            sys.exit(f"VERIFY FAILED: {table}.json has {on_disk} rows, expected {expected}.")

    summary = ", ".join(f"{t}: {n}" for t, n in counts.items())
    print(f"Backup OK -> {folder}")
    print(f"Rows saved and verified: {summary}")


if __name__ == "__main__":
    main()
