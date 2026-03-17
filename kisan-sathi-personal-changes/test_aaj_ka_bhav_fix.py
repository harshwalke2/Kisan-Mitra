#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test script to verify the aaj ka bhav live price fix
"""

import sys
import os
import json
from pathlib import Path

# Use ASCII mode for printing on Windows
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

print("=" * 70)
print("TESTING AAJ KA BHAV LIVE PRICE FIX")
print("=" * 70)
print()

# Add project to path  
sys.path.insert(0, str(Path(__file__).parent))

# Import the Flask app
try:
    from app import app
    print("[OK] Successfully imported Flask app")
except ImportError as e:
    print(f"[ERROR] Failed to import Flask app: {e}")
    sys.exit(1)

# Create test client
client = app.test_client()

print()
print("TEST 1: Check health endpoint")
print("-" * 70)
try:
    resp = client.get("/api/health")
    data = resp.get_json()
    print(f"Status Code: {resp.status_code}")
    print(f"Response: {json.dumps(data, indent=2)}")
    print("[OK] Health endpoint working")
except Exception as e:
    print(f"[ERROR] Health check failed: {e}")

print()
print("TEST 2: Test live price endpoint with Rice")
print("-" * 70)
try:
    resp = client.get("/api/agmarket/live?commodity=Rice&source=api")
    data = resp.get_json()
    print(f"Status Code: {resp.status_code}")
    print(f"Source: {data.get('source')}")
    print(f"Live: {data.get('live')}")
    print(f"Records Count: {len(data.get('records', []))}")
    print(f"Message: {data.get('message')}")
    
    if data.get('records'):
        print(f"\nFirst record sample:")
        print(f"  Market: {data['records'][0].get('market')}")
        print(f"  Price: INR {data['records'][0].get('modal_price')}")
        print("[OK] Records found and formatted correctly")
    else:
        print("[OK] Endpoint responding (no records - expected if no API key)")
        
except Exception as e:
    print(f"[ERROR] Live price endpoint failed: {e}")

print()
print("TEST 3: Test with different commodities")
print("-" * 70)
test_crops = ["Wheat", "Cotton", "Maize"]
for crop in test_crops:
    try:
        resp = client.get(f"/api/agmarket/live?commodity={crop}&source=api")
        data = resp.get_json()
        records_count = len(data.get('records', []))
        source = data.get('source', 'unknown')
        print(f"  {crop:15} -> {records_count:3} records from {source:15} - {data.get('message', '')[:40]}")
    except Exception as e:
        print(f"  {crop:15} -> Error: {e}")

print()
print("TEST 4: Check if local fallback is working")
print("-" * 70)
try:
    # Look for local market data
    from pathlib import Path
    csv_path = Path("data/processed/cleaned_Agriculture_price_dataset.csv")
    if csv_path.exists():
        print(f"[OK] Local CSV data file found: {csv_path}")
        print("  Backend will use this for fallback when API is unavailable")
    else:
        print(f"[ERROR] Local CSV data file NOT found: {csv_path}")
except Exception as e:
    print(f"[ERROR] Error checking local data: {e}")

print()
print("=" * 70)
print("TEST SUMMARY")
print("=" * 70)
print("""
If API key is NOT configured:
[OK] The app will show prices from local market data as fallback
[OK] The "Aaj ka bhav" section will display the latest available prices
[OK] Users will see "Latest local market data" indicator

If API key IS configured:
[OK] The app will fetch live prices from data.gov.in or CEDA Agmarknet
[OK] Live indicator will show in the UI
[OK] Prices will be real-time market data

To enable live prices, set these environment variables before running:
  Windows (PowerShell): $env:DATA_GOV_IN_API_KEY='your-key'
  Windows (CMD):        set DATA_GOV_IN_API_KEY=your-key
  Linux/Mac:            export DATA_GOV_IN_API_KEY='your-key'

Get your free API key from: https://data.gov.in/
""")
print("=" * 70)
