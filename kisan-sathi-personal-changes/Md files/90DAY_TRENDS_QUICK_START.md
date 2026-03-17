# 90-Day Trend Analysis - Quick Start Guide

## What's New?

The 90-day trend analysis has been significantly improved to provide **more accurate and reliable trend predictions** using full 90 days of historical market data instead of just 10 data points.

## Key Improvements at a Glance

| Feature | Before | After |
|---------|--------|-------|
| **Minimum Data Points** | 10 | 20 |
| **Analysis Period** | Variable | Full 90 days |
| **Trend Thresholds** | 0.0005 (too sensitive) | 0.15 (robust) |
| **Confidence Score** | None | 0-1 scale |
| **Trend Strength** | Not quantified | 0-100 scale |
| **90-Day Forecast** | 30-day only | Both 30 & 90-day |
| **ML Model** | Basic | Enhanced RandomForest |

## How to Use

### 1. **Start the Application**
```bash
python app.py
```

### 2. **Query Market Insights with 90-Day Data**
```bash
# Get market insights for a crop
curl "http://localhost:5000/api/market-insights/Rice?state=Punjab&district=Jalandhar"
```

### 3. **Interpret the New Response Fields**

#### Trend Details (NEW)
```json
"trend_details": {
  "trend": "increasing",        // increasing | decreasing | stable
  "strength": 25.5,              // 0-100: How strong the trend is
  "confidence": 0.92,            // 0-1: How reliable (more data = higher confidence)
  "period_days": 90              // Always 90 for full analysis
}
```

**Confidence Interpretation:**
- **0.3-0.5**: Low confidence (less than 20 days of data)
- **0.5-0.7**: Medium confidence (20-60 days of data)
- **0.7-0.95**: High confidence (60+ days of data)

#### 90-Day Average (NEW)
```json
"average_90d": {
  "value": 2150.00,
  "unit": "INR/quintal",
  "days": 90
}
```

#### 90-Day Forecast (NEW)
```json
"forecast_90d": {
  "avg": 2200.00,                 // Average expected price
  "min": 1900.00,                 // Lowest expected price
  "max": 2500.00,                 // Highest expected price
  "price_range": 600.00,          // max - min volatility
  "model": "RandomForestRegressor-90day",
  "days": 90
}
```

#### Data Coverage (ENHANCED)
```json
"data_coverage": {
  "records": 2540,
  "last_30_records": 28,          // NEW: 30-day data points
  "last_90_records": 85,          // NEW: 90-day data points
  "from": "2023-06-15",
  "to": "2026-02-21",
  "has_90day_data": true          // NEW: Flag for 90-day availability
}
```

## Example API Responses

### Example 1: Increasing Trend
```json
{
  "crop": "Rice",
  "market_data": {
    "trend_details": {
      "trend": "increasing",
      "strength": 28.5,
      "confidence": 0.89,
      "period_days": 90
    },
    "average_90d": {
      "value": 2150.00,
      "unit": "INR/quintal",
      "days": 90
    },
    "forecast_90d": {
      "avg": 2280.00,
      "min": 2100.00,
      "max": 2450.00,
      "price_range": 350.00,
      "days": 90
    },
    "data_coverage": {
      "last_90_records": 90,
      "has_90day_data": true
    }
  }
}
```

**Decision**: Good time to sell - prices trending up with strong growth expected.

### Example 2: Decreasing Trend
```json
{
  "crop": "Cotton",
  "market_data": {
    "trend_details": {
      "trend": "decreasing",
      "strength": 18.2,
      "confidence": 0.85,
      "period_days": 90
    },
    "forecast_90d": {
      "avg": 4800.00,
      "min": 4200.00,
      "max": 5100.00,
      "price_range": 900.00,
      "days": 90
    },
    "data_coverage": {
      "has_90day_data": true
    }
  }
}
```

**Decision**: Hold for now - prices trending down, wait for stabilization.

### Example 3: Stable with Low Confidence
```json
{
  "crop": "Sugarcane",
  "market_data": {
    "trend_details": {
      "trend": "stable",
      "strength": 5.2,
      "confidence": 0.35,        // LOW CONFIDENCE!
      "period_days": 90
    },
    "data_coverage": {
      "last_90_records": 12,      // Only 12 records out of 90
      "has_90day_data": false     // Not enough data
    }
  }
}
```

**Decision**: Inconclusive - need more data. Recommendations unreliable.

## Comparison: 30-Day vs 90-Day Analysis

The API now returns both for comparison:

```json
{
  "market_data": {
    "forecast_30d": {
      "avg": 2200.00,
      "days": 30,
      "model": "RandomForestRegressor"
    },
    "forecast_90d": {
      "avg": 2250.00,
      "days": 90,
      "model": "RandomForestRegressor-90day"
    }
  }
}
```

**When to use which:**
- **30-day forecast**: Short-term trading decisions (next month)
- **90-day forecast**: Planting decisions, seasonal planning
- **Compare both**: if they diverge, market may be volatile

## Testing the New Features

### Test Crops (Recommended)
These have sufficient historical data for reliable 90-day analysis:

1. **Rice** - Stable with seasonal patterns
2. **Wheat** - Good price stability
3. **Cotton** - Volatile (tests extremes)
4. **Sugarcane** - Seasonal patterns
5. **Maize** - Moderate volatility

### Test Command
```bash
# Request Rice market data
curl "http://localhost:5000/api/market-insights/Rice"

# Request with specific location
curl "http://localhost:5000/api/market-insights/Cotton?state=Maharashtra&district=Yavatmal"

# With season filter
curl "http://localhost:5000/api/market-insights/Wheat?season=winter"
```

### Expected Results
1. **Response includes all new fields** ✓
2. **trend_details.confidence > 0.7** (if has_90day_data = true)
3. **forecast_90d shows reasonable price range** ✓
4. **90-day forecast avg differs slightly from 30-day** ✓
5. **Recommendations are more informative** ✓

## Decision Making Guide

### Based on Trend
```
Trend: INCREASING + Strength > 20 + Confidence > 0.7
→ Favorable to sell soon
→ Good market conditions

Trend: DECREASING + Strength > 20 + Confidence > 0.7
→ Wait before selling
→ Prices may drop further

Trend: STABLE + Strength < 10 + Confidence > 0.7
→ Neutral conditions
→ Market predictable
```

### Based on Confidence
```
Confidence > 0.7 → Reliable prediction
Confidence 0.5-0.7 → Use with caution
Confidence < 0.5 → Don't rely on this analysis
              → Need more historical data
```

### Based on Price Range (Volatility)
```
Price Range < ₹200 → Stable, predictable market
Price Range ₹200-500 → Moderate volatility
Price Range > ₹500 → High volatility, more uncertainty
```

## Troubleshooting

### Issue: "has_90day_data": false
**Cause**: Insufficient historical data (< 90 days)
**Solution**: 
- Check `last_90_records` count
- Wait for more data to accumulate
- Use 30-day forecast instead

### Issue: Very low confidence score (< 0.5)
**Cause**: Limited data points in 90-day window
**Solution**:
- Look at `last_90_records` value
- Increase monitoring period
- Compare with 30-day analysis

### Issue: Different results from before
**Expected**: Yes! The new system is more accurate.
- Thresholds are more robust
- Requires more data for classification
- Better handles noise and volatility

## Performance Tips

1. **Caching**: First request slower (trains model), subsequent requests faster
2. **Parallel Requests**: Backend handles multiple crop requests efficiently
3. **Data Size**: Works best with crops having 100+ historical records
4. **Update Frequency**: Results update when new market data arrives

## API Reference

### Endpoint
```
GET /api/market-insights/<crop>
```

### Query Parameters
- `state` (optional): Filter by state
- `district` (optional): Filter by district  
- `market` (optional): Filter by specific market
- `season` (optional): Filter by season (summer/rainy/winter/spring)

### Response Fields (New/Enhanced)
- `market_data.trend_details.*` (NEW)
- `market_data.average_90d.*` (NEW)
- `market_data.forecast_90d.*` (NEW)
- `data_coverage.last_30_records` (NEW)
- `data_coverage.last_90_records` (NEW)
- `data_coverage.has_90day_data` (NEW)

## Next Steps

1. ✓ Update app.py with new functions
2. ✓ Test with sample data
3. → **Start the application**
4. → **Test API endpoints**
5. → **Validate results with domain experts**
6. → **Update frontend** to display new fields
7. → **Deploy to production**

---

For detailed technical documentation, see: [90DAY_TREND_ANALYSIS.md](./90DAY_TREND_ANALYSIS.md)
