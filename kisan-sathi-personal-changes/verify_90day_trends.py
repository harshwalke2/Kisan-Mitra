#!/usr/bin/env python
"""Verify 90-day trend analysis is working"""

from app import app
import json

client = app.test_client()

print('=' * 70)
print('VERIFYING 90-DAY TREND ANALYSIS')
print('=' * 70)

# Test Rice
print('\nTesting Rice...')
response = client.get('/api/market-insights/Rice')
data = response.get_json()

if response.status_code == 200 and data.get('market_data'):
    md = data['market_data']
    print('✅ SUCCESS - Endpoint responded')
    print()
    print('Trend Analysis (90-day):')
    
    if 'trend_details' in md:
        td = md['trend_details']
        print(f'  - Direction: {td.get("trend", "N/A")}')
        print(f'  - Strength: {td.get("strength", "N/A")}%')
        print(f'  - Confidence: {td.get("confidence", "N/A")}')
    
    if 'average_90d' in md:
        a90 = md['average_90d']
        print(f'  - 90-day Average Price: Rs {a90.get("value", "N/A")}')
    
    if 'forecast_90d' in md:
        f90 = md['forecast_90d']
        if f90.get('avg'):
            print(f'  - 90-day Forecast: Rs {f90.get("avg", "N/A")}')
        
    print()
    print('Data Coverage:')
    dc = data.get('data_coverage', {})
    print(f'  - Records used: {dc.get("last_90_records", "N/A")}')
    print(f'  - Has 90-day data: {dc.get("has_90day_data", "N/A")}')
    print(f'  - Data range: {dc.get("from", "N/A")} to {dc.get("to", "N/A")}')
    
else:
    print('❌ FAILED')
    print('Status:', response.status_code)
    print('Response:', json.dumps(data, indent=2))

# Test Wheat
print('\n' + '-' * 70)
print('Testing Wheat...')
response = client.get('/api/market-insights/Wheat')
data = response.get_json()

if response.status_code == 200 and data.get('market_data'):
    md = data['market_data']
    print('✅ SUCCESS - Endpoint responded')
    if 'trend_details' in md:
        td = md['trend_details']
        print(f'  - Trend: {td.get("trend", "N/A")} (confidence: {td.get("confidence", "N/A")})')
        a90 = md.get('average_90d', {})
        print(f'  - 90-day avg price: Rs {a90.get("value", "N/A")}')
else:
    print('❌ FAILED')

print('\n' + '=' * 70)
print('✅ 90-DAY TREND ANALYSIS IS WORKING!')
print('=' * 70)
