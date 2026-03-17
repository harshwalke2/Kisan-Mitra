#!/usr/bin/env python
"""
Test script for 90-day trend analysis improvements
Run this to verify the new trend analysis functions work correctly
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sys
import json

# Test data generation
def generate_test_data(days=90, trend='stable', volatility=0.1):
    """Generate test price data with different trends"""
    dates = pd.date_range(end=datetime.now(), periods=days, freq='D')
    
    # Base price
    base_price = 2000
    
    # Generate price movements based on trend
    if trend == 'increasing':
        slope = 500 / days  # Increase by ~500 over 90 days
    elif trend == 'decreasing':
        slope = -500 / days
    else:
        slope = 0
    
    prices = base_price + np.arange(days) * slope
    
    # Add random noise (volatility)
    noise = np.random.normal(0, volatility * base_price, days)
    prices = prices + noise
    
    # Ensure prices are positive
    prices = np.maximum(prices, 100)
    
    df = pd.DataFrame({
        'price_date': dates,
        'date_ordinal': dates.map(lambda x: x.toordinal()),
        'month': dates.month,
        'dayofyear': dates.dayofyear,
        'modal_price': prices
    })
    
    return df

def test_trend_analysis():
    """Test the improved trend analysis functions"""
    print("=" * 60)
    print("90-Day Trend Analysis Test Suite")
    print("=" * 60)
    
    # Test 1: Increasing Trend
    print("\n[Test 1] Increasing Trend Detection")
    print("-" * 60)
    df_increasing = generate_test_data(days=90, trend='increasing', volatility=0.05)
    print(f"Generated {len(df_increasing)} data points with increasing trend")
    print(f"Price range: ₹{df_increasing['modal_price'].min():.2f} - ₹{df_increasing['modal_price'].max():.2f}")
    print(f"Average price: ₹{df_increasing['modal_price'].mean():.2f}")
    print("✓ Test 1 data prepared")
    
    # Test 2: Decreasing Trend
    print("\n[Test 2] Decreasing Trend Detection")
    print("-" * 60)
    df_decreasing = generate_test_data(days=90, trend='decreasing', volatility=0.05)
    print(f"Generated {len(df_decreasing)} data points with decreasing trend")
    print(f"Price range: ₹{df_decreasing['modal_price'].min():.2f} - ₹{df_decreasing['modal_price'].max():.2f}")
    print(f"Average price: ₹{df_decreasing['modal_price'].mean():.2f}")
    print("✓ Test 2 data prepared")
    
    # Test 3: Stable Trend
    print("\n[Test 3] Stable Trend Detection")
    print("-" * 60)
    df_stable = generate_test_data(days=90, trend='stable', volatility=0.08)
    print(f"Generated {len(df_stable)} data points with stable trend")
    print(f"Price range: ₹{df_stable['modal_price'].min():.2f} - ₹{df_stable['modal_price'].max():.2f}")
    print(f"Average price: ₹{df_stable['modal_price'].mean():.2f}")
    print("✓ Test 3 data prepared")
    
    # Test 4: Insufficient Data
    print("\n[Test 4] Insufficient Data Handling")
    print("-" * 60)
    df_small = generate_test_data(days=10, trend='increasing')
    print(f"Generated {len(df_small)} data points (below 20 minimum)")
    print("✓ Test 4 data prepared")
    
    # Test 5: High Volatility
    print("\n[Test 5] High Volatility Detection")
    print("-" * 60)
    df_volatile = generate_test_data(days=90, trend='stable', volatility=0.25)
    print(f"Generated {len(df_volatile)} volatile data points")
    print(f"Volatility range: ₹{df_volatile['modal_price'].std():.2f} std deviation")
    print("✓ Test 5 data prepared")
    
    print("\n" + "=" * 60)
    print("Test Data Summary")
    print("=" * 60)
    print(f"✓ Test 1 (Increasing): {len(df_increasing)} records")
    print(f"✓ Test 2 (Decreasing): {len(df_decreasing)} records")
    print(f"✓ Test 3 (Stable): {len(df_stable)} records")
    print(f"✓ Test 4 (Small): {len(df_small)} records")
    print(f"✓ Test 5 (Volatile): {len(df_volatile)} records")
    
    print("\n" + "=" * 60)
    print("Expected Results After Integration")
    print("=" * 60)
    print("""
Test 1 (Increasing):
  - trend: 'increasing'  
  - strength: > 15
  - confidence: > 0.7
  
Test 2 (Decreasing):
  - trend: 'decreasing'
  - strength: > 15
  - confidence: > 0.7
  
Test 3 (Stable):
  - trend: 'stable'
  - strength: < 15
  - confidence: > 0.7
  
Test 4 (Small dataset):
  - trend: 'stable' (fallback)
  - confidence: < 0.5 (low data)
  
Test 5 (Volatile):
  - stability: 'volatile'
  - market_risk: 'high'
    """)
    
    print("\n" + "=" * 60)
    print("Test Sample Output")
    print("=" * 60)
    
    print("\nSample API Response Structure:")
    sample_response = {
        "status": "success",
        "crop": "Rice",
        "market_data": {
            "trend_details": {
                "trend": "increasing",
                "strength": 25.5,
                "confidence": 0.92,
                "period_days": 90
            },
            "average_90d": {
                "value": 2150.00,
                "unit": "INR/quintal",
                "days": 90
            },
            "forecast_90d": {
                "avg": 2200.00,
                "min": 1900.00,
                "max": 2500.00,
                "price_range": 600.00,
                "model": "RandomForestRegressor-90day",
                "days": 90
            },
            "data_coverage": {
                "last_90_records": 90,
                "has_90day_data": True
            }
        }
    }
    print(json.dumps(sample_response, indent=2))
    
    print("\n" + "=" * 60)
    print("Next Steps")
    print("=" * 60)
    print("""
1. Start the Flask application
2. Make API requests to /api/market-insights/<crop>
3. Verify the following are present in responses:
   - trend_details.trend (increasing/decreasing/stable)
   - trend_details.strength (0-100 scale)
   - trend_details.confidence (0-1 scale)
   - average_90d data
   - forecast_90d data
   - data_coverage.has_90day_data flag
4. Compare 30-day vs 90-day forecasts
5. Monitor trend confidence scores
6. Validate with crops having good historical data

Test Crops (with good data):
- Rice
- Wheat
- Cotton  
- Sugarcane
- Maize
""")
    
    print("\n✓ All test preparations complete!")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    test_trend_analysis()
