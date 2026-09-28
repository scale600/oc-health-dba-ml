"""Generic paginated client for the OC BHP Provider Directory API.

Reference: docs/api_reference.md (verified live). The API is public and
requires no authentication key.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Iterator

import requests

log = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://bhpproviderdirectory.ochca.com/api/v1/"

# Reference code lists (the FK universe). Each returns a bare JSON array.
LOOKUP_ENDPOINTS = (
    "specialties",
    "service-codes",
    "gender-codes",
    "language-codes",
    "taxonomy",
    "facility-types",
    "schedule-codes",
    "population-served-codes",
    "licensure-codes",
    "state-codes",
    "cultural-cap-codes",
    "telehealths",
)


class ApiClient:
    """Pages through the OC BHP API with retry/backoff. No auth required."""

    def __init__(
        self,
        base_url: str = DEFAULT_BASE_URL,
        page_size: int = 100,
        timeout: int = 30,
        retries: int = 3,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.page_size = page_size
        self.timeout = timeout
        self.retries = retries
        self.session = requests.Session()

    def _get(self, url: str) -> Any:
        for attempt in range(1, self.retries + 1):
            try:
                resp = self.session.get(url, timeout=self.timeout)
                resp.raise_for_status()
                return resp.json()
            except requests.RequestException as exc:
                if attempt == self.retries:
                    raise
                log.warning("GET %s failed (attempt %d/%d): %s", url, attempt, self.retries, exc)
                time.sleep(2 ** attempt)
        raise RuntimeError("unreachable")  # pragma: no cover

    def paginate(self, path: str) -> Iterator[dict]:
        """Yield every record from a paginated collection endpoint.

        Walks ``page``/``pageSize`` until ``currentPage >= totalPages``.
        Never hardcodes the total count — it drifts monthly
        (see docs/api_reference.md).
        """
        page = 1
        while True:
            url = f"{self.base_url}/{path}?page={page}&pageSize={self.page_size}"
            envelope = self._get(url)
            data = envelope.get("data", [])
            total_pages = int(envelope.get("totalPages", 0) or 0)
            yield from data
            if page >= total_pages:
                break
            page += 1

    def fetch_lookup(self, name: str) -> list[dict]:
        """Fetch a single lookup code list (returns a bare JSON array)."""
        return self._get(f"{self.base_url}/Lookup/{name}")


def strip_provider_dto(providers: list[dict]) -> list[dict]:
    """Remove the duplicated ``providerDto`` nested inside each ``providerSites[]``.

    The API embeds a full copy of the parent provider under
    ``providerSites[].providerDto``. Stripping it keeps raw snapshots from
    bloating and prevents the ELT from double-processing provider fields.
    """
    for provider in providers:
        for site_link in provider.get("providerSites") or []:
            site_link.pop("providerDto", None)
    return providers
