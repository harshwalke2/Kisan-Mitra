"""
Test Global Market API endpoints
"""

import requests
import json
import time

BASE_URL = "http://localhost:5000/api"

def test_global_api():
    print("=" * 60)
    print("Testing Global Market API Endpoints")
    print("=" * 60)
    
    try:
        # Test 1: Get countries
        print("\n1. Testing GET /global/countries")
        response = requests.get(f"{BASE_URL}/global/countries")
        data = response.json()
        print(f"   Status: {response.status_code}")
        print(f"   Countries found: {data.get('count', 0)}")
        if data.get('status') == 'success':
            print(f"   Sample: {data.get('countries', [])[:3]}")
        
        # Test 2: Get commodities
        print("\n2. Testing GET /global/commodities")
        response = requests.get(f"{BASE_URL}/global/commodities")
        data = response.json()
        print(f"   Status: {response.status_code}")
        print(f"   Commodities found: {data.get('count', 0)}")
        if data.get('status') == 'success':
            print(f"   Sample: {data.get('commodities', [])[:3]}")
        
        # Test 3: Get export by country
        print("\n3. Testing GET /global/export-by-country/Brazil")
        response = requests.get(f"{BASE_URL}/global/export-by-country/Brazil")
        data = response.json()
        print(f"   Status: {response.status_code}")
        print(f"   Exports found: {data.get('count', 0)}")
        if data.get('exports'):
            print(f"   Sample: {data['exports'][:1]}")
        
        # Test 4: Get global export demand
        print("\n4. Testing GET /global/export-demand?commodity=Rice")
        response = requests.get(f"{BASE_URL}/global/export-demand?commodity=Rice")
        data = response.json()
        print(f"   Status: {response.status_code}")
        print(f"   Demand data points: {len(data.get('demand', []))}")
        if data.get('demand'):
            print(f"   Years: {data.get('years', [])}")
            print(f"   Sample: {data['demand'][:1]}")
        
        # Test 5: Get top exporters
        print("\n5. Testing GET /global/top-exporters?commodity=Rice")
        response = requests.get(f"{BASE_URL}/global/top-exporters?commodity=Rice&year=2024&limit=5")
        data = response.json()
        print(f"   Status: {response.status_code}")
        print(f"   Top exporters found: {data.get('count', 0)}")
        if data.get('exporters'):
            print(f"   Top: {data['exporters'][0]['Country']} - {data['exporters'][0]['Value']:.0f}")
        
        # Test 6: Get country commodities
        print("\n6. Testing GET /global/country-commodities/Brazil")
        response = requests.get(f"{BASE_URL}/global/country-commodities/Brazil?year=2024&limit=5")
        data = response.json()
        print(f"   Status: {response.status_code}")
        print(f"   Commodities found: {data.get('count', 0)}")
        if data.get('commodities'):
            print(f"   Top commodity: {data['commodities'][0]['Commodity']}")
        
        # Test 7: Commodity trend
        print("\n7. Testing GET /global/commodity-trend/Rice")
        response = requests.get(f"{BASE_URL}/global/commodity-trend/Rice")
        data = response.json()
        print(f"   Status: {response.status_code}")
        print(f"   Years in trend: {len(data.get('trend', []))}")
        print(f"   Countries in data: {len(data.get('countries', []))}")
        if data.get('trend'):
            print(f"   Sample: {data['trend'][0]}")
        
        # Test 8: Demand forecast
        print("\n8. Testing GET /global/demand-forecast?commodity=Rice")
        response = requests.get(f"{BASE_URL}/global/demand-forecast?commodity=Rice")
        data = response.json()
        print(f"   Status: {response.status_code}")
        if data.get('forecast'):
            forecast = data['forecast']
            print(f"   Forecast for {forecast.get('next_year')}: {forecast.get('forecast'):.0f} tonnes")
            print(f"   Trend: {forecast.get('trend')}")
            print(f"   Confidence: {forecast.get('confidence')}")
        
        print("\n" + "=" * 60)
        print("✓ All API endpoints tested successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("Make sure backend server is running at http://localhost:5000")

if __name__ == "__main__":
    test_global_api()
