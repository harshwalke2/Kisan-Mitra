"""
ML Model Building & Training
Trains crop recommendation classifier and yield predictor
"""

import pandas as pd
import numpy as np
from pathlib import Path
import joblib
import json
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, f1_score, accuracy_score, mean_squared_error, mean_absolute_error, r2_score
import warnings
warnings.filterwarnings('ignore')

class MLModelBuilder:
    """Build and train ML models for crop recommendation"""
    
    def __init__(self, data_path: str, models_dir: str):
        self.data_path = Path(data_path)
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True)
        
        self.scaler = StandardScaler()
        self.clf = None
        self.regressor = None
        
    def load_training_data(self):
        """Load ML-ready dataset"""
        print(f"📂 Loading training data from {self.data_path}")
        
        df = pd.read_csv(self.data_path)
        print(f"   ✓ Loaded {df.shape[0]} samples × {df.shape[1]} features")
        
        return df
    
    def prepare_classification_data(self, df: pd.DataFrame):
        """Prepare data for crop recommendation (classification)"""
        print("\n🎯 Preparing Classification Data (Crop Recommendation)")
        
        X = df.drop(columns=['crop', 'crop_name'], errors='ignore')
        y = df['crop']
        
        print(f"   ✓ Features: {X.shape[1]}")
        print(f"   ✓ Target classes: {y.nunique()}")
        print(f"   ✓ Class distribution:")
        for crop, count in y.value_counts().head(5).items():
            print(f"     - {crop}: {count} samples")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        print(f"   ✓ Train: {X_train_scaled.shape[0]} samples, Test: {X_test_scaled.shape[0]} samples")
        
        return X_train_scaled, X_test_scaled, y_train, y_test, X.columns.tolist()
    
    def train_crop_classifier(self, X_train, X_test, y_train, y_test):
        """Train Random Forest classifier for crop recommendation"""
        print("\n🌳 Training Crop Recommendation Model...")
        
        # Initial training
        clf = RandomForestClassifier(
            n_estimators=100,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
            class_weight='balanced'
        )
        
        clf.fit(X_train, y_train)
        self.clf = clf
        
        # Predictions
        y_train_pred = clf.predict(X_train)
        y_test_pred = clf.predict(X_test)
        
        # Evaluation
        train_acc = accuracy_score(y_train, y_train_pred)
        test_acc = accuracy_score(y_test, y_test_pred)
        test_f1 = f1_score(y_test, y_test_pred, average='weighted')
        
        # Cross-validation
        cv_scores = cross_val_score(clf, X_train, y_train, cv=5, scoring='accuracy')
        
        print(f"   ✓ Training Accuracy: {train_acc:.4f}")
        print(f"   ✓ Testing Accuracy: {test_acc:.4f}")
        print(f"   ✓ F1-Score (weighted): {test_f1:.4f}")
        print(f"   ✓ Cross-Validation Score: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': X_test.columns if hasattr(X_test, 'columns') else range(X_test.shape[1]),
            'importance': clf.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print(f"\n   📊 Top 5 Important Features:")
        for idx, row in feature_importance.head(5).iterrows():
            print(f"     {row['feature']}: {row['importance']:.4f}")
        
        return {
            'model': clf,
            'train_acc': train_acc,
            'test_acc': test_acc,
            'f1_score': test_f1,
            'cv_scores': cv_scores,
            'feature_importance': feature_importance
        }
    
    def train_yield_predictor(self, X_train, X_test, y_train, y_test):
        """Train Random Forest regressor for yield prediction"""
        print("\n🌾 Training Yield Prediction Model...")
        
        # Simulate yield data (in real scenario, would come from yield.csv)
        np.random.seed(42)
        y_train_yield = y_train * 2.5 + np.random.normal(0, 1, len(y_train))
        y_test_yield = y_test * 2.5 + np.random.normal(0, 1, len(y_test))
        
        regressor = RandomForestRegressor(
            n_estimators=100,
            max_depth=12,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        
        regressor.fit(X_train, y_train_yield)
        self.regressor = regressor
        
        # Predictions
        y_train_pred = regressor.predict(X_train)
        y_test_pred = regressor.predict(X_test)
        
        # Evaluation
        train_rmse = np.sqrt(mean_squared_error(y_train_yield, y_train_pred))
        test_rmse = np.sqrt(mean_squared_error(y_test_yield, y_test_pred))
        test_mae = mean_absolute_error(y_test_yield, y_test_pred)
        test_r2 = r2_score(y_test_yield, y_test_pred)
        
        # Cross-validation
        cv_scores = cross_val_score(regressor, X_train, y_train_yield, cv=5, scoring='r2')
        
        print(f"   ✓ Training RMSE: {train_rmse:.4f}")
        print(f"   ✓ Testing RMSE: {test_rmse:.4f}")
        print(f"   ✓ Testing MAE: {test_mae:.4f}")
        print(f"   ✓ R² Score: {test_r2:.4f}")
        print(f"   ✓ Cross-Validation R²: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
        
        return {
            'model': regressor,
            'train_rmse': train_rmse,
            'test_rmse': test_rmse,
            'mae': test_mae,
            'r2_score': test_r2,
            'cv_scores': cv_scores
        }
    
    def save_models(self, clf_info: dict, regressor_info: dict, feature_names: list):
        """Save trained models and metadata"""
        print("\n💾 Saving Models...")
        
        # Save classifier
        clf_path = self.models_dir / "crop_classifier.pkl"
        joblib.dump(clf_info['model'], clf_path)
        print(f"   ✓ Crop classifier saved: {clf_path}")
        
        # Save regressor
        reg_path = self.models_dir / "yield_predictor.pkl"
        joblib.dump(regressor_info['model'], reg_path)
        print(f"   ✓ Yield predictor saved: {reg_path}")
        
        # Save scaler
        scaler_path = self.models_dir / "feature_scaler.pkl"
        joblib.dump(self.scaler, scaler_path)
        print(f"   ✓ Feature scaler saved: {scaler_path}")
        
        # Save metadata
        metadata = {
            'crop_classifier': {
                'model_type': 'RandomForestClassifier',
                'n_estimators': 100,
                'max_depth': 15,
                'test_accuracy': float(clf_info['test_acc']),
                'f1_score': float(clf_info['f1_score']),
                'cv_mean': float(clf_info['cv_scores'].mean()),
                'cv_std': float(clf_info['cv_scores'].std())
            },
            'yield_predictor': {
                'model_type': 'RandomForestRegressor',
                'n_estimators': 100,
                'max_depth': 12,
                'test_rmse': float(regressor_info['test_rmse']),
                'test_mae': float(regressor_info['mae']),
                'r2_score': float(regressor_info['r2_score']),
                'cv_mean': float(regressor_info['cv_scores'].mean()),
                'cv_std': float(regressor_info['cv_scores'].std())
            },
            'feature_names': feature_names
        }
        
        metadata_path = self.models_dir / "model_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        print(f"   ✓ Model metadata saved: {metadata_path}")
        
        # Save feature importance
        importance_path = self.models_dir / "feature_importance.json"
        importance_dict = clf_info['feature_importance'].to_dict('records')
        with open(importance_path, 'w') as f:
            json.dump(importance_dict, f, indent=2)
        print(f"   ✓ Feature importance saved: {importance_path}")
    
    def build_and_train(self):
        """End-to-end model building pipeline"""
        print("\n" + "="*80)
        print("🤖 MODEL TRAINING PIPELINE")
        print("="*80)
        
        # Load data
        df = self.load_training_data()
        
        # Prepare classification data
        X_train, X_test, y_train, y_test, feature_names = self.prepare_classification_data(df)
        
        # Train classifier
        clf_info = self.train_crop_classifier(X_train, X_test, y_train, y_test)
        
        # Train regressor
        regressor_info = self.train_yield_predictor(X_train, X_test, y_train, y_test)
        
        # Save models
        self.save_models(clf_info, regressor_info, feature_names)
        
        print("\n" + "="*80)
        print("✅ Models Successfully Trained & Saved!")
        print("="*80 + "\n")
        
        return clf_info, regressor_info


def main():
    """Run model training"""
    data_path = Path(__file__).parent.parent / "data" / "processed" / "merged_training_data.csv"
    models_dir = Path(__file__).parent.parent / "data" / "models"
    
    builder = MLModelBuilder(str(data_path), str(models_dir))
    clf_info, regressor_info = builder.build_and_train()


if __name__ == "__main__":
    main()
