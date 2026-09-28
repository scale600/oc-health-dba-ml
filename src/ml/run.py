"""Run the three ML analyses: spatial hubs, provider archetypes, accessibility gaps."""

from __future__ import annotations

from . import accessibility_gap, archetypes, spatial_hubs


def main() -> None:
    print("ML-1 spatial hubs:", spatial_hubs.run())
    print("ML-2 archetypes:", archetypes.run())
    print("ML-3 accessibility gaps:", accessibility_gap.run())


if __name__ == "__main__":
    main()
