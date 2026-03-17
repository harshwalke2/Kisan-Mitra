import json
import re
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
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

FEATURE_ALIASES = {
    'nitrogen': ['nitrogen', 'n', 'nitrogen_level'],
    'phosphorus': ['phosphorus', 'p', 'phosphorus_level'],
    'potassium': ['potassium', 'k', 'potassium_level'],
    'temperature': ['temperature', 'temp'],
    'humidity': ['humidity'],
    'ph': ['ph', 'soil_ph'],
    'rainfall': ['rainfall'],
}

LABEL_CANDIDATES = ['crop_label', 'label', 'crop_name', 'crop', 'crop_type']

BACKEND_DIR = Path(__file__).resolve().parents[1]
APP_DIR = BACKEND_DIR.parent
WORKSPACE_DIR = APP_DIR.parents[1]
LOCAL_DATA_DIR = BACKEND_DIR / 'ml_model' / 'data'
MODEL_DIR = BACKEND_DIR / 'ml_model'
MODEL_PATH = MODEL_DIR / 'crop_recommendation_model.pkl'
METADATA_PATH = MODEL_DIR / 'crop_recommendation_model_metadata.json'

DATASET_PATHS = [
    Path('processed/merged_training_data.csv'),
    Path('processed/cleaned_Crop_recommendation.csv'),
    Path('Crop_recommendation.csv'),
    Path('fertilizer_recommendation.csv'),
    Path('Crop and fertilizer dataset.csv'),
]


def _normalize_column_name(column: str) -> str:
    normalized = column.strip().lower()
    normalized = re.sub(r'[^a-z0-9]+', '_', normalized)
    return normalized.strip('_')


def _find_source_data_dir() -> Path:
    preferred_names = ['kisan-sathi-main', 'kisan-sathi-personal-changes']

    for repo_name in preferred_names:
        candidate = WORKSPACE_DIR / repo_name / 'data'
        if candidate.exists():
            return candidate

    for child in WORKSPACE_DIR.iterdir():
        if child.is_dir() and child.name.lower().startswith('kisan-sathi'):
            candidate = child / 'data'
            if candidate.exists():
                return candidate

    if LOCAL_DATA_DIR.exists():
        return LOCAL_DATA_DIR

    raise FileNotFoundError('Unable to locate a usable kisan-sathi data directory.')


def _pick_column(columns: list[str], aliases: list[str]) -> str | None:
    for alias in aliases:
        if alias in columns:
            return alias
    return None


def _build_reference_medians(data_dir: Path) -> dict[str, float]:
    reference_path = data_dir / 'processed' / 'merged_training_data.csv'
    if not reference_path.exists():
        reference_path = data_dir / 'Crop_recommendation.csv'

    reference_df = pd.read_csv(reference_path).rename(
        columns={
            'n': 'nitrogen',
            'p': 'phosphorus',
            'k': 'potassium',
            'N': 'nitrogen',
            'P': 'phosphorus',
            'K': 'potassium',
        }
    )

    medians: dict[str, float] = {}
    for feature in FEATURES:
        medians[feature] = float(pd.to_numeric(reference_df[feature], errors='coerce').median())

    return medians


def _standardize_dataset(
    df: pd.DataFrame,
    source_name: str,
    fallback_medians: dict[str, float],
) -> tuple[pd.DataFrame | None, str | None]:
    renamed = df.rename(columns={column: _normalize_column_name(column) for column in df.columns})
    available_columns = renamed.columns.tolist()

    label_column = _pick_column(available_columns, LABEL_CANDIDATES)
    if label_column is None:
        return None, 'missing crop label column'

    selected_columns: dict[str, str | None] = {}

    for feature in FEATURES:
        source_column = _pick_column(available_columns, FEATURE_ALIASES[feature])
        selected_columns[feature] = source_column

    standardized = pd.DataFrame()
    for feature in FEATURES:
        source_column = selected_columns[feature]
        if source_column is None:
            standardized[feature] = fallback_medians[feature]
        else:
            standardized[feature] = renamed[source_column]

    standardized['crop_label'] = renamed[label_column]
    standardized['source_dataset'] = source_name

    for feature in FEATURES:
        standardized[feature] = pd.to_numeric(standardized[feature], errors='coerce')
        if standardized[feature].isna().all():
            standardized[feature] = fallback_medians[feature]
        else:
            standardized[feature] = standardized[feature].fillna(standardized[feature].median())

    standardized['crop_label'] = standardized['crop_label'].astype(str).str.strip().str.lower()
    standardized = standardized[standardized['crop_label'].ne('')]
    standardized = standardized[~standardized['crop_label'].isin({'nan', 'none'})]
    standardized = standardized.drop_duplicates()

    if standardized.empty:
        return None, 'dataset became empty after cleaning'

    if standardized['crop_label'].nunique() < 2:
        return None, 'dataset does not contain at least two crop classes'

    return standardized, None


def _load_candidate_datasets(data_dir: Path) -> tuple[list[dict[str, object]], list[dict[str, str]]]:
    candidates: list[dict[str, object]] = []
    skipped: list[dict[str, str]] = []
    fallback_medians = _build_reference_medians(data_dir)

    for relative_path in DATASET_PATHS:
        csv_path = data_dir / relative_path
        if not csv_path.exists():
            skipped.append({'dataset': str(relative_path), 'reason': 'file not found'})
            continue

        dataset = pd.read_csv(csv_path)
        standardized, skip_reason = _standardize_dataset(
            dataset,
            str(relative_path).replace('\\', '/'),
            fallback_medians,
        )

        if standardized is None:
            skipped.append({'dataset': str(relative_path).replace('\\', '/'), 'reason': skip_reason or 'unusable'})
            continue

        candidates.append(
            {
                'dataset': str(relative_path).replace('\\', '/'),
                'frame': standardized,
            }
        )

    if not candidates:
        raise ValueError(f'No usable crop recommendation datasets were found in {data_dir}')

    return candidates, skipped


def _build_model() -> Pipeline:
    return Pipeline(
        [
            ('scaler', StandardScaler()),
            (
                'model',
                RandomForestClassifier(
                    n_estimators=300,
                    max_depth=24,
                    min_samples_split=2,
                    min_samples_leaf=1,
                    max_features='sqrt',
                    random_state=42,
                    n_jobs=-1,
                    class_weight='balanced_subsample',
                ),
            ),
        ]
    )


def _evaluate_dataset(dataset_name: str, frame: pd.DataFrame) -> dict[str, object]:
    model_frame = frame.drop(columns=['source_dataset'], errors='ignore').copy()
    X = model_frame[FEATURES]
    y = model_frame['crop_label']

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    pipeline = _build_model()
    pipeline.fit(X_train, y_train)
    predictions = pipeline.predict(X_test)
    accuracy = float(accuracy_score(y_test, predictions))

    return {
        'dataset': dataset_name,
        'frame': model_frame,
        'model': pipeline,
        'accuracy': accuracy,
        'classification_report': classification_report(y_test, predictions, output_dict=True),
        'train_rows': int(len(X_train)),
        'test_rows': int(len(X_test)),
        'total_rows': int(len(model_frame)),
    }


def main() -> None:
    data_dir = _find_source_data_dir()
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    candidates, skipped_datasets = _load_candidate_datasets(data_dir)
    evaluations = [
        _evaluate_dataset(candidate['dataset'], candidate['frame'])
        for candidate in candidates
    ]

    best_result = max(evaluations, key=lambda result: result['accuracy'])
    best_frame = best_result['frame']
    best_pipeline = _build_model()
    best_pipeline.fit(best_frame[FEATURES], best_frame['crop_label'])

    model_bundle = {
        'model': best_pipeline,
        'feature_order': FEATURES,
        'label_key': 'crop_label',
    }

    joblib.dump(model_bundle, MODEL_PATH)

    metadata = {
        'accuracy': float(best_result['accuracy']),
        'selected_dataset': best_result['dataset'],
        'model_params': best_pipeline.named_steps['model'].get_params(),
        'train_rows': best_result['train_rows'],
        'test_rows': best_result['test_rows'],
        'total_rows': best_result['total_rows'],
        'features': FEATURES,
        'source_data_dir': str(data_dir),
        'evaluated_datasets': [
            {
                'dataset': result['dataset'],
                'accuracy': result['accuracy'],
                'rows': result['total_rows'],
            }
            for result in evaluations
        ],
        'skipped_datasets': skipped_datasets,
        'classification_report': best_result['classification_report'],
        'model_path': str(MODEL_PATH),
    }

    with METADATA_PATH.open('w', encoding='utf-8') as metadata_file:
        json.dump(metadata, metadata_file, indent=2)

    print(
        json.dumps(
            {
                'accuracy': best_result['accuracy'],
                'selected_dataset': best_result['dataset'],
                'model_path': str(MODEL_PATH),
                'metadata_path': str(METADATA_PATH),
                'evaluated_datasets': metadata['evaluated_datasets'],
            }
        )
    )

    if float(best_result['accuracy']) < 0.9:
        raise RuntimeError(f"Model accuracy below target: {float(best_result['accuracy']):.4f}")


if __name__ == '__main__':
    main()