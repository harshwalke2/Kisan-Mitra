"""
Dataset Profiler - Scan and analyze all agricultural datasets
Generates data_profile_report.json with structure, quality, and feature analysis
"""

import os
import json
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Any

class DatasetProfiler:
    """Analyze and profile CSV datasets for ML readiness"""
    
    def __init__(self, data_dir: str):
        self.data_dir = Path(data_dir)
        self.profiles = {}
        self.quality_report = {}
        
    def scan_datasets(self) -> Dict[str, Any]:
        """Scan all CSV files and generate profiles"""
        csv_files = list(self.data_dir.glob("*.csv"))
        
        print(f"\n📊 Scanning {len(csv_files)} datasets...")
        
        for csv_file in sorted(csv_files):
            try:
                profile = self._profile_dataset(csv_file)
                self.profiles[csv_file.stem] = profile
                print(f"  ✓ {csv_file.name}: {profile['shape'][0]} rows × {profile['shape'][1]} cols")
            except Exception as e:
                print(f"  ✗ {csv_file.name}: {str(e)}")
        
        return self.profiles
    
    def _profile_dataset(self, filepath: Path) -> Dict[str, Any]:
        """Generate comprehensive profile for single dataset"""
        df = pd.read_csv(filepath)
        
        # Basic info
        profile = {
            "filename": filepath.name,
            "shape": list(df.shape),
            "columns": df.columns.tolist(),
            "column_info": {},
            "missing_values": {},
            "data_types": {},
            "numeric_stats": {},
            "categorical_stats": {},
            "potential_targets": [],
            "quality_score": 0.0,
            "usable_features": []
        }
        
        # Detailed column analysis
        for col in df.columns:
            col_lower = col.lower()
            dtype = str(df[col].dtype)
            missing_pct = (df[col].isna().sum() / len(df)) * 100
            unique_count = df[col].nunique()
            
            profile["data_types"][col] = dtype
            profile["missing_values"][col] = f"{missing_pct:.1f}%"
            
            profile["column_info"][col] = {
                "type": dtype,
                "missing_pct": missing_pct,
                "unique_values": unique_count,
                "cardinality": f"{(unique_count/len(df))*100:.1f}%"
            }
            
            # Numeric analysis
            if pd.api.types.is_numeric_dtype(df[col]):
                profile["numeric_stats"][col] = {
                    "mean": float(df[col].mean()) if not df[col].isna().all() else None,
                    "std": float(df[col].std()) if not df[col].isna().all() else None,
                    "min": float(df[col].min()),
                    "max": float(df[col].max()),
                    "median": float(df[col].median())
                }
                
                # Add to usable features if <20% missing
                if missing_pct < 20:
                    profile["usable_features"].append(col)
            
            # Categorical analysis
            else:
                profile["categorical_stats"][col] = {
                    "unique_values": int(unique_count),
                    "top_value": str(df[col].mode()[0]) if df[col].mode().shape[0] > 0 else None,
                    "top_value_frequency": int(df[col].value_counts().iloc[0]) if df[col].value_counts().shape[0] > 0 else 0
                }
                
                # Add to usable features if <20% missing and <100 unique
                if missing_pct < 20 and unique_count < 100:
                    profile["usable_features"].append(col)
            
            # Identify target variables
            if col_lower in ['crop', 'target', 'yield', 'price']:
                profile["potential_targets"].append({
                    "column": col,
                    "type": "classification" if unique_count < 30 else "regression",
                    "unique_values": unique_count
                })
        
        # Calculate quality score
        total_cols = len(df.columns)
        usable_cols = len(profile["usable_features"])
        avg_missing = np.mean([float(v.strip('%')) for v in profile["missing_values"].values()])
        
        profile["quality_score"] = (usable_cols / total_cols) * (1 - avg_missing/100)
        
        return profile
    
    def generate_summary(self, output_file: str = None):
        """Generate and save summary report"""
        summary = {
            "scan_date": pd.Timestamp.now().isoformat(),
            "total_datasets": len(self.profiles),
            "datasets": self.profiles,
            "recommendations": self._generate_recommendations()
        }
        
        # Pretty print
        print("\n" + "="*80)
        print("📋 DATASET PROFILING SUMMARY")
        print("="*80)
        
        for dataset_name, profile in self.profiles.items():
            print(f"\n📊 {dataset_name}")
            print(f"   Shape: {profile['shape'][0]} rows × {profile['shape'][1]} cols")
            print(f"   Quality Score: {profile['quality_score']:.2%}")
            print(f"   Usable Features: {len(profile['usable_features'])}/{len(profile['columns'])}")
            
            if profile['potential_targets']:
                print(f"   Potential Targets:")
                for target in profile['potential_targets']:
                    print(f"     - {target['column']} ({target['type']}, {target['unique_values']} unique)")
            
            # Show columns with high missing values
            high_missing = {col: val for col, val in profile['missing_values'].items() 
                          if float(val.strip('%')) > 20}
            if high_missing:
                print(f"   ⚠️  High Missing Values:")
                for col, val in high_missing.items():
                    print(f"     - {col}: {val}")
        
        print("\n" + "="*80)
        
        # Save JSON report
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, ensure_ascii=False)
            print(f"✅ Report saved to: {output_file}")
        
        return summary
    
    def _generate_recommendations(self) -> List[str]:
        """Generate ML recommendations based on profiles"""
        recommendations = []
        
        for dataset_name, profile in self.profiles.items():
            if profile["quality_score"] < 0.5:
                recommendations.append(f"{dataset_name}: Low quality score - extensive cleaning needed")
            
            if profile["potential_targets"]:
                target = profile["potential_targets"][0]
                if target["type"] == "classification":
                    recommendations.append(
                        f"{dataset_name}: Suitable for crop classification with {target['unique_values']} classes"
                    )
                else:
                    recommendations.append(
                        f"{dataset_name}: Suitable for yield/price regression prediction"
                    )
        
        if not recommendations:
            recommendations.append("All datasets require data cleaning before ML training")
        
        return recommendations


def main():
    """Run dataset profiling"""
    data_dir = Path(__file__).parent.parent / "data" / "kaggel"
    
    profiler = DatasetProfiler(str(data_dir))
    profiles = profiler.scan_datasets()
    
    output_file = Path(__file__).parent.parent / "data" / "data_profile_report.json"
    profiler.generate_summary(str(output_file))
    
    return profiles


if __name__ == "__main__":
    main()
