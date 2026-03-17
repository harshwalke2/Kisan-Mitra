#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Test the updated error message"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from app import app
import os

print("=" * 70)
print("TESTING UPDATED ERROR MESSAGE")
print("=" * 70)
print()

# Check API keys
print("API Key Status:")
print(f"  DATA_GOV_IN_API_KEY: {os.environ.get('DATA_GOV_IN_API_KEY', 'NOT SET')}")
print(f"  AGMARKET_API_KEY: {os.environ.get('AGMARKET_API_KEY', 'NOT SET')}")
print()

client = app.test_client()

# Test 1: API only endpoint with Rice
print("Test 1: /api/agmarket/live?commodity=Rice")
print("-" * 70)
resp1 = client.get("/api/agmarket/live?commodity=Rice&source=api")
data1 = resp1.get_json()

print(f"Status: {data1.get('status')}")
print(f"Live: {data1.get('live')}")
print(f"Message: {data1.get('message')}")
print(f"Records: {len(data1.get('records', []))}")
print(f"Source: {data1.get('source')}")
print()

# Test 2: Try with a different commodity
print("Test 2: /api/agmarket/live?commodity=Wheat")
print("-" * 70)
resp2 = client.get("/api/agmarket/live?commodity=Wheat&source=api")
data2 = resp2.get_json()

print(f"Status: {data2.get('status')}")
print(f"Live: {data2.get('live')}")
print(f"Message: {data2.get('message')}")
print(f"Records: {len(data2.get('records', []))}")
print()

# Test 3: Check if it shows the new error message format
print("Test 3: Verify error message format")
print("-" * 70)
if data1.get('message') == "live price unavailable":
    print("[OK] Error message updated successfully!")
    print(f"  Showing: '{data1.get('message')}'")
else:
    print("[ERROR] Message not updated")
    print(f"  Actual: '{data1.get('message')}'")
    print(f"  Expected: 'live price unavailable'")

print()
print("=" * 70)
