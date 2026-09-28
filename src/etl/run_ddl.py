"""Execute the DDL files against Azure SQL using Entra ID (Azure CLI) auth.

Usage:
    python src/etl/run_ddl.py
"""

from __future__ import annotations

import glob
import os
import struct
import time

import pyodbc
from azure.identity import AzureCliCredential

SERVER = os.getenv("AZURE_SQL_SERVER", "oc-health-dba-ml.database.windows.net")
DATABASE = os.getenv("AZURE_SQL_DB", "ocbh_provider")
DDL_DIR = "src/etl/ddl"


def _access_token_struct(token: str) -> bytes:
    token_bytes = bytes(token, "utf-8")
    packed = b"".join(bytes([b, 0]) for b in token_bytes)
    return struct.pack("=i", len(packed)) + packed


def connect() -> pyodbc.Connection:
    token = AzureCliCredential().get_token("https://database.windows.net/").token
    conn_str = (
        f"Driver={{ODBC Driver 18 for SQL Server}};"
        f"Server={SERVER};Database={DATABASE};"
        "Encrypt=yes;TrustServerCertificate=no;"
        "LoginTimeout=60;"
    )
    last_exc: Exception | None = None
    for attempt in range(1, 4):
        try:
            return pyodbc.connect(
                conn_str, attrs_before={1256: _access_token_struct(token)}, autocommit=True
            )
        except pyodbc.Error as exc:
            last_exc = exc
            print(f"connect attempt {attempt}/3 failed: {exc}")
            time.sleep(15)
    raise last_exc


def main() -> None:
    conn = connect()
    try:
        for path in sorted(glob.glob(f"{DDL_DIR}/*.sql")):
            with open(path, encoding="utf-8") as f:
                sql = f.read()
            conn.cursor().execute(sql)
            print(f"executed: {path}")
    finally:
        conn.close()
    print("DDL execution complete.")


if __name__ == "__main__":
    main()
