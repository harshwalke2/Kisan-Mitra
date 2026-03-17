#!/usr/bin/env python
"""Debug script to check data loading"""

from app import market_prices, normalize_text
import pandas as pd

print('Debugging 90-Day Trend Analysis Data Loading')
print('=' * 70)

# Check if market_prices is loaded
print('\n[Check 1] Market Prices Data Status')
print('-' * 70)
print('market_prices is None:', market_prices is None)

if market_prices is None:
    print('ERROR: market_prices not loaded!')
    print('\nTrying to load directly...')
    
    from pathlib import Path
    PROCESSED_DATA_DIR = Path("data/processed")
    
    try:
        df = pd.read_csv(PROCESSED_DATA_DIR / "cleaned_Agriculture_price_dataset.csv", low_memory=False)
        print('Loaded directly: {} records'.format(len(df)))
        print('Columns:', list(df.columns))
        
        # Normalize
        df.columns = [col.strip().lower() for col in df.columns]
        df.rename(columns={"district_name": "district", "market_name": "market"}, inplace=True)
        df["commodity"] = df["commodity"].astype(str).str.strip().str.lower()
        
        print('\nAfter normalization:')
        print('Sample commodities:', df['commodity'].unique()[:10])
        print('Total records:', len(df))
        
        # Test filter for Rice
        rice = df[df['commodity'] == 'rice']
        print('Rice records:', len(rice))
        
        # Test filter with normalize_text
        crop_normalized = normalize_text('Rice')
        rice2 = df[df['commodity'] == crop_normalized]
        print('Rice records (with normalize_text):', len(rice2))
        
    except Exception as e:
        print('Error loading directly:', e)
        import traceback
        traceback.print_exc()

else:
    print('market_prices loaded: {} records'.format(len(market_prices)))
    print('Columns:', list(market_prices.columns)[:10])
    
    # Check commodities
    commodities = market_prices['commodity'].unique()
    print('Total unique commodities:', len(commodities))
    print('Sample commodities:', list(commodities)[:10])
    
    # Check if Rice exists
    rice_count = len(market_prices[market_prices['commodity'] == 'rice'])
    print('\nRice records:', rice_count)
    
    wheat_count = len(market_prices[market_prices['commodity'] == 'wheat'])
    print('Wheat records:', wheat_count)
    
    cotton_count = len(market_prices[market_prices['commodity'] == 'cotton'])
    print('Cotton records:', cotton_count)

print('\n' + '=' * 70)
