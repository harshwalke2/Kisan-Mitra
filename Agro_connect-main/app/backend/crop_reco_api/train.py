from __future__ import annotations

import os
from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from xgboost import XGBClassifier

FEATURE_COLUMNS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
LABEL_COLUMN = "label"

BASE_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
DEFAULT_DATASET_PATH = (BASE_DIR / "../../../data/Crop_recommendation.csv").resolve()

MODEL_PATH = ARTIFACTS_DIR / "xgb_crop_model.joblib"
SCALER_PATH = ARTIFACTS_DIR / "feature_scaler.joblib"
ENCODER_PATH = ARTIFACTS_DIR / "label_encoder.joblib"


def load_dataset(csv_path: Path) -> pd.DataFrame:
    if not csv_path.exists():
        raise FileNotFoundError(f"Dataset not found at: {csv_path}")

    df = pd.read_csv(csv_path)
    required_columns = FEATURE_COLUMNS + [LABEL_COLUMN]
    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing required columns: {missing}")

    # Handle missing numeric values with median to preserve robust distributions.
    for col in FEATURE_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")
        df[col] = df[col].fillna(df[col].median())

    # Handle missing labels with mode; then enforce string labels.
    if df[LABEL_COLUMN].isna().any():
        df[LABEL_COLUMN] = df[LABEL_COLUMN].fillna(df[LABEL_COLUMN].mode().iloc[0])
    df[LABEL_COLUMN] = df[LABEL_COLUMN].astype(str)

    return df


def train_model(dataset_path: Path) -> None:
    df = load_dataset(dataset_path)

    X = df[FEATURE_COLUMNS]
    y = df[LABEL_COLUMN]

    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y_encoded,
        test_size=0.2,
        random_state=42,
        stratify=y_encoded,
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        objective="multi:softprob",
        eval_metric="mlogloss",
        random_state=42,
        n_jobs=-1,
        tree_method="hist",
    )

    model.fit(X_train_scaled, y_train)

    predictions = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, predictions)
    print(f"Model Accuracy: {accuracy * 100:.2f}%")

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    joblib.dump(label_encoder, ENCODER_PATH)

    print(f"Saved model to: {MODEL_PATH}")
    print(f"Saved scaler to: {SCALER_PATH}")
    print(f"Saved label encoder to: {ENCODER_PATH}")


if __name__ == "__main__":
    dataset_env = os.getenv("CROP_DATASET_PATH", "").strip()
    dataset_path = Path(dataset_env).resolve() if dataset_env else DEFAULT_DATASET_PATH
    train_model(dataset_path)
