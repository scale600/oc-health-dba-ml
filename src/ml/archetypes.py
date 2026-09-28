"""ML-2: Provider profile segmentation via Gower distance + k-medoids (PAM)."""

from __future__ import annotations

import datetime

import numpy as np
import pandas as pd
from sklearn.metrics import silhouette_score

from ..etl import db

PROVIDER_TYPE_MAP = [
    ("2084", "Psychiatrist"),
    ("101Y", "Therapist-Counselor"),
    ("106H", "Therapist-Counselor"),
    ("1041", "Social-Worker"),
    ("163W", "Nursing"),
    ("163X", "Nursing"),
    ("164X", "Nursing"),
]

ASIAN_LANGS = {"vie", "tgl", "kor", "cmn", "yue", "jpn", "hin"}


def _provider_type(taxonomies: list[str]) -> str:
    for t in taxonomies:
        for prefix, group in PROVIDER_TYPE_MAP:
            if t.startswith(prefix):
                return group
    return "Other"


def _language_group(langs: list[str]) -> str:
    if not langs:
        return "English-only"
    if "spa" in langs:
        return "Spanish"
    if any(lang in ASIAN_LANGS for lang in langs):
        return "Asian-language"
    return "Other"


def _build_features() -> pd.DataFrame:
    conn = db.connect()
    providers = pd.read_sql_query("SELECT provider_id, gender_code FROM Dim_Provider", conn)
    n_sites = pd.read_sql_query(
        "SELECT p.provider_id, COUNT(*) AS n_sites "
        "FROM Fact_Provider_Site f JOIN Dim_Provider p ON f.provider_key = p.provider_key "
        "GROUP BY p.provider_id",
        conn,
    )
    n_langs = pd.read_sql_query(
        "SELECT provider_id, COUNT(*) AS n_languages FROM Bridge_Provider_Language GROUP BY provider_id", conn
    )
    n_specs = pd.read_sql_query(
        "SELECT provider_id, COUNT(*) AS n_specialties FROM Bridge_Provider_Specialty GROUP BY provider_id", conn
    )
    n_pops = pd.read_sql_query(
        "SELECT provider_id, COUNT(*) AS n_populations FROM Bridge_Provider_Population GROUP BY provider_id", conn
    )
    n_caps = pd.read_sql_query(
        "SELECT provider_id, COUNT(*) AS n_cultural_caps FROM Bridge_Provider_CulturalCap GROUP BY provider_id", conn
    )
    tax = pd.read_sql_query("SELECT provider_id, taxonomy_code FROM Bridge_Provider_Taxonomy", conn)
    fact = pd.read_sql_query(
        "SELECT f.provider_key, p.provider_id, f.accepting_new_patients_flag, f.telehealth_flag "
        "FROM Fact_Provider_Site f JOIN Dim_Provider p ON f.provider_key = p.provider_key",
        conn,
    )
    langs = pd.read_sql_query("SELECT provider_id, language_code FROM Bridge_Provider_Language", conn)
    conn.close()

    df = providers.copy()
    for col, name in [
        (n_sites, "n_sites"),
        (n_langs, "n_languages"),
        (n_specs, "n_specialties"),
        (n_pops, "n_populations"),
        (n_caps, "n_cultural_caps"),
    ]:
        df = df.merge(col, on="provider_id", how="left")
        df[name] = df[name].fillna(0).astype(int)

    df["gender_group"] = df["gender_code"].map(lambda g: g if g in ("F", "M") else "Other")

    accepts = (
        fact.groupby("provider_id")["accepting_new_patients_flag"]
        .apply(lambda s: "Y" if "Y" in s.values else "N")
        .rename("accepts_new")
    )
    tele = (
        fact.groupby("provider_id")["telehealth_flag"]
        .apply(lambda s: "B" if "B" in s.values else ("N" if "N" in s.values else "O"))
        .rename("telehealth")
    )
    df = df.merge(accepts, on="provider_id", how="left").merge(tele, on="provider_id", how="left")

    type_group = (
        tax.groupby("provider_id")["taxonomy_code"].apply(lambda s: _provider_type(list(s))).rename("provider_type")
    )
    lang_group = (
        langs.groupby("provider_id")["language_code"].apply(lambda s: _language_group(list(s))).rename("lang_group")
    )
    df = df.merge(type_group, on="provider_id", how="left").merge(lang_group, on="provider_id", how="left")
    return df


def _gower(df: pd.DataFrame, numeric_cols: list[str], categorical_cols: list[str]) -> np.ndarray:
    n = len(df)
    numeric = df[numeric_cols].astype(float).values
    ranges = numeric.max(axis=0) - numeric.min(axis=0)
    ranges[ranges == 0] = 1.0

    num_dist = np.zeros((n, n))
    for k in range(len(numeric_cols)):
        col = numeric[:, k]
        num_dist += np.abs(col[:, None] - col[None, :]) / ranges[k]

    cat_dist = np.zeros((n, n))
    for col in categorical_cols:
        vals = df[col].astype(str).to_numpy()
        cat_dist += (vals[:, None] != vals[None, :]).astype(float)

    p = len(numeric_cols) + len(categorical_cols)
    g = (num_dist + cat_dist) / p
    np.fill_diagonal(g, 0)
    return g


def _kmedoids(g: np.ndarray, k: int, max_iter: int = 100, random_state: int = 42) -> np.ndarray:
    """Partitioning Around Medoids (PAM, 'alternate' variant) on a distance matrix."""
    rng = np.random.default_rng(random_state)
    n = g.shape[0]
    medoids = rng.choice(n, size=k, replace=False).astype(int)
    for _ in range(max_iter):
        labels = np.argmin(g[:, medoids], axis=1)
        new_medoids = medoids.copy()
        for c in range(k):
            members = np.where(labels == c)[0]
            if len(members) == 0:
                continue
            sub = g[members][:, members]
            new_medoids[c] = members[int(np.argmin(sub.sum(axis=1)))]
        if np.array_equal(new_medoids, medoids):
            break
        medoids = new_medoids
    return np.argmin(g[:, medoids], axis=1)


def run() -> dict:
    df = _build_features()
    numeric_cols = ["n_sites", "n_languages", "n_specialties", "n_populations", "n_cultural_caps"]
    categorical_cols = ["gender_group", "accepts_new", "telehealth", "provider_type", "lang_group"]
    for col in categorical_cols:
        df[col] = df[col].fillna("unknown").astype(str)
    g = _gower(df, numeric_cols, categorical_cols)

    best_k, best_score, best_labels = None, -1.0, None
    for k in range(3, 7):
        labels = _kmedoids(g, k)
        score = float(silhouette_score(g, labels, metric="precomputed"))
        if score > best_score:
            best_k, best_score, best_labels = k, score, labels

    run_id = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    conn = db.connect()
    cur = conn.cursor()
    cur.execute("DELETE FROM ML_Provider_Archetype")
    cur.executemany(
        "INSERT INTO ML_Provider_Archetype (provider_id, archetype, run_id) VALUES (?, ?, ?)",
        [(int(pid), int(label), run_id) for pid, label in zip(df["provider_id"], best_labels)],
    )
    conn.close()

    return {
        "providers": len(df),
        "k": best_k,
        "silhouette": round(best_score, 3),
        "homogeneous": best_score < 0.2,
    }
