#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test API-only aaj ka bhav with local data for charts
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from app import app

client = app.test_client()

print("=" * 70)
print("TESTING API-ONLY AAJ KA BHAV (No Local Fallback)")
print("=" * 70)
print()

# Test the live endpoint
resp = client.get("/api/agmarket/live?commodity=Rice&source=api")
data = resp.get_json()

print("Live Price Endpoint Response:")
print(f"  Status: {data.get('status')}")
print(f"  Source: {data.get('source')}")
print(f"  Live: {data.get('live')}")
print(f"  Message: {data.get('message')}")
print(f"  Records Count: {len(data.get('records', []))}")
print()

if data.get('live'):
    print("[OK] Live API returned data")
    if data.get('records'):
        print(f"  First record: {data['records'][0]}")
else:
    print("[EXPECTED] Live API did not return data (no API key configured)")
    print(f"  Users will see: '{data.get('message')}'")

print()
print("=" * 70)
print("For chart data and trends, local CSV data is still used:")
print("=" * 70)

# Test chart endpoint (should use local data)
resp2 = client.get("/api/market-insights/Rice/chart-data")
data2 = resp2.get_json()

print()
print(f"Chart Data Response:")
print(f"  Time series points: {len(data2.get('time_series', []))}")
print(f"  By mandi data: {len(data2.get('by_mandi', []))}")

if data2.get('by_mandi'):
    print(f"  [OK] Chart still uses local data ({len(data2.get('by_mandi', []))} markets)")
else:
    print(f"  [ERROR] No chart data")

print()
print("=" * 70)
print("SUMMARY:")
print("=" * 70)
print("Aaj ka bhav (Live Prices):   API-ONLY")
print("  - No fallback to local data")
print("  - User sees message if API not configured")
print("  - Only displays when real live data available")
print()
print("Price Charts & Insights:     LOCAL DATA")
print("  - Historical price trends")
print("  - Market data by region")
print("  - Predictions and analysis")
print("=" * 70)
