"""
Optimized Crop Recommendation Model Training
Intelligently selects high-quality datasets and trains efficient models.
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

REQUIRED_FEATURES = ['nitrogen', 'phosphorus', 'potassium', 'temperature', 'humidity', 'ph', 'rainfall']
LABEL_COLUMN = 'crop_label'


# ============================================================================
# Data Loading
# ============================================================================

def load_crop_recommendation_dataset() -> pd.DataFrame | None:
    """Load the primary high-quality crop recommendation dataset."""
    path = DATA_DIR / 'Crop_recommendation.csv'
    if not path.exists():
        return None
    
    try:
        df = pd.read_csv(path)
        
        # Rename/standardize columns
        rename_map = {
            'N': 'nitrogen',
            'n': 'nitrogen',
            'P': 'phosphorus',
            'p': 'phosphorus',
            'K': 'potassium',
            'k': 'potassium',
            'label': 'crop_label',
            'crop': 'crop_label',
        }
        
        for old_col in df.columns:
            if old_col.lower() in rename_map:
                df.rename(columns={old_col: rename_map[old_col.lower()]}, inplace=True)
        
        # Keep only required columns
        available_features = [f for f in REQUIRED_FEATURES if f in df.columns]
        if len(available_features) < 6 or 'crop_label' not in df.columns:
            return None
        
        df = df[available_features + ['crop_label']].copy()
        
        # Clean numeric columns
        for col in available_features:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Fill missing values
        for col in available_features:
            df[col].fillna(df[col].median(), inplace=True)
        
        # Clean labels
        df['crop_label'] = df['crop_label'].astype(str).str.strip().str.lower()
        df = df[df['crop_label'] != '']
        df = df[~df['crop_label'].isin({'nan', 'none', 'unknown'})]
        
        # Add missing required features if needed
        for feat in REQUIRED_FEATURES:
            if feat not in df.columns:
                df[feat] = df[REQUIRED_FEATURES[0]].median()
        
        # Remove duplicates
        df = df.drop_duplicates()
        
        return df if len(df) > 100 else None
    except Exception as e:
        print(f'  Error loading Crop_recommendation.csv: {e}')
        return None


def prepare_data(df: pd.DataFrame) -> Tuple[pd.DataFrame, np.ndarray, StandardScaler, LabelEncoder]:
    """Prepare data for training."""
    X = df[REQUIRED_FEATURES].copy()
    y = df['crop_label'].copy()
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X_scaled = pd.DataFrame(X_scaled, columns=REQUIRED_FEATURES)
    
    # Encode labels
    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(y)
    
    return X_scaled, y_encoded, scaler, encoder


def evaluate_model(model: Any, X_test: pd.DataFrame, y_test: np.ndarray) -> Dict[str, Any]:
    """Evaluate model performance."""
    y_pred = model.predict(X_test)
    
    metrics = {
        'accuracy': accuracy_score(y_test, y_pred),
        'precision': precision_score(y_test, y_pred, average='weighted', zero_division=0),
        'recall': recall_score(y_test, y_pred, average='weighted', zero_division=0),
        'f1_score': f1_score(y_test, y_pred, average='weighted'),
    }
    
    return metrics


def main():
    """Main training pipeline."""
    print('=' * 80)
    print('OPTIMIZED CROP RECOMMENDATION MODEL TRAINING')
    print('=' * 80)
    
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    
    # Load primary dataset
    print(f'\nLoading datasets from: {DATA_DIR}')
    df = load_crop_recommendation_dataset()
    
    if df is None:
        print('✗ Failed to load usable crop recommendation dataset')
        return
    
    print(f'✓ Loaded {len(df)} samples with {df["crop_label"].nunique()} crops')
    
    # Prepare training data
    X, y, scaler, encoder = prepare_data(df)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )
    
    print(f'Train: {len(X_train)} samples | Test: {len(X_test)} samples')
    print(f'Crops: {len(encoder.classes_)} unique crops')
    
    # Train RandomForest
    print('\n--- Training RandomForestClassifier (optimized) ---')
    rf_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
        class_weight='balanced_subsample'
    )
    rf_model.fit(X_train, y_train)
    rf_metrics = evaluate_model(rf_model, X_test, y_test)
    print(f'Accuracy: {rf_metrics["accuracy"]:.4f} | F1: {rf_metrics["f1_score"]:.4f}')
    
    # Train GradientBoosting
    print('\n--- Training GradientBoostingClassifier (optimized) ---')
    gb_model = GradientBoostingClassifier(
        n_estimators=150,
        learning_rate=0.1,
        max_depth=5,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        subsample=0.8,
    )
    gb_model.fit(X_train, y_train)
    gb_metrics = evaluate_model(gb_model, X_test, y_test)
    print(f'Accuracy: {gb_metrics["accuracy"]:.4f} | F1: {gb_metrics["f1_score"]:.4f}')
    
    # Select best model
    best_model_name = 'RandomForestClassifier' if rf_metrics['f1_score'] >= gb_metrics['f1_score'] else 'GradientBoostingClassifier'
    best_model = rf_model if rf_metrics['f1_score'] >= gb_metrics['f1_score'] else gb_model
    best_metrics = rf_metrics if rf_metrics['f1_score'] >= gb_metrics['f1_score'] else gb_metrics
    
    print('\n' + '=' * 80)
    print(f'BEST MODEL: {best_model_name}')
    print(f'  Accuracy:  {best_metrics["accuracy"]:.4f}')
    print(f'  Precision: {best_metrics["precision"]:.4f}')
    print(f'  Recall:    {best_metrics["recall"]:.4f}')
    print(f'  F1 Score:  {best_metrics["f1_score"]:.4f}')
    print('=' * 80)
    
    # Save model bundle
    model_bundle = {
        'model': best_model,
        'feature_order': REQUIRED_FEATURES,
        'label_encoder': encoder,
        'scaler': scaler,
        'label_key': LABEL_COLUMN,
    }
    
    joblib.dump(model_bundle, MODEL_PATH)
    
    # Save metadata
    metadata = {
        'best_model': best_model_name,
        'accuracy': float(best_metrics['accuracy']),
        'precision': float(best_metrics['precision']),
        'recall': float(best_metrics['recall']),
        'f1_score': float(best_metrics['f1_score']),
        'features': REQUIRED_FEATURES,
        'classes': sorted(encoder.classes_.tolist()),
        'total_crops': len(encoder.classes_),
        'train_rows': int(len(X_train)),
        'test_rows': int(len(X_test)),
        'total_rows': int(len(df)),
        'model_path': str(MODEL_PATH),
        'models_comparison': {
            'RandomForestClassifier': {
                'accuracy': float(rf_metrics['accuracy']),
                'f1_score': float(rf_metrics['f1_score']),
            },
            'GradientBoostingClassifier': {
                'accuracy': float(gb_metrics['accuracy']),
                'f1_score': float(gb_metrics['f1_score']),
            },
        },
    }
    
    with open(METADATA_PATH, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    # Output summary
    summary = {
        'status': 'success',
        'best_model': best_model_name,
        'accuracy': round(best_metrics['accuracy'], 4),
        'f1_score': round(best_metrics['f1_score'], 4),
        'crop_count': len(encoder.classes_),
        'model_path': str(MODEL_PATH),
    }
    
    print('\n✓ Model saved successfully!')
    print(json.dumps(summary, indent=2))
    
    return metadata


if __name__ == '__main__':
    main()
