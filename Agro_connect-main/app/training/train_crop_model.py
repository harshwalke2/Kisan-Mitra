import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

FEATURES = [
    'nitrogen',
    'phosphorus',
    'potassium',
    'temperature',
    'humidity',
    'ph',
    'rainfall',
]

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / 'backend' / 'ml_model' / 'data'
MODEL_DIR = ROOT_DIR / 'backend' / 'ml_model'
MODEL_PATH = MODEL_DIR / 'crop_recommendation_model.pkl'
METADATA_PATH = MODEL_DIR / 'crop_model_metadata.json'


def _load_crop_recommendation_data() -> pd.DataFrame:
    path = DATA_DIR / 'Crop_recommendation.csv'
    df = pd.read_csv(path)
    df = df.rename(
        columns={
            'N': 'nitrogen',
            'P': 'phosphorus',
            'K': 'potassium',
            'label': 'crop_label',
        }
    )
    df = df[[*FEATURES, 'crop_label']]
    return df


def _load_crop_fertilizer_data(default_humidity: float) -> pd.DataFrame:
    path = DATA_DIR / 'Crop_and_fertilizer_dataset.csv'
    df = pd.read_csv(path)
    df = df.rename(
        columns={
            'Nitrogen': 'nitrogen',
            'Phosphorus': 'phosphorus',
            'Potassium': 'potassium',
            'Temperature': 'temperature',
            'Rainfall': 'rainfall',
            'Crop': 'crop_label',
        }
    )

    if 'humidity' not in df.columns:
        df['humidity'] = default_humidity

    usable = [*FEATURES, 'crop_label']
    df = df[usable]
    return df


def _prepare_training_data() -> pd.DataFrame:
    base_df = _load_crop_recommendation_data()
    humidity_median = float(base_df['humidity'].median())
    extra_df = _load_crop_fertilizer_data(default_humidity=humidity_median)

    combined = pd.concat([base_df, extra_df], ignore_index=True)
    combined.columns = [c.strip().lower() for c in combined.columns]

    for feature in FEATURES:
        combined[feature] = pd.to_numeric(combined[feature], errors='coerce')

    combined['crop_label'] = combined['crop_label'].astype(str).str.strip().str.lower()
    combined = combined.drop_duplicates()
    combined = combined.dropna(subset=['crop_label', 'nitrogen', 'phosphorus', 'potassium', 'temperature', 'ph', 'rainfall'])

    numeric_cols = FEATURES
    for col in numeric_cols:
        combined[col] = combined[col].fillna(combined[col].median())

    return combined


def _train_model(X_train: pd.DataFrame, y_train: pd.Series):
    models = {
        'random_forest': (
            Pipeline(
                [
                    ('scaler', StandardScaler()),
                    ('model', RandomForestClassifier(random_state=42, n_jobs=-1)),
                ]
            ),
            {
                'model__n_estimators': [200, 300],
                'model__max_depth': [None, 20, 30],
                'model__min_samples_split': [2, 5],
            },
        ),
        'gradient_boosting': (
            Pipeline(
                [
                    ('scaler', StandardScaler()),
                    ('model', GradientBoostingClassifier(random_state=42)),
                ]
            ),
            {
                'model__n_estimators': [150, 250],
                'model__learning_rate': [0.05, 0.1],
                'model__max_depth': [2, 3],
            },
        ),
    }

    best_name = None
    best_search = None

    for model_name, (pipeline, params) in models.items():
        search = GridSearchCV(
            pipeline,
            params,
            cv=5,
            scoring='accuracy',
            n_jobs=-1,
            verbose=0,
        )
        search.fit(X_train, y_train)

        if best_search is None or search.best_score_ > best_search.best_score_:
            best_name = model_name
            best_search = search

    return best_name, best_search


def main() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    df = _prepare_training_data()
    X = df[FEATURES]
    y = df['crop_label']

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    best_model_name, best_search = _train_model(X_train, y_train)
    best_pipeline = best_search.best_estimator_

    y_pred = best_pipeline.predict(X_test)
    accuracy = float(accuracy_score(y_test, y_pred))

    class_report = classification_report(y_test, y_pred, output_dict=True)

    artifact = {
        'model': best_pipeline,
        'feature_order': FEATURES,
        'label_key': 'crop_label',
    }

    joblib.dump(artifact, MODEL_PATH)

    metadata = {
        'accuracy': accuracy,
        'best_model': best_model_name,
        'best_cv_accuracy': float(best_search.best_score_),
        'best_params': best_search.best_params_,
        'train_rows': int(len(X_train)),
        'test_rows': int(len(X_test)),
        'total_rows': int(len(df)),
        'features': FEATURES,
        'classes': sorted(y.unique().tolist()),
        'classification_report': class_report,
        'model_path': str(MODEL_PATH),
        'data_sources': [
            str(DATA_DIR / 'Crop_recommendation.csv'),
            str(DATA_DIR / 'Crop_and_fertilizer_dataset.csv'),
        ],
    }

    with METADATA_PATH.open('w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    print(json.dumps({'accuracy': accuracy, 'best_model': best_model_name, 'model_path': str(MODEL_PATH)}))

    if accuracy < 0.9:
        raise RuntimeError(f'Model accuracy below target: {accuracy:.4f}')


if __name__ == '__main__':
    main()
