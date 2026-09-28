"""Collect the OC BHP Provider Directory into lossless raw JSON snapshots.

Usage:
    python -m src.collector.collect            # write to data/raw/<timestamp>/
    python -m src.collector.collect --upload   # also upload to Azure Blob

Invoked by .github/workflows/pipeline.yml (schedule + workflow_dispatch).
"""

from __future__ import annotations

import argparse
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

from .api_client import LOOKUP_ENDPOINTS, ApiClient, strip_provider_dto

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

RAW_ROOT = Path("data/raw")


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def upload_blob(local_dir: Path) -> int:
    """Upload collected JSON files to Azure Blob. Returns number of blobs uploaded."""
    from azure.identity import DefaultAzureCredential
    from azure.storage.blob import BlobServiceClient

    account = os.environ["AZURE_STORAGE_ACCOUNT"]
    container = os.environ.get("AZURE_STORAGE_CONTAINER", "raw-provider-json")

    credential = DefaultAzureCredential()
    blob_service = BlobServiceClient(
        account_url=f"https://{account}.blob.core.windows.net", credential=credential
    )
    container_client = blob_service.get_container_client(container)

    count = 0
    for path in local_dir.rglob("*.json"):
        blob_name = path.relative_to(RAW_ROOT).as_posix()
        with open(path, "rb") as f:
            container_client.upload_blob(blob_name, f, overwrite=True)
        count += 1
        log.info("uploaded blob: %s", blob_name)
    return count


def collect(base_url: str, out_dir: Path) -> dict[str, int]:
    client = ApiClient(base_url=base_url)

    # Providers (paginated; strip the nested providerDto duplicate)
    providers = list(client.paginate("Provider/providers"))
    strip_provider_dto(providers)
    write_json(out_dir / "providers.json", {"data": providers, "totalCount": len(providers)})

    # Sites (paginated)
    sites = list(client.paginate("Site/sites"))
    write_json(out_dir / "sites.json", {"data": sites, "totalCount": len(sites)})

    # Lookups (each returns a bare JSON array)
    lookups = {}
    for name in LOOKUP_ENDPOINTS:
        lookups[name] = client.fetch_lookup(name)
    write_json(out_dir / "lookups.json", lookups)

    return {"providers": len(providers), "sites": len(sites), "lookups": len(lookups)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--upload", action="store_true", help="upload to Azure Blob after collecting"
    )
    args = parser.parse_args()

    load_dotenv()
    base_url = os.getenv("OC_BHP_API_BASE", "https://bhpproviderdirectory.ochca.com/api/v1/")

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_dir = RAW_ROOT / timestamp

    counts = collect(base_url, out_dir)
    log.info("collected %s -> %s", counts, out_dir)

    if args.upload:
        n = upload_blob(out_dir)
        log.info("uploaded %d blobs", n)


if __name__ == "__main__":
    main()
