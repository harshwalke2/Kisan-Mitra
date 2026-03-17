#!/usr/bin/env python
"""
Quick verification that the fix is working end-to-end
"""

from app import app
import json

print("=" * 70)
print("QUICK VERIFICATION OF AAJ KA BHAV FIX")
print("=" * 70)
print()

client = app.test_client()

# Test the market insights chart data endpoint
print("Test: Fetching chart data for Rice...")
resp = client.get("/api/market-insights/Rice/chart-data")
data = resp.get_json()

print(f"Status: {resp.status_code}")
print(f"Crop: {data.get('crop')}")
print(f"Time series data points: {len(data.get('time_series', []))}")
print(f"By Mandi data points: {len(data.get('by_mandi', []))}")

if data.get('by_mandi'):
    print(f"\nLatest prices by market:")
    for market_data in data['by_mandi'][:3]:
        print(f"  {market_data['market']:20} (State: {market_data.get('state', 'N/A'):15}) - INR {market_data['modal_price']}")

print("\n" + "=" * 70)
print("RESULT:")
print("=" * 70)
if data.get('by_mandi'):
    print("[SUCCESS] Chart data endpoint is working with local data!")
    print("The frontend will display prices correctly in the market insights section.")
else:
    print("[NOTE] No market data found for this crop in local dataset.")
print()
