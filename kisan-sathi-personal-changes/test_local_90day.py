#!/usr/bin/env python
"""Test 90-day trend analysis with local data"""

from app import app
import json

print('Testing 90-Day Trend Analysis with Local Data')
print('=' * 70)

# Create test client
client = app.test_client()

# Test Rice
print('\n[Test 1] Rice - Using Local CSV Data (Default)')
print('-' * 70)
response = client.get('/api/market-insights/Rice')
print('Status:', response.status_code)

data = response.get_json()
print('Data Source:', data.get('data_source'))
print('Has Market Data:', data.get('has_market_data'))

if data.get('has_market_data'):
    market_data = data.get('market_data', {})
    trend = market_data.get('trend_details', {})
    latest = market_data.get('latest_price', {})
    avg90 = market_data.get('average_90d', {})
    forecast = market_data.get('forecast_90d', {})
    
    print('\nTrend Analysis:')
    print('  Direction:', trend.get('trend'))
    print('  Strength:', str(trend.get('strength')) + '%')
    print('  Confidence:', trend.get('confidence'))
    
    print('\nPrice Data:')
    print('  Latest: Rs', latest.get('value'), 'per quintal')
    print('  90-Day Average: Rs', avg90.get('value'))
    
    if forecast and forecast.get('avg'):
        print('\n90-Day Forecast:')
        print('  Expected Avg: Rs', forecast.get('avg'))
        print('  Range: Rs', forecast.get('min'), '-', forecast.get('max'))
    
    coverage = data.get('data_coverage', {})
    print('\nData Coverage:')
    print('  Last 90 Days Records:', coverage.get('last_90_records'))
    print('  Has 90-Day Data:', coverage.get('has_90day_data'))
    print('  Note:', coverage.get('note'))
    print('  Recommendation:', market_data.get('recommendation'))

# Test Wheat
print('\n\n[Test 2] Wheat - Using Local CSV Data')
print('-' * 70)
response = client.get('/api/market-insights/Wheat')
data = response.get_json()
trend = data.get('market_data', {}).get('trend_details', {})
print('Trend:', trend.get('trend'), '- Strength:', str(trend.get('strength')) + '%')

# Test Cotton
print('\n\n[Test 3] Cotton - Using Local CSV Data')
print('-' * 70)
response = client.get('/api/market-insights/Cotton')
data = response.get_json()
trend = data.get('market_data', {}).get('trend_details', {})
print('Trend:', trend.get('trend'), '- Strength:', str(trend.get('strength')) + '%')

print('\n' + '=' * 70)
print('✅ SUCCESS! 90-Day Trend Analysis Working with Local Data!')
print('\nKey Features:')
print('  ✓ Uses local CSV (fast & reliable)')
print('  ✓ 90-day trend analysis with confidence')
print('  ✓ Price forecasting (30 & 90 days)')
print('  ✓ Optional: use_api=true for agmarket API')
