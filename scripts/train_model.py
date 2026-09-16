"""Train and evaluate an interpretable classifier on simulation-generated data.

This is deliberately separate from the browser controller. The labels are scenario
labels produced by parameterized numerical simulations; they are NOT field truth.
Run from the project root with:  .venv/bin/python scripts/train_model.py
"""
from __future__ import annotations

import csv
import json
import math
from pathlib import Path

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[1]
SEED = 42017
CLASSES = ["Normal", "Slow", "Poor penetration", "Root not reached", "Excess irrigation"]
SOILS = {
    "Sandy": dict(ks=92.0, suction=7.5, theta_s=.41, fc=.22, wp=.08, mobile=.54, response=.24),
    "Loamy": dict(ks=42.0, suction=11.0, theta_s=.46, fc=.31, wp=.13, mobile=.58, response=.17),
    "Clay": dict(ks=14.0, suction=19.0, theta_s=.52, fc=.41, wp=.22, mobile=.68, response=.09),
    "Compacted": dict(ks=6.5, suction=8.0, theta_s=.43, fc=.34, wp=.18, mobile=.78, response=.055),
}


def simulate(rng: np.random.Generator, label: str) -> dict[str, float | str]:
    """Generate one perturbed treatment with the same Green–Ampt interpretation."""
    if label == "Normal":
        soil_name = rng.choice(["Sandy", "Loamy", "Clay"], p=[.25, .6, .15]); rate = rng.uniform(68, 120); duration = rng.uniform(20, 40)
    elif label == "Slow":
        soil_name = rng.choice(["Loamy", "Clay", "Compacted"], p=[.15, .65, .2]); rate = rng.uniform(32, 82); duration = rng.uniform(25, 50)
    elif label == "Poor penetration":
        soil_name = rng.choice(["Loamy", "Clay", "Compacted"], p=[.1, .2, .7]); rate = rng.uniform(52, 120); duration = rng.uniform(16, 38)
    elif label == "Root not reached":
        soil_name = rng.choice(list(SOILS)); rate = rng.uniform(32, 92); duration = rng.uniform(5, 23)
    else:
        soil_name = rng.choice(["Sandy", "Loamy", "Clay"], p=[.65, .25, .1]); rate = rng.uniform(105, 178); duration = rng.uniform(29, 50)

    soil = SOILS[str(soil_name)]
    initial = float(np.clip(soil["fc"] - rng.uniform(.07, .14), soil["wp"] + .01, soil["fc"] - .02))
    temperature = rng.uniform(20, 38); humidity = rng.uniform(35, 82)
    total_minutes, dt = 60.0, 10.0
    cumulative = ponding = drainage = 0.0
    theta = np.array([initial, initial, initial], dtype=float)
    arrivals: list[float | None] = [None, None, None]
    depths = np.array([10.0, 20.0, 30.0])
    front = 0.0
    for second in np.arange(dt, total_minutes * 60 + dt, dt):
        pump = second <= duration * 60
        irrigation = rate * dt / 3600 if pump else 0.0
        available = irrigation + ponding
        deficit = max(.035, soil["theta_s"] - initial)
        capacity = soil["ks"] * (1 + soil["suction"] * 10 * deficit / max(cumulative, 1.2))
        infiltrated = min(available, capacity * dt / 3600)
        cumulative += infiltrated
        ponding = min(8.0, max(0.0, available - infiltrated))
        front = min(42.0, cumulative / (10 * deficit * soil["mobile"]))
        wet_target = min(soil["theta_s"] - .015, soil["fc"] + min(.1, rate / 1000))
        activation = 1 / (1 + np.exp(-(front - depths) / 1.35))
        target = initial + (wet_target - initial) * activation
        response = 1 - math.exp(-soil["response"] * dt / 60)
        atmospheric = (.17 + .2 * (1 - humidity / 100) * (1 + (temperature - 20) * .035)) * dt / 3600
        excess = np.maximum(0, theta - soil["fc"])
        drainage += float(excess.sum() * .2 * 10 * dt / 3600)
        theta += (target - theta) * response - excess * .2 * dt / 3600 - atmospheric / np.array([220, 220, 120])
        for i in range(3):
            threshold = .014 if i == 2 else .018
            if arrivals[i] is None and front >= depths[i] and theta[i] >= initial + threshold:
                arrivals[i] = float(second)

    delay12 = (arrivals[1] - arrivals[0]) / 60 if arrivals[0] and arrivals[1] else 60.0
    delay23 = (arrivals[2] - arrivals[1]) / 60 if arrivals[1] and arrivals[2] else 60.0
    velocity = 20 / ((arrivals[2] - arrivals[0]) / 60) if arrivals[0] and arrivals[2] else 0.0
    return {
        "s1_moisture": theta[0] * 100, "s2_moisture": theta[1] * 100, "s3_moisture": theta[2] * 100,
        "gradient_s1_s3": (theta[0] - theta[2]) * 100, "delay_s1_s2": delay12,
        "delay_s2_s3": delay23, "front_velocity": velocity, "front_depth": front,
        "cumulative_infiltration": cumulative, "drainage": drainage, "irrigation_duration": duration,
        "irrigation_rate": rate, "temperature": temperature, "humidity": humidity,
        "soil_ks": soil["ks"], "root_arrived": float(arrivals[2] is not None), "label": label,
    }


def main() -> None:
    rng = np.random.default_rng(SEED)
    rows = [simulate(rng, label) for label in CLASSES for _ in range(320)]
    rng.shuffle(rows)
    feature_names = [k for k in rows[0] if k != "label"]
    x = np.array([[float(row[k]) for k in feature_names] for row in rows])
    y = np.array([str(row["label"]) for row in rows])
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=.25, random_state=SEED, stratify=y)
    model = RandomForestClassifier(n_estimators=160, max_depth=8, min_samples_leaf=3, class_weight="balanced", random_state=SEED, n_jobs=-1)
    model.fit(x_train, y_train); predicted = model.predict(x_test)
    precision, recall, f1, support = precision_recall_fscore_support(y_test, predicted, labels=CLASSES, zero_division=0)
    metrics = {
        "notice": "Synthetic evaluation only — simulator scenario labels are not field ground truth.",
        "model": "Random Forest", "seed": SEED, "samples": len(rows), "test_samples": len(y_test),
        "accuracy": round(float(accuracy_score(y_test, predicted)), 4), "classes": CLASSES,
        "per_class": [{"class": c, "precision": round(float(precision[i]), 4), "recall": round(float(recall[i]), 4), "f1": round(float(f1[i]), 4), "support": int(support[i])} for i, c in enumerate(CLASSES)],
        "confusion_matrix": confusion_matrix(y_test, predicted, labels=CLASSES).tolist(),
        "feature_importance": sorted([{"feature": name, "importance": round(float(value), 4)} for name, value in zip(feature_names, model.feature_importances_)], key=lambda item: item["importance"], reverse=True)[:8],
    }
    (ROOT / "public").mkdir(exist_ok=True)
    (ROOT / "public" / "ml_metrics.json").write_text(json.dumps(metrics, indent=2) + "\n")
    with (ROOT / "public" / "synthetic_training_data.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0])); writer.writeheader(); writer.writerows(rows)
    print(json.dumps(metrics, indent=2))
    print(f"\nWrote {ROOT / 'public/ml_metrics.json'}")
    print(f"Wrote {ROOT / 'public/synthetic_training_data.csv'}")


if __name__ == "__main__":
    main()
