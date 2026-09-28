"""Orchestrate the full ELT: lookups -> sites (geocode) -> providers -> validate."""

from __future__ import annotations

from . import db, load_lookups, load_providers, load_sites, validate


def main() -> None:
    raw_dir = db.latest_raw_dir()
    print(f"raw dir: {raw_dir}")
    print("lookups:", load_lookups.load(raw_dir))
    print("sites:", load_sites.load(raw_dir))
    print("providers:", load_providers.load(raw_dir))
    print("--- referential integrity ---")
    validate.validate()


if __name__ == "__main__":
    main()
