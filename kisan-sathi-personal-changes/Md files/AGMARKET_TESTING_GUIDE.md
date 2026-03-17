# Testing Guide - Agmarket API Integration for 90-Day Trends

## Quick Start

### Step 1: Start the Application
```bash
python app.py
```

You should see Flask running on `http://localhost:5000`

### Step 2: Test Basic Market Insights (Uses Agmarket API by Default)
```bash
curl "http://localhost:5000/api/market-insights/Rice"
```

### Step 3: Check the Response
Look for the `data_source` field:
- `"data_source": "agmarket_api"` → API working! ✅
- `"data_source": "local_csv"` → Fell back to local data (API unavailable)

---

## Detailed Testing

### Test 1: Default - Agmarket API
```bash
curl -s "http://localhost:5000/api/market-insights/Rice" | python -m json.tool
```

**Expected Result:**
- `data_source: "agmarket_api"`
- `has_90day_data: true`
- `last_90_records: 85+` (depends on API data)
- `trend_details` with confidence > 0.7

### Test 2: Force Use of Agmarket API
```bash
curl -s "http://localhost:5000/api/market-insights/Wheat?use_api=true" | python -m json.tool
```

**Expected Result:**
- Same as Test 1

### Test 3: Use Local Data Only (No API)
```bash
curl -s "http://localhost:5000/api/market-insights/Cotton?use_api=false" | python -m json.tool
```

**Expected Result:**
- `data_source: "local_csv"`
- More records (uses all historical data)

### Test 4: With Location Filters
```bash
curl -s "http://localhost:5000/api/market-insights/Rice?state=Punjab&district=Jalandhar&use_api=true" | python -m json.tool
```

**Expected Result:**
- Data filtered to specific location
- Fewer records than without filter
- But still using agmarket API

### Test 5: Multiple Crops
Test different crops to see what's available:
```bash
# Test each crop
curl -s "http://localhost:5000/api/market-insights/Rice?use_api=true" > rice.json
curl -s "http://localhost:5000/api/market-insights/Wheat?use_api=true" > wheat.json
curl -s "http://localhost:5000/api/market-insights/Cotton?use_api=true" > cotton.json
curl -s "http://localhost:5000/api/market-insights/Sugarcane?use_api=true" > sugarcane.json
```

Then check which used API vs local:
```bash
grep "data_source" *.json
```

---

## Response Structure

### Successful API Response
```json
{
  "status": "success",
  "crop": "Rice",
  "has_market_data": true,
  "data_source": "agmarket_api",
  "market_data": {
    "trend_details": {
      "trend": "increasing",
      "strength": 28.5,
      "confidence": 0.88,
      "period_days": 90
    },
    "latest_price": {
      "value": 2280.00,
      "unit": "INR/quintal",
      "date": "2026-02-21"
    },
    "average_90d": {
      "value": 2150.00,
      "unit": "INtal/quintal",
      "days": 90
    },
    "forecast_90d": {
      "avg": 2250.00,
      "min": 2050.00,
      "max": 2450.00,
      "price_range": 400.00,
      "model": "RandomForestRegressor-90day",
      "days": 90
    },
    "recommendation": "Rice prices show increasing trend with 28.5% strength. Expected 90-day average: ₹2250.00/quintal."
  },
  "data_coverage": {
    "records": 87,
    "last_30_records": 29,
    "last_90_records": 87,
    "from": "2025-11-25",
    "to": "2026-02-21",
    "has_90day_data": true,
    "data_source": "agmarket_api"
  }
}
```

### Fallback to Local Response
```json
{
  "status": "success",
  "crop": "Maize",
  "has_market_data": true,
  "data_source": "local_csv",
  "market_data": {
    "trend_details": {
      "trend": "stable",
      "strength": 12.3,
      "confidence": 0.85,
      "period_days": 90
    },
    ...
  },
  "data_coverage": {
    "records": 2540,
    "last_90_records": 127,
    "has_90day_data": true,
    "data_source": "local_csv"
  }
}
```

### No Data Available
```json
{
  "status": "success",
  "crop": "UnknownCrop",
  "has_market_data": false,
  "data_source": "local_csv",
  "market_data": {
    "recommendation": "No price records found for UnknownCrop in market data sources."
  }
}
```

---

## Verification Checklist

### Response Fields Present ✓
- [ ] `data_source` field exists
- [ ] `trend_details` with trend, strength, confidence
- [ ] `average_90d` with value and days
- [ ] `forecast_90d` with avg/min/max
- [ ] `data_coverage.data_source` matches top-level
- [ ] Confidence score between 0-1
- [ ] Trend strength between 0-100

### Data Quality ✓
- [ ] Latest price is reasonable (> 0)
- [ ] 90-day average makes sense
- [ ] 30-day vs 90-day prices are close
- [ ] Min < Max in forecasts
- [ ] Confidence > 0.7 for good data

### Trend Analysis ✓
- [ ] Trend is one of: increasing, decreasing, stable
- [ ] Strength matches trend (strong trend = high strength)
- [ ] If confidence < 0.5, warns about limited data
- [ ] Recommendation text is informative

### Performance ✓
- [ ] First request takes 2-5 seconds (API call)
- [ ] Subsequent requests < 500ms (cached)
- [ ] No timeout errors
- [ ] No internal server errors

---

## Interpreting 90-Day Trends

### Scenario 1: Strong Increasing Trend
```json
"trend_details": {
  "trend": "increasing",
  "strength": 35.2,
  "confidence": 0.92
}
```
**Interpretation:**
- Strong upward price movement
- Very reliable (92% confidence)
- Good market conditions for sellers
- ✅ **Action**: Consider selling soon

### Scenario 2: Moderate Decreasing Trend  
```json
"trend_details": {
  "trend": "decreasing",
  "strength": 18.5,
  "confidence": 0.81
}
```
**Interpretation:**
- Prices trending downward but slowly
- Good confidence (81%)
- Unfavorable conditions for sellers
- ⏳ **Action**: Wait for stabilization

### Scenario 3: Stable with Low Confidence
```json
"trend_details": {
  "trend": "stable",
  "strength": 5.2,
  "confidence": 0.38
}
```
**Interpretation:**
- No clear trend detected
- Low confidence due to limited data
- Insufficient data for reliable decision
- ❓ **Action**: Wait for more data or use local data

---

## Testing Different Scenarios

### Scenario A: API Works Perfectly
```bash
curl "http://localhost:5000/api/market-insights/Rice?use_api=true"
```
Expected: `"data_source": "agmarket_api"` with 85+ records

### Scenario B: API Fails, Uses Local
```bash
# Temporarily disconnect internet or give wrong API key
curl "http://localhost:5000/api/market-insights/Rice?use_api=true"
```
Expected: Falls back to `"data_source": "local_csv"`

### Scenario C: Force Use of Local Data
```bash
curl "http://localhost:5000/api/market-insights/Rice?use_api=false"
```
Expected: `"data_source": "local_csv"` with more records

### Scenario D: With Specific Location
```bash
curl "http://localhost:5000/api/market-insights/Rice?state=Punjab&use_api=true"
```
Expected: Fewer records (location filtered, but still from API)

---

## Debugging

### If API data not being used:
```bash
# 1. Check logs in app
tail -f app.log

# 2. Verify agmarket URL works
curl "https://agmarknet.ceda.ashoka.edu.in/api/commodities"

# 3. Check API key configuration
python -c "import os; print('AGMARKET_API_KEY:', os.environ.get('AGMARKET_API_KEY', 'NOT SET'))"

# 4. Test with use_api=false to confirm local works
curl "http://localhost:5000/api/market-insights/Rice?use_api=false"
```

### If 90-day forecast is None:
```json
"forecast_90d": {
  "avg": null,
  "min": null,
  "max": null
}
```

**Possible causes:**
1. Less than 90 records available
2. Dates not parsing correctly
3. All prices are 0 or negative

**Check:**
```bash
# Look at data_coverage
"last_90_records": 45  # Less than 90
```

### If confidence score is low:
```json
"confidence": 0.35
```

**Causes:**
1. Insufficient data points
2. Large gaps in data
3. Incomplete 90-day coverage

**Solution:**
- Use local data: `use_api=false`
- Or wait for more API data
- Check `last_90_records` count

---

## Performance Testing

### Test Response Time
```bash
# Time a single request (first call)
time curl -s "http://localhost:5000/api/market-insights/Rice?use_api=true" > /dev/null

# Result: ~2-5 seconds (API call + analysis)
```

```bash
# Time cached request (subsequent calls)
time curl -s "http://localhost:5000/api/market-insights/Rice?use_api=true" > /dev/null

# Result: ~100-500ms (cached)
```

### Load Testing
```bash
# Test with multiple simultaneous requests
for i in {1..5}; do
  curl -s "http://localhost:5000/api/market-insights/Rice" &
done
wait

# Should handle gracefully without hitting rate limits
```

---

## Success Criteria

✅ **Integration is working if:**
1. API data is fetched and used (check `data_source: "agmarket_api"`)
2. 90-day trends have high confidence (> 0.7)
3. Last 90 records count is reasonable (30+)
4. Trend analysis produces meaningful results
5. Forecasts are within reasonable bounds
6. Fallback to local data works
7. Response time is acceptable
8. No errors in logs

✅ **90-day trend prediction improved if:**
1. Confidence scores are higher than before
2. Trends align with market expectations
3. Forecasts are more accurate
4. Data source indicated clearly
5. Both API and local data work

---

## Next Steps

1. **Verify Integration**
   - [ ] Run tests above
   - [ ] Check response structure
   - [ ] Verify data_source field

2. **Validate Results**
   - [ ] Compare with market observations
   - [ ] Check trend directions make sense
   - [ ] Validate price ranges

3. **Monitor Quality**
   - [ ] Track confidence scores
   - [ ] Monitor data coverage
   - [ ] Check for anomalies

4. **Optimize**
   - [ ] Adjust cache expiration if needed
   - [ ] Fine-tune fallback logic
   - [ ] Monitor API rate limits

5. **Deploy**
   - [ ] Document for users
   - [ ] Set up API key management
   - [ ] Monitor performance in production

---

## Troubleshooting Tips

| Issue | Solution |
|-------|----------|
| Always returns local data | Check API keys are set, verify agmarket URL is accessible |
| 90-day data not available | Try specific crop/location, check data_coverage |
| Low confidence scores | Use local data, wait for more API data |
| Slow responses | First request slower (API call), cached requests fast |
| No data at all | Try different crop, check has_market_data field |
| Trend doesn't match market | Normal - API may have different prices than local |

---

**Status**: Ready for comprehensive testing
**Date**: February 21, 2026
**Components**: ✅ Agmarket API integration complete
