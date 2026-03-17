"""
Fast Crop Recommendation Model Training
Trains optimized models on local agro_connect datasets.
"""

import json
import warnings
from pathlib import Path
from typing import Any, Dict, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

warnings.filterwarnings('ignore')

# ============================================================================
# Configuration
# ============================================================================

BACKEND_DIR = Path(__file__).resolve().parents[1]
APP_DIR = BACKEND_DIR.parent
ROOT_DIR = APP_DIR.parent
DATA_DIR = ROOT_DIR / 'data'
MODEL_DIR = BACKEND_DIR / 'ml_model'
MODEL_PATH = MODEL_DIR / 'crop_recommendation_model.pkl'
METADATA_PATH = MODEL_DIR / 'crop_recommendation_model_metadata.json'
SCALER_PATH = MODEL_DIR / 'feature_scaler.pkl'
ENCODER_PATH = MODEL_DIR / 'label_encoder.pkl'

REQUIRED_FEATURES = ['nitrogen', 'phosphorus', 'potassium', 'temperature', 'humidity', 'ph', 'rainfall']
LABEL_COLUMN = 'crop_label'

DATASET_SOURCES = {
    'Crop_recommendation.csv': {
        'features': {'N': 'nitrogen', 'P': 'phosphorus', 'K': 'potassium'},
        'label': 'label',
        'required_features': REQUIRED_FEATURES,
    },
    'Crop and fertilizer dataset.csv': {
        'features': {
            'Nitrogen': 'nitrogen',
            'Phosphorus': 'phosphorus',
            'Potassium': 'potassium',
            'Temperature': 'temperature',
            'Rainfall': 'rainfall',
            'pH': 'ph',
        },
        'label': 'Crop',
        'required_features': ['nitrogen', 'phosphorus', 'potassium', 'temperature', 'ph', 'rainfall'],
    },
    'fertilizer_recommendation.csv': {
        'features': {
            'Nitrogen_Level': 'nitrogen',
            'Phosphorus_Level': 'phosphorus',
            'Potassium_Level': 'potassium',
            'Temperature': 'temperature',
            'Humidity': 'humidity',
            'Soil_pH': 'ph',
            'Rainfall': 'rainfall',
        },
        'label': 'Crop_Type',
        'required_features': REQUIRED_FEATURES,
    },
}


# ============================================================================
# Data Loading and Preprocessing
# ============================================================================

def normalize_column_name(col: str) -> str:
    """Normalize column name for consistent matching."""
    return col.strip().lower().replace(' ', '_').replace('-', '_')


def load_dataset(csv_path: Path, source_config: Dict[str, Any], humidity_median: float = 80.0) -> pd.DataFrame | None:
    """Load and standardize a single dataset."""
    try:
        df = pd.read_csv(csv_path)
        
        # Rename columns to standard names
        rename_map = {}
        for raw_col, config_col in source_config['features'].items():
            found = None
            for df_col in df.columns:
                if normalize_column_name(df_col) == normalize_column_name(raw_col):
                    found = df_col
                    break
            if found:
                rename_map[found] = config_col
        
        df = df.rename(columns=rename_map)
        
        # Find label column
        label_col = None
        for df_col in df.columns:
            if normalize_column_name(df_col) == normalize_column_name(source_config['label']):
                label_col = df_col
                break
        
        if label_col is None:
            return None
        
        # Select required columns
        cols_to_keep = [col for col in source_config['required_features'] if col in df.columns]
        if len(cols_to_keep) < 5:
            return None
        
        df = df[cols_to_keep + [label_col]].copy()
        df.rename(columns={label_col: LABEL_COLUMN}, inplace=True)
        
        # Handle missing humidity
        if 'humidity' not in df.columns:
            df['humidity'] = humidity_median
        
        # Fill any remaining features with column median
        for feat in REQUIRED_FEATURES:
            if feat not in df.columns:
                df[feat] = np.nan
            df[feat] = pd.to_numeric(df[feat], errors='coerce')
            if df[feat].isna().sum() > 0:
                df[feat].fillna(df[feat].median(), inplace=True)
        
        # Clean labels
        df[LABEL_COLUMN] = df[LABEL_COLUMN].astype(str).str.strip().str.lower()
        df = df[df[LABEL_COLUMN] != '']
        df = df[~df[LABEL_COLUMN].isin({'nan', 'none', 'unknown'})]
        
        # Remove duplicates
        df = df.drop_duplicates()
        
        if len(df) < 50:
            return None
        
        return df
    except Exception as e:
        print(f'  Warning: Failed to load {csv_path.name}: {e}')
        return None


def load_all_datasets() -> Tuple[pd.DataFrame, list]:
    """Load and combine datasets."""
    datasets = []
    sources_used = []
    
    print('Loading datasets from:', DATA_DIR)
    
    for filename, config in DATASET_SOURCES.items():
        path = DATA_DIR / filename
        if not path.exists():
            continue
        
        print(f'  Loading {filename}...', end=' ')
        df = load_dataset(path, config)
        
        if df is not None:
            datasets.append(df)
            sources_used.append(filename)
            print(f'✓ ({len(df)} rows, {df[LABEL_COLUMN].nunique()} crops)')
        else:
            print('✗ (skipped)')
    
    if not datasets:
        raise ValueError('No usable datasets found')
    
    combined = pd.concat(datasets, ignore_index=True)
    combined = combined.drop_duplicates(subset=REQUIRED_FEATURES + [LABEL_COLUMN])
    
    print(f'\nCombined: {len(combined)} rows, {combined[LABEL_COLUMN].nunique()} crops')
    
    return combined, sources_used


def prepare_training_data(df: pd.DataFrame) -> Tuple[pd.DataFrame, np.ndarray, StandardScaler, LabelEncoder]:
    """Prepare data for training."""
    X = df[REQUIRED_FEATURES].copy()
    y = df[LABEL_COLUMN].copy()
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X_scaled = pd.DataFrame(X_scaled, columns=REQUIRED_FEATURES)
    
    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(y)
    
    print(f'Features: {REQUIRED_FEATURES}')
    print(f'Classes: {len(encoder.classes_)} crops')
    
    return X_scaled, y_encoded, scaler, encoder


def evaluate_model(model: Any, X_test: pd.DataFrame, y_test: np.ndarray, encoder: LabelEncoder) -> Dict[str, Any]:
    """Evaluate model performance."""
    y_pred = model.predict(X_test)
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    f1 = f1_score(y_test, y_pred, average='weighted')
    
    class_report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    
    return {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1_score': f1,
        'classification_report': class_report,
    }


def main():
    """Main training pipeline."""
    print('=' * 80)
    print('HIGH-PERFORMANCE CROP RECOMMENDATION MODEL TRAINING')
    print('=' * 80)
    
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    
    # Load datasets
    combined_df, sources_used = load_all_datasets()
    
    # Prepare training data
    X, y, scaler, encoder = prepare_training_data(combined_df)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )
    
    print(f'\nTrain: {len(X_train)} samples | Test: {len(X_test)} samples')
    
    # Train models
    models_trained = []
    
    print('\n--- Training RandomForestClassifier ---')
    rf_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1,
        class_weight='balanced_subsample'
    )
    rf_model.fit(X_train, y_train)
    rf_eval = evaluate_model(rf_model, X_test, y_test, encoder)
    models_trained.append({
        'name': 'RandomForestClassifier',
        'model': rf_model,
        'eval': rf_eval,
        'f1_score': rf_eval['f1_score'],
    })
    print(f'Accuracy: {rf_eval["accuracy"]:.4f} | F1: {rf_eval["f1_score"]:.4f}')
    
    print('\n--- Training GradientBoostingClassifier ---')
    gb_model = GradientBoostingClassifier(
        n_estimators=150,
        learning_rate=0.1,
        max_depth=5,
        random_state=42,
        subsample=0.8
    )
    gb_model.fit(X_train, y_train)
    gb_eval = evaluate_model(gb_model, X_test, y_test, encoder)
    models_trained.append({
        'name': 'GradientBoostingClassifier',
        'model': gb_model,
        'eval': gb_eval,
        'f1_score': gb_eval['f1_score'],
    })
    print(f'Accuracy: {gb_eval["accuracy"]:.4f} | F1: {gb_eval["f1_score"]:.4f}')
    
    # Select best model
    best_result = max(models_trained, key=lambda x: x['f1_score'])
    best_model = best_result['model']
    
    print('\n' + '=' * 80)
    print(f'BEST MODEL: {best_result["name"]}')
    print(f'  Accuracy:  {best_result["eval"]["accuracy"]:.4f}')
    print(f'  Precision: {best_result["eval"]["precision"]:.4f}')
    print(f'  Recall:    {best_result["eval"]["recall"]:.4f}')
    print(f'  F1 Score:  {best_result["eval"]["f1_score"]:.4f}')
    print('=' * 80)
    
    # Save model artifacts
    model_bundle = {
        'model': best_model,
        'feature_order': REQUIRED_FEATURES,
        'label_encoder': encoder,
        'scaler': scaler,
        'label_key': LABEL_COLUMN,
    }
    
    joblib.dump(model_bundle, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    joblib.dump(encoder, ENCODER_PATH)
    
    # Save metadata
    metadata = {
        'best_model': best_result['name'],
        'accuracy': float(best_result['eval']['accuracy']),
        'precision': float(best_result['eval']['precision']),
        'recall': float(best_result['eval']['recall']),
        'f1_score': float(best_result['eval']['f1_score']),
        'features': REQUIRED_FEATURES,
        'classes': encoder.classes_.tolist(),
        'train_rows': int(len(X_train)),
        'test_rows': int(len(X_test)),
        'total_rows': int(len(X)),
        'datasets_used': sources_used,
        'model_path': str(MODEL_PATH),
        'evaluation': {
            'accuracy': float(best_result['eval']['accuracy']),
            'precision': float(best_result['eval']['precision']),
            'recall': float(best_result['eval']['recall']),
            'f1_score': float(best_result['eval']['f1_score']),
        },
        'all_models_trained': [
            {
                'name': m['name'],
                'accuracy': float(m['eval']['accuracy']),
                'f1_score': float(m['eval']['f1_score']),
                'precision': float(m['eval']['precision']),
                'recall': float(m['eval']['recall']),
            }
            for m in models_trained
        ],
    }
    
    with open(METADATA_PATH, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    # Summary
    summary = {
        'status': 'success',
        'best_model': best_result['name'],
        'accuracy': round(best_result['eval']['accuracy'], 4),
        'f1_score': round(best_result['eval']['f1_score'], 4),
        'crop_count': len(encoder.classes_),
        'datasets_used': sources_used,
    }
    
    print('\nTRAINING SUMMARY:')
    print(json.dumps(summary, indent=2))
    
    if best_result['eval']['accuracy'] < 0.80:
        print(f'\n⚠️  Warning: Accuracy ({best_result["eval"]["accuracy"]:.4f}) below 80% threshold')
    else:
        print(f'\n✓ Model saved successfully to {MODEL_PATH}')
    
    return metadata


if __name__ == '__main__':
    main()
