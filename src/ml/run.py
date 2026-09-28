"""Run the three ML analyses and log metrics/params to MLflow."""

from __future__ import annotations

import mlflow

from . import accessibility_gap, archetypes, spatial_hubs

EXPERIMENT = "oc-bh-provider-ml"


def main() -> None:
    mlflow.set_experiment(EXPERIMENT)
    with mlflow.start_run() as run:
        mlflow.log_params(
            {
                "hdbscan_min_cluster_size": 3,
                "hdbscan_metric": "haversine",
                "kmedoids_k_range": "3-6",
                "accessibility_gap_km": 10.0,
            }
        )

        hubs = spatial_hubs.run()
        mlflow.log_metrics(
            {
                "hubs_sites": hubs["sites"],
                "hubs_clusters": hubs["clusters"],
                "hubs_noise": hubs["noise"],
                "hubs_dbcv": hubs["dbcv"],
            }
        )

        arch = archetypes.run()
        mlflow.log_metrics(
            {
                "archetypes_providers": arch["providers"],
                "archetypes_k": arch["k"],
                "archetypes_silhouette": arch["silhouette"],
            }
        )

        gaps = accessibility_gap.run()
        mlflow.log_metrics(
            {
                "gaps_zips": gaps["zips"],
                "gaps_gap_zips": gaps["gap_zips"],
            }
        )

        print("MLflow run id:", run.info.run_id)

    print("ML-1 spatial hubs:", hubs)
    print("ML-2 archetypes:", arch)
    print("ML-3 accessibility gaps:", gaps)


if __name__ == "__main__":
    main()
