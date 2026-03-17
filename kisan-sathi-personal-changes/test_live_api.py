#!/usr/bin/env python
"""
Test script to diagnose the data.gov.in API integration issue
"""

import sys
import os
import json
import urllib.request
import urllib.parse
from datetime import datetime

print("=" * 70)
print("DIAGNOSING LIVE PRICE API ISSUES")
print("=" * 70)
print()

# Check environment variables
print("1. CHECKING ENVIRONMENT VARIABLES")
print("-" * 70)
api_key = os.environ.get("DATA_GOV_IN_API_KEY", "").strip() or os.environ.get("AGMARKET_API_KEY", "").strip()
print(f"   DATA_GOV_IN_API_KEY: {'<SET>' if api_key else '<NOT SET>'}")
print(f"   AGMARKET_API_KEY: {'<SET>' if api_key else '<NOT SET>'}")
print()

if not api_key:
    print("   ⚠️  NO API KEY CONFIGURED!")
    print("   This is the PRIMARY reason why live prices are not being fetched.")
    print("   You need to set one of these environment variables.")
    print()

# Test resource IDs
print("2. TESTING RESOURCE IDs")
print("-" * 70)
resources = [
    "variety-wise-daily-market-prices-data-commodity",
    "9ef84268-d588-465a-a308-a864a43d0070",
]

for res_id in resources:
    print(f"   Resource: {res_id}")
    
# Test URL construction
print()
print("3. TESTING URL CONSTRUCTION")
print("-" * 70)
commodity = "Rice"
filter_val = urllib.parse.quote(commodity.strip())

dummy_key = "TEST_KEY_12345"
url = (
    f"https://api.data.gov.in/resource/{resources[0]}"
    f"?api-key={dummy_key}"
    f"&format=json&limit=100&offset=0"
    f"&filters[commodity]={filter_val}"
)
print(f"   Example URL: {url[:100]}...")
print()

# Try actual API call if key exists
if api_key:
    print("4. TESTING ACTUAL API CALL")
    print("-" * 70)
    url_actual = (
        f"https://api.data.gov.in/resource/{resources[0]}"
        f"?api-key={api_key}"
        f"&format=json&limit=10&offset=0"
        f"&filters[commodity]={filter_val}"
    )
    
    try:
        req = urllib.request.Request(url_actual, headers={"User-Agent": "KisanSathi/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            
        status = data.get("status")
        records = data.get("records", [])
        
        print(f"   Status: {status}")
        print(f"   Records found: {len(records)}")
        
        if records:
            print(f"   Sample record: {json.dumps(records[0], indent=6)[:200]}...")
        else:
            print(f"   API returned empty records list")
            print(f"   Response: {json.dumps(data, indent=6)[:500]}")
            
    except Exception as e:
        print(f"   ❌ API Call Failed: {type(e).__name__}")
        print(f"   Error: {str(e)[:200]}")
else:
    print("4. SKIPPING ACTUAL API CALL (no API key)")
    print()

# Summary
print()
print("=" * 70)
print("DIAGNOSIS SUMMARY")
print("=" * 70)

if not api_key:
    print("""
❌ PRIMARY ISSUE: No API key configured

SOLUTION:
1. Get an API key from https://data.gov.in/
   OR
2. Set environment variables before running:
   
   Windows (PowerShell):
   $env:DATA_GOV_IN_API_KEY='your-api-key-here'
   python app.py
   
   Windows (CMD):
   set DATA_GOV_IN_API_KEY=your-api-key-here
   python app.py
   
   Linux/Mac:
   export DATA_GOV_IN_API_KEY='your-api-key-here'
   python app.py
""")
else:
    print("""
✅ API key is configured
⭐ Testing actual API connectivity now...
""")

print("=" * 70)
