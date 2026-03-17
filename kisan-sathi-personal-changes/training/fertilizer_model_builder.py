"""
Fertilizer Recommendation Model Builder
Trains ML model to recommend optimal fertilizers based on soil, crop, and environmental conditions
"""

import pandas as pd
import numpy as np
from pathlib import Path
import joblib
import json
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, accuracy_score, f1_score
import warnings
warnings.filterwarnings('ignore')

class FertilizerModelBuilder:
    """Build and train fertilizer recommendation model"""
    
    def __init__(self, data_dir: str, models_dir: str):
        self.data_dir = Path(data_dir)
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True)
        
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.fertilizer_classifier = None
        
    def load_and_merge_datasets(self):
        """Load all three fertilizer datasets and merge them intelligently"""
        print("📂 Loading Fertilizer Datasets...")
        
        # Dataset 1: Crop and fertilizer dataset (District-based)
        df1 = pd.read_csv(self.data_dir / "Crop and fertilizer dataset.csv")
        print(f"   ✓ Dataset 1 (District-based): {len(df1)} records")
        
        # Dataset 2: Crop recommendation (already exists)
        df2_path = self.data_dir / "Crop_recommendation.csv"
        if df2_path.exists():
            df2 = pd.read_csv(df2_path)
            print(f"   ✓ Dataset 2 (Crop recommendation): {len(df2)} records")
        else:
            df2 = None
            print("   ⚠ Dataset 2 not found, skipping")
        
        # Dataset 3: Comprehensive fertilizer recommendation
        df3 = pd.read_csv(self.data_dir / "fertilizer_recommendation.csv")
        print(f"   ✓ Dataset 3 (Comprehensive): {len(df3)} records")
        
        return df1, df2, df3
    
    def prepare_training_data(self, df1, df2, df3):
        """Prepare unified training dataset from multiple sources"""
        print("\n🔧 Preparing Unified Training Data...")
        
        # Process Dataset 1 (District-based)
        df1_processed = df1.copy()
        df1_processed = df1_processed.rename(columns={
            'Nitrogen': 'N',
            'Phosphorus': 'P',
            'Potassium': 'K',
            'pH': 'ph',
            'Rainfall': 'rainfall',
            'Temperature': 'temperature',
            'Crop': 'crop',
            'Fertilizer': 'fertilizer'
        })
        df1_processed['humidity'] = 70  # Default assumption
        df1_processed['source'] = 'district_data'
        
        # Process Dataset 3 (Comprehensive)
        df3_processed = df3.copy()
        df3_processed = df3_processed.rename(columns={
            'Nitrogen_Level': 'N',
            'Phosphorus_Level': 'P',
            'Potassium_Level': 'K',
            'Soil_pH': 'ph',
            'Humidity': 'humidity',
            'Rainfall': 'rainfall',
            'Temperature': 'temperature',
            'Crop_Type': 'crop',
            'Recommended_Fertilizer': 'fertilizer',
            'Season': 'season',
            'Soil_Type': 'soil_type'
        })
        df3_processed['source'] = 'comprehensive_data'
        
        # Select common columns
        common_cols = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall', 'crop', 'fertilizer']
        
        df1_final = df1_processed[common_cols].copy()
        df3_final = df3_processed[common_cols].copy()
        
        # Merge datasets
        combined_df = pd.concat([df1_final, df3_final], ignore_index=True)
        
        # Clean data
        combined_df.dropna(subset=['fertilizer'], inplace=True)
        combined_df = combined_df[combined_df['fertilizer'].str.strip() != '']
        
        # Normalize crop and fertilizer names
        combined_df['crop'] = combined_df['crop'].str.strip().str.title()
        combined_df['fertilizer'] = combined_df['fertilizer'].str.strip().str.title()
        
        # Remove outliers
        for col in ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']:
            Q1 = combined_df[col].quantile(0.01)
            Q3 = combined_df[col].quantile(0.99)
            IQR = Q3 - Q1
            combined_df = combined_df[
                (combined_df[col] >= Q1 - 1.5 * IQR) & 
                (combined_df[col] <= Q3 + 1.5 * IQR)
            ]
        
        print(f"   ✓ Combined dataset: {len(combined_df)} records")
        print(f"   ✓ Unique crops: {combined_df['crop'].nunique()}")
        print(f"   ✓ Unique fertilizers: {combined_df['fertilizer'].nunique()}")
        
        # Show fertilizer distribution
        print("\n   Top 10 Fertilizers:")
        for fert, count in combined_df['fertilizer'].value_counts().head(10).items():
            print(f"     - {fert}: {count} records")
        
        return combined_df
    
    def engineer_features(self, df):
        """Create advanced features for better predictions"""
        print("\n🧪 Engineering Features...")
        
        df = df.copy()
        
        # NPK ratios and scores
        df['npk_sum'] = df['N'] + df['P'] + df['K']
        df['npk_balance'] = df[['N', 'P', 'K']].std(axis=1)
        df['n_to_p_ratio'] = df['N'] / (df['P'] + 1)
        df['p_to_k_ratio'] = df['P'] / (df['K'] + 1)
        df['n_to_k_ratio'] = df['N'] / (df['K'] + 1)
        
        # Soil condition indicators
        df['ph_acidic'] = (df['ph'] < 6.5).astype(int)
        df['ph_alkaline'] = (df['ph'] > 7.5).astype(int)
        df['ph_neutral'] = ((df['ph'] >= 6.5) & (df['ph'] <= 7.5)).astype(int)
        
        # Climate features
        df['temp_category'] = pd.cut(df['temperature'], bins=[0, 15, 25, 35, 50], labels=['cold', 'moderate', 'warm', 'hot'])
        df['rainfall_category'] = pd.cut(df['rainfall'], bins=[0, 500, 1000, 1500, 5000], labels=['low', 'medium', 'high', 'very_high'])
        df['humidity_category'] = pd.cut(df['humidity'], bins=[0, 40, 60, 80, 100], labels=['low', 'moderate', 'high', 'very_high'])
        
        # Nutrient deficiency indicators
        df['n_deficient'] = (df['N'] < 40).astype(int)
        df['p_deficient'] = (df['P'] < 30).astype(int)
        df['k_deficient'] = (df['K'] < 40).astype(int)
        
        # Encode categorical features
        for col in ['temp_category', 'rainfall_category', 'humidity_category']:
            if col not in self.label_encoders:
                self.label_encoders[col] = LabelEncoder()
                df[col] = self.label_encoders[col].fit_transform(df[col].astype(str))
            else:
                df[col] = self.label_encoders[col].transform(df[col].astype(str))
        
        # Encode crop names
        if 'crop_encoder' not in self.label_encoders:
            self.label_encoders['crop_encoder'] = LabelEncoder()
            df['crop_encoded'] = self.label_encoders['crop_encoder'].fit_transform(df['crop'])
        else:
            df['crop_encoded'] = self.label_encoders['crop_encoder'].transform(df['crop'])
        
        print(f"   ✓ Feature engineering complete")
        print(f"   ✓ Total features: {len([col for col in df.columns if col not in ['crop', 'fertilizer']])}")
        
        return df
    
    def train_fertilizer_model(self, df):
        """Train Random Forest classifier for fertilizer recommendation"""
        print("\n🌳 Training Fertilizer Recommendation Model...")
        
        # Prepare features and target
        feature_cols = [col for col in df.columns if col not in ['crop', 'fertilizer']]
        X = df[feature_cols]
        y = df['fertilizer']
        
        # Encode target
        if 'fertilizer_encoder' not in self.label_encoders:
            self.label_encoders['fertilizer_encoder'] = LabelEncoder()
            y_encoded = self.label_encoders['fertilizer_encoder'].fit_transform(y)
        else:
            y_encoded = self.label_encoders['fertilizer_encoder'].transform(y)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        print(f"   ✓ Training samples: {len(X_train)}")
        print(f"   ✓ Testing samples: {len(X_test)}")
        print(f"   ✓ Features: {len(feature_cols)}")
        
        # Train model
        self.fertilizer_classifier = RandomForestClassifier(
            n_estimators=150,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
            class_weight='balanced'
        )
        
        self.fertilizer_classifier.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_train_pred = self.fertilizer_classifier.predict(X_train_scaled)
        y_test_pred = self.fertilizer_classifier.predict(X_test_scaled)
        
        train_acc = accuracy_score(y_train, y_train_pred)
        test_acc = accuracy_score(y_test, y_test_pred)
        test_f1 = f1_score(y_test, y_test_pred, average='weighted')
        
        # Cross-validation
        cv_scores = cross_val_score(
            self.fertilizer_classifier, X_train_scaled, y_train, 
            cv=5, scoring='accuracy', n_jobs=-1
        )
        
        print(f"\n   📊 Model Performance:")
        print(f"   ✓ Training Accuracy: {train_acc:.4f}")
        print(f"   ✓ Testing Accuracy: {test_acc:.4f}")
        print(f"   ✓ F1-Score (weighted): {test_f1:.4f}")
        print(f"   ✓ Cross-Validation: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': feature_cols,
            'importance': self.fertilizer_classifier.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print(f"\n   🔍 Top 10 Important Features:")
        for idx, row in feature_importance.head(10).iterrows():
            print(f"     {row['feature']}: {row['importance']:.4f}")
        
        return X_train_scaled, X_test_scaled, y_train, y_test, feature_cols
    
    def save_model_artifacts(self, feature_cols):
        """Save trained model and preprocessing artifacts"""
        print("\n💾 Saving Model Artifacts...")
        
        # Save model
        model_path = self.models_dir / "fertilizer_classifier.pkl"
        joblib.dump(self.fertilizer_classifier, model_path)
        print(f"   ✓ Model saved: {model_path}")
        
        # Save scaler
        scaler_path = self.models_dir / "fertilizer_scaler.pkl"
        joblib.dump(self.scaler, scaler_path)
        print(f"   ✓ Scaler saved: {scaler_path}")
        
        # Save encoders
        encoders_info = {
            'feature_cols': feature_cols,
            'fertilizers': self.label_encoders['fertilizer_encoder'].classes_.tolist(),
            'crops': self.label_encoders['crop_encoder'].classes_.tolist(),
            'temp_categories': self.label_encoders['temp_category'].classes_.tolist(),
            'rainfall_categories': self.label_encoders['rainfall_category'].classes_.tolist(),
            'humidity_categories': self.label_encoders['humidity_category'].classes_.tolist()
        }
        
        encoders_path = self.models_dir / "fertilizer_encoders.json"
        with open(encoders_path, 'w') as f:
            json.dump(encoders_info, f, indent=2)
        print(f"   ✓ Encoders info saved: {encoders_path}")
        
        # Save label encoders as pickle
        label_encoders_path = self.models_dir / "fertilizer_label_encoders.pkl"
        joblib.dump(self.label_encoders, label_encoders_path)
        print(f"   ✓ Label encoders saved: {label_encoders_path}")
        
        print(f"\n✅ All artifacts saved successfully!")
        return encoders_info

def main():
    """Main execution function"""
    print("=" * 70)
    print("🌾 FERTILIZER RECOMMENDATION MODEL TRAINING")
    print("=" * 70)
    
    # Paths
    data_dir = Path(__file__).parent.parent / "data"
    models_dir = Path(__file__).parent.parent / "data" / "models"
    
    # Initialize builder
    builder = FertilizerModelBuilder(data_dir, models_dir)
    
    # Load datasets
    df1, df2, df3 = builder.load_and_merge_datasets()
    
    # Prepare training data
    combined_df = builder.prepare_training_data(df1, df2, df3)
    
    # Engineer features
    df_engineered = builder.engineer_features(combined_df)
    
    # Train model
    X_train, X_test, y_train, y_test, feature_cols = builder.train_fertilizer_model(df_engineered)
    
    # Save artifacts
    encoders_info = builder.save_model_artifacts(feature_cols)
    
    print("\n" + "=" * 70)
    print("🎉 FERTILIZER MODEL TRAINING COMPLETE!")
    print("=" * 70)
    print(f"\n📊 Model Summary:")
    print(f"   - Total fertilizers: {len(encoders_info['fertilizers'])}")
    print(f"   - Supported crops: {len(encoders_info['crops'])}")
    print(f"   - Features used: {len(feature_cols)}")
    print(f"\n🚀 Model ready for deployment!")

if __name__ == "__main__":
    main()
