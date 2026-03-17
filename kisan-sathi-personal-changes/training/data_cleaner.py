"""
Data Cleaning & Normalization Pipeline
Handles missing values, duplicates, and standardizes all datasets
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Tuple
import warnings
warnings.filterwarnings('ignore')

class DataCleaner:
    """Clean and normalize agricultural datasets"""
    
    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)
        self.processed_dir = Path(data_dir).parent / "processed"
        self.processed_dir.mkdir(exist_ok=True)
        
        # Standard column mappings
        self.column_mappings = {
            'rainfall_mm|rainfall|rain': 'rainfall_mm',
            'temp|temperature|temp_c': 'temperature_c',
            'humidity|humid|hum': 'humidity_pct',
            'soil|soil_type': 'soil_type',
            'crop|target': 'crop',
            'yield|prod': 'yield_tonnes',
            'price|mandi_price': 'price',
            'n|nitrogen': 'nitrogen',
            'p|phosphorus': 'phosphorus',
            'k|potassium': 'potassium'
        }
        
        # Crop name standardization
        self.crop_mappings = {
            'rice': 'Rice', 'paddy': 'Rice',
            'wheat': 'Wheat',
            'sugarcane': 'Sugarcane',
            'cotton': 'Cotton',
            'corn': 'Maize', 'maize': 'Maize',
            'chickpea': 'Chickpea', 'chick pea': 'Chickpea',
            'gram': 'Chickpea',
            'sorghum': 'Sorghum', 'jowar': 'Sorghum',
            'groundnut': 'Groundnut', 'peanut': 'Groundnut',
            'sunflower': 'Sunflower',
            'mustard': 'Mustard',
            'onion': 'Onion',
            'tomato': 'Tomato',
            'potato': 'Potato',
            'soybean': 'Soybean'
        }
    
    def clean_crop_recommendation(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean Crop_recommendation.csv"""
        print("🔧 Cleaning Crop_recommendation dataset...")
        
        df = df.copy()
        df.columns = [col.lower().replace(' ', '_') for col in df.columns]
        
        # Remove duplicates
        df = df.drop_duplicates()
        
        # Handle missing values
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            df[col].fillna(df[col].median(), inplace=True)
        
        df.fillna(method='ffill', inplace=True)
        
        # Standardize crop names
        if 'crop_name' in df.columns or 'crop' in df.columns:
            crop_col = 'crop_name' if 'crop_name' in df.columns else 'crop'
            df[crop_col] = df[crop_col].str.lower().map(
                lambda x: self.crop_mappings.get(x, x.title())
            )
        
        print(f"   ✓ Shape: {df.shape}, Duplicates removed, Missing values handled")
        return df
    
    def clean_harvest_yield(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean yield-related datasets"""
        print("🔧 Cleaning Yield dataset...")
        
        df = df.copy()
        df.columns = [col.lower().replace(' ', '_') for col in df.columns]
        
        # Remove duplicates
        initial_rows = len(df)
        df = df.drop_duplicates()
        print(f"   ✓ Removed {initial_rows - len(df)} duplicates")
        
        # Handle missing values in numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            missing_pct = df[col].isna().sum() / len(df) * 100
            if missing_pct > 0:
                df[col].fillna(df[col].median(), inplace=True)
        
        # Standardize crop names
        for col in df.columns:
            if 'crop' in col.lower():
                df[col] = df[col].astype(str).str.lower().map(
                    lambda x: self.crop_mappings.get(x, x.title())
                )
        
        print(f"   ✓ Shape: {df.shape}, Numeric imputation complete")
        return df
    
    def clean_weather_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean rainfall and temperature datasets"""
        print("🔧 Cleaning Weather data...")
        
        df = df.copy()
        df.columns = [col.lower().replace(' ', '_') for col in df.columns]
        
        # Remove duplicates
        df = df.drop_duplicates()
        
        # Fill numeric missing values
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            df[col].fillna(df[col].median(), inplace=True)
        
        print(f"   ✓ Shape: {df.shape}, Weather data normalized")
        return df
    
    def clean_price_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean market price datasets"""
        print("🔧 Cleaning Price dataset...")
        
        df = df.copy()
        df.columns = [col.lower().replace(' ', '_') for col in df.columns]
        
        # Remove duplicates
        df = df.drop_duplicates()
        
        # Handle numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            df[col].fillna(df[col].median(), inplace=True)
        
        # Remove outliers (prices >5 std from mean)
        for col in numeric_cols:
            mean = df[col].mean()
            std = df[col].std()
            df = df[(df[col] >= mean - 5*std) & (df[col] <= mean + 5*std)]
        
        print(f"   ✓ Shape: {df.shape}, Outliers removed")
        return df
    
    def clean_all_datasets(self) -> Dict[str, pd.DataFrame]:
        """Clean all CSV files"""
        cleaned = {}
        
        # List of datasets and their cleaning methods
        datasets = {
            'Crop_recommendation.csv': self.clean_crop_recommendation,
            'yield.csv': self.clean_harvest_yield,
            'yield_df.csv': self.clean_harvest_yield,
            'rainfall.csv': self.clean_weather_data,
            'temp.csv': self.clean_weather_data,
            'daily-rainfall-at-state-level.csv': self.clean_weather_data,
            'Agriculture_price_dataset.csv': self.clean_price_data,
            'commodity_price.csv': self.clean_price_data,
            'ICRISAT-District Level Data.csv': self.clean_harvest_yield,
            'pesticides.csv': self.clean_price_data
        }
        
        print("\n" + "="*80)
        print("🧹 DATA CLEANING PIPELINE")
        print("="*80 + "\n")
        
        for filename, clean_func in datasets.items():
            filepath = self.data_dir / filename
            if filepath.exists():
                try:
                    df = pd.read_csv(filepath)
                    cleaned_df = clean_func(df)
                    cleaned[filename.replace('.csv', '')] = cleaned_df
                    
                    # Save cleaned version
                    output_path = self.processed_dir / f"cleaned_{filename}"
                    cleaned_df.to_csv(output_path, index=False)
                    
                except Exception as e:
                    print(f"   ✗ Error: {str(e)}")
        
        return cleaned


def main():
    """Run data cleaning pipeline"""
    data_dir = Path(__file__).parent.parent / "data" / "kaggel"
    
    cleaner = DataCleaner(str(data_dir))
    cleaned_dfs = cleaner.clean_all_datasets()
    
    print("\n" + "="*80)
    print("✅ Data Cleaning Complete!")
    print(f"   Processed {len(cleaned_dfs)} datasets")
    print(f"   Saved to: {cleaner.processed_dir}")
    print("="*80 + "\n")
    
    return cleaned_dfs


if __name__ == "__main__":
    main()
