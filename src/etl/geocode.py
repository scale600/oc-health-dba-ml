"""Geocode site addresses via Nominatim (OpenStreetMap), with a SQLite cache."""

from __future__ import annotations

import json
import sqlite3
import time
import urllib.parse
import urllib.request

CACHE_DB = "geocode_cache.sqlite"
USER_AGENT = "oc-health-dba-ml-portfolio/1.0 (DBA/BI/ML portfolio project)"


def _cache() -> sqlite3.Connection:
    conn = sqlite3.connect(CACHE_DB)
    conn.execute("CREATE TABLE IF NOT EXISTS geocode (key TEXT PRIMARY KEY, lat REAL, lng REAL)")
    return conn


def _nominatim(query: str) -> tuple[float | None, float | None]:
    params = urllib.parse.urlencode({"q": query, "format": "json", "limit": 1})
    url = f"https://nominatim.openstreetmap.org/search?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.load(resp)
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
            return None, None
        except Exception:
            time.sleep(2)
    return None, None


def geocode(address: str, city: str, state: str, zip_code: str) -> tuple[float | None, float | None]:
    """Return (lat, lng); falls back to ZIP-only lookup on miss. Cached in SQLite."""
    key = f"{address}|{city}|{state}|{zip_code}".strip().lower()
    conn = _cache()
    row = conn.execute("SELECT lat, lng FROM geocode WHERE key = ?", (key,)).fetchone()
    if row:
        conn.close()
        return row[0], row[1]

    lat, lng = _nominatim(f"{address}, {city}, {state} {zip_code}")
    if lat is None:
        lat, lng = _nominatim(f"{zip_code}, {state}, USA")

    if lat is not None:
        conn.execute(
            "INSERT OR REPLACE INTO geocode (key, lat, lng) VALUES (?, ?, ?)", (key, lat, lng)
        )
        conn.commit()
    conn.close()
    time.sleep(1.1)  # Nominatim fair-use policy: <= 1 req/sec
    return lat, lng
