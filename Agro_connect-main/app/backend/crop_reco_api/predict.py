from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd

from train import ENCODER_PATH, FEATURE_COLUMNS, MODEL_PATH, SCALER_PATH

RICE = "rice"
COFFEE = "coffee"
MILLET = "millet"

ESTIMATED_YIELD_QUINTAL_PER_ACRE = 8.0
MARKET_PRICE_RS_PER_QUINTAL = 3200.0


class ArtifactBundle:
    def __init__(self, model, scaler, label_encoder):
        self.model = model
        self.scaler = scaler
        self.label_encoder = label_encoder


@lru_cache(maxsize=1)
def load_artifacts() -> ArtifactBundle:
    missing = [
        str(path)
        for path in [MODEL_PATH, SCALER_PATH, ENCODER_PATH]
        if not Path(path).exists()
    ]
    if missing:
        raise FileNotFoundError(
            "Missing model artifacts. Run training first with `python train.py`. Missing: "
            + ", ".join(missing)
        )

    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    label_encoder = joblib.load(ENCODER_PATH)
    return ArtifactBundle(model=model, scaler=scaler, label_encoder=label_encoder)


def _normalize_probabilities(probs: np.ndarray) -> np.ndarray:
    probs = np.maximum(probs, 0)
    total = probs.sum()
    if total <= 0:
        return np.ones_like(probs) / len(probs)
    return probs / total


def _boost_label(
    probs: np.ndarray,
    classes: np.ndarray,
    label_name: str,
    multiplier: float,
) -> None:
    lower_classes = {name.lower(): idx for idx, name in enumerate(classes)}
    idx = lower_classes.get(label_name.lower())
    if idx is not None:
        probs[idx] *= multiplier


def apply_rule_based_boost(
    probs: np.ndarray,
    classes: np.ndarray,
    temperature: float,
    humidity: float,
    rainfall: float,
) -> np.ndarray:
    boosted = probs.astype(float).copy()

    if rainfall > 200 and humidity > 80:
        _boost_label(boosted, classes, RICE, multiplier=1.20)

    if 20 <= temperature <= 25 and humidity > 75:
        _boost_label(boosted, classes, COFFEE, multiplier=1.15)

    if temperature > 28 and rainfall < 100:
        _boost_label(boosted, classes, MILLET, multiplier=1.15)

    return _normalize_probabilities(boosted)


def classify_confidence(confidence_pct: float) -> str:
    if confidence_pct > 70:
        return "High"
    if confidence_pct >= 40:
        return "Moderate"
    return "Low"


def predict_top_crops(payload: Dict[str, float]) -> Dict[str, object]:
    artifacts = load_artifacts()

    input_frame = pd.DataFrame([[payload[col] for col in FEATURE_COLUMNS]], columns=FEATURE_COLUMNS)
    scaled = artifacts.scaler.transform(input_frame)

    raw_probs = artifacts.model.predict_proba(scaled)[0]
    probs = _normalize_probabilities(np.array(raw_probs, dtype=float))
    probs = apply_rule_based_boost(
        probs=probs,
        classes=artifacts.label_encoder.classes_,
        temperature=payload["temperature"],
        humidity=payload["humidity"],
        rainfall=payload["rainfall"],
    )

    top_indices = np.argsort(probs)[::-1][:3]
    top_predictions: List[Tuple[str, float]] = [
        (str(artifacts.label_encoder.classes_[idx]), float(probs[idx] * 100.0))
        for idx in top_indices
    ]

    best_crop, best_confidence = top_predictions[0]

    revenue = ESTIMATED_YIELD_QUINTAL_PER_ACRE * MARKET_PRICE_RS_PER_QUINTAL
    profit = revenue - float(payload["budget"])

    return {
        "best_crop": best_crop,
        "confidence": round(best_confidence, 2),
        "alternatives": [
            {"crop": crop, "confidence": round(conf, 2)}
            for crop, conf in top_predictions[1:3]
        ],
        "confidence_level": classify_confidence(best_confidence),
        "estimated_yield_quintal_per_acre": ESTIMATED_YIELD_QUINTAL_PER_ACRE,
        "market_price_rs_per_quintal": MARKET_PRICE_RS_PER_QUINTAL,
        "estimated_revenue_rs": round(revenue, 2),
        "estimated_profit_rs": round(profit, 2),
    }
