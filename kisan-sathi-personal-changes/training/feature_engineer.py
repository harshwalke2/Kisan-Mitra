"""
Feature Engineering & Dataset Merging
Creates ML-ready dataset with derived features
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, Dict
from sklearn.preprocessing import LabelEncoder
import warnings
warnings.filterwarnings('ignore')

class FeatureEngineer:
    """Engineer features and merge datasets for ML training"""
    
    def __init__(self, processed_dir: str):
        self.processed_dir = Path(processed_dir)
        self.output_dir = self.processed_dir.parent / "models"
        self.output_dir.mkdir(exist_ok=True)
    
    def load_datasets(self):
        """Load cleaned datasets"""
        print("📂 Loading cleaned datasets...")
        
        datasets = {}
        
        # Core dataset: Crop recommendation (has all features)
        crop_rec = pd.read_csv(self.processed_dir / "cleaned_Crop_recommendation.csv")
        datasets['crop_rec'] = crop_rec
        print(f"   ✓ Crop Recommendation: {crop_rec.shape}")
        
        # Yield data
        try:
            yield_main = pd.read_csv(self.processed_dir / "cleaned_yield.csv")
            datasets['yield'] = yield_main
            print(f"   ✓ Yield: {yield_main.shape}")
        except:
            print(f"   ✗ Yield dataset not found")
        
        # Price data
        try:
            price = pd.read_csv(self.processed_dir / "cleaned_Agriculture_price_dataset.csv")
            datasets['price'] = price
            print(f"   ✓ Price: {price.shape}")
        except:
            print(f"   ✗ Price dataset not found")
        
        return datasets
    
    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create derived and engineered features"""
        df = df.copy()
        
        # Standardize column names
        df.columns = [col.lower().replace(' ', '_') for col in df.columns]
        
        # Core features to keep
        core_features = ['n', 'p', 'k', 'temperature', 'humidity', 'ph', 
                        'rainfall', 'crop', 'yield']
        
        # Filter to available columns
        available_cols = [col for col in core_features if col in df.columns]
        
        if len(available_cols) == 0:
            return None
        
        df = df[available_cols].copy()
        
        # 1. Rainfall deviation score (vs baseline 100mm)
        if 'rainfall' in df.columns:
            baseline_rainfall = 100
            df['rainfall_deviation_pct'] = ((df['rainfall'] - baseline_rainfall) / baseline_rainfall * 100).clip(-100, 100)
        
        # 2. NPK score (soil fertility indicator)
        if all(col in df.columns for col in ['n', 'p', 'k']):
            df['npk_score'] = (df['n'] + df['p'] + df['k']) / (300 + 100 + 150) * 100
            df['npk_score'] = df['npk_score'].clip(0, 150)
        
        # 3. Temperature favorability (optimal: 20-28°C)
        if 'temperature' in df.columns:
            optimal_temp = 25
            df['temp_favorability'] = 100 - (abs(df['temperature'] - optimal_temp) * 3)
            df['temp_favorability'] = df['temp_favorability'].clip(0, 100)
        
        # 4. Humidity favorability (optimal: 50-75%)
        if 'humidity' in df.columns:
            optimal_humidity = 65
            df['humidity_favorability'] = 100 - (abs(df['humidity'] - optimal_humidity) * 2)
            df['humidity_favorability'] = df['humidity_favorability'].clip(0, 100)
        
        # 5. Soil pH suitability
        if 'ph' in df.columns:
            df['ph_suitability'] = 100 - (abs(df['ph'] - 6.5) * 15)
            df['ph_suitability'] = df['ph_suitability'].clip(0, 100)
        
        # 6. Overall growth potential score
        score_cols = [col for col in df.columns if 'favorability' in col or 'suitability' in col or 'score' in col]
        if score_cols:
            df['growth_potential'] = df[score_cols].mean(axis=1).clip(0, 100)
        
        # 7. Water stress index
        if 'rainfall' in df.columns:
            df['water_stress'] = np.where(df['rainfall'] < 50, 1, np.where(df['rainfall'] < 100, 0.5, 0))
        
        return df
    
    def create_training_dataset(self, datasets: dict) -> pd.DataFrame:
        """Merge and prepare final training dataset"""
        print("\n🔀 Merging datasets for training...")
        
        # Use crop recommendation as base (most complete)
        if 'crop_rec' not in datasets or datasets['crop_rec'] is None:
            print("   ✗ Crop recommendation dataset required")
            return None
        
        training_df = datasets['crop_rec'].copy()
        training_df.columns = [col.lower().replace(' ', '_') for col in training_df.columns]
        
        # Rename 'label' to 'crop' if needed
        if 'label' in training_df.columns and 'crop' not in training_df.columns:
            training_df.rename(columns={'label': 'crop'}, inplace=True)
        
        # Engineer features
        engineered_df = self.engineer_features(training_df)
        
        if engineered_df is None:
            print("   ✗ Feature engineering failed")
            return None
        
        # Remove rows with missing target
        if 'crop' in engineered_df.columns:
            engineered_df = engineered_df.dropna(subset=['crop'])
        
        # Fill remaining NaN with column median for numeric columns
        numeric_cols = engineered_df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            engineered_df[col].fillna(engineered_df[col].median(), inplace=True)
        
        # Remove rows where all feature values are NaN
        engineered_df = engineered_df.dropna(how='all', subset=numeric_cols)
        
        print(f"   ✓ Training dataset shape: {engineered_df.shape}")
        print(f"   ✓ Features: {[col for col in engineered_df.columns if col != 'crop']}")
        print(f"   ✓ Target classes: {engineered_df['crop'].nunique()} crops")
        
        return engineered_df
    
    def encode_categorical(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, dict]:
        """Encode categorical variables"""
        print("\n🔤 Encoding categorical features...")
        
        encoders = {}
        df_encoded = df.copy()
        
        for col in df.columns:
            if df[col].dtype == 'object':
                le = LabelEncoder()
                df_encoded[col] = le.fit_transform(df[col].astype(str))
                encoders[col] = le
                print(f"   ✓ Encoded {col}: {len(le.classes_)} unique values")
        
        return df_encoded, encoders
    
    def create_ml_ready_dataset(self):
        """End-to-end pipeline: load, engineer, encode"""
        print("\n" + "="*80)
        print("⚙️  FEATURE ENGINEERING PIPELINE")
        print("="*80 + "\n")
        
        # Load cleaned datasets
        datasets = self.load_datasets()
        
        # Create training dataset
        training_df = self.create_training_dataset(datasets)
        
        if training_df is None:
            print("\n✗ Failed to create training dataset")
            return None
        
        # Separate features and target
        target_col = 'crop'
        X = training_df.drop(columns=[target_col])
        y = training_df[target_col]
        
        # Encode target
        le_target = LabelEncoder()
        y_encoded = le_target.fit_transform(y)
        
        # Encode categorical features in X if any
        X_encoded, feature_encoders = self.encode_categorical(X)
        
        # Create final dataset
        final_df = X_encoded.copy()
        final_df[target_col] = y_encoded
        final_df['crop_name'] = y  # Keep original crop names
        
        # Save training dataset
        output_path = self.processed_dir / "merged_training_data.csv"
        final_df.to_csv(output_path, index=False)
        print(f"\n✅ Merged training data saved: {output_path}")
        
        # Save encoders info
        encoders_info = {
            'target_encoder': {
                'classes': le_target.classes_.tolist(),
                'n_classes': len(le_target.classes_)
            },
            'feature_encoders': {k: v.classes_.tolist() for k, v in feature_encoders.items()}
        }
        
        import json
        encoder_path = self.output_dir / "encoders_info.json"
        with open(encoder_path, 'w') as f:
            json.dump(encoders_info, f, indent=2)
        print(f"✅ Encoder info saved: {encoder_path}")
        
        return {
            'X': X_encoded,
            'y': y_encoded,
            'y_names': y,
            'target_encoder': le_target,
            'feature_encoders': feature_encoders,
            'feature_names': X.columns.tolist()
        }


if __name__ == "__main__":
    processed_dir = Path(__file__).parent.parent / "data" / "processed"
    
    engineer = FeatureEngineer(str(processed_dir))
    ml_data = engineer.create_ml_ready_dataset()
    
    if ml_data:
        print("\n" + "="*80)
        print(f"📊 ML Dataset Ready!")
        print(f"   Features: {len(ml_data['feature_names'])}")
        print(f"   Samples: {len(ml_data['y'])}")
        print(f"   Crop classes: {ml_data['target_encoder'].classes_}")
        print("="*80 + "\n")
