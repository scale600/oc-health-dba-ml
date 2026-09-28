"""Shared Azure SQL connection helpers (Entra ID via Azure CLI)."""

from __future__ import annotations

import glob
import os
import struct
import time

import pyodbc
from azure.identity import AzureCliCredential

SERVER = os.getenv("AZURE_SQL_SERVER", "oc-health-dba-ml.database.windows.net")
DATABASE = os.getenv("AZURE_SQL_DB", "ocbh_provider")


def _token_struct(token: str) -> bytes:
    token_bytes = bytes(token, "utf-8")
    packed = b"".join(bytes([b, 0]) for b in token_bytes)
    return struct.pack("=i", len(packed)) + packed


def connect() -> pyodbc.Connection:
    """Connect with Entra ID (Azure CLI credential), retrying on serverless resume."""
    token = AzureCliCredential().get_token("https://database.windows.net/").token
    conn_str = (
        "Driver={ODBC Driver 18 for SQL Server};"
        f"Server={SERVER};Database={DATABASE};"
        "Encrypt=yes;LoginTimeout=60;"
    )
    last_exc: Exception | None = None
    for _ in range(3):
        try:
            return pyodbc.connect(
                conn_str, attrs_before={1256: _token_struct(token)}, autocommit=True
            )
        except pyodbc.Error as exc:
            last_exc = exc
            time.sleep(15)
    raise last_exc


def latest_raw_dir() -> str:
    dirs = sorted(glob.glob("data/raw/*"))
    if not dirs:
        raise FileNotFoundError("no raw data; run `python -m src.collector.collect` first")
    return dirs[-1]
