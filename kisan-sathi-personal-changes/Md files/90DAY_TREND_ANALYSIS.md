# 90-Day Trend Analysis Improvements

## Overview
Updated the 90-day trend analysis system to provide more accurate and reliable trend predictions using full 90 days of historical data.

## Key Improvements

### 1. **Enhanced Trend Classification** (`classify_trend_90day`)
- **Minimum Data Requirements**: Requires at least 20 data points for reliable trend analysis (previously 10)
- **Three-Period Analysis**: Splits 90-day data into three 30-day periods for comprehensive trend evaluation
- **Improved Thresholds**: 
  - Previous threshold: 0.0005 (too sensitive)
  - **New threshold: 0.15** (normalized slope per 100 days)
  - More robust detection of actual market trends
- **Confidence Scoring**: Returns confidence level (0-1) based on data availability
- **Trend Strength**: Quantifies how pronounced the trend is (0-100 scale)
- **Price Change Tracking**: Tracks actual price movement from early to late period

### 2. **Dedicated 90-Day Forecast** (`forecast_price_90day`)
- **Minimum Data**: Requires 90+ days of data for forecast (ensures adequate training)
- **Enhanced ML Model**:
  - Increased estimators from 200 to 300
  - Max depth increased from 10 to 12
  - Better minimum sample configurations
- **90-Day Predictions**: Forecasts prices for the next 90 days (not just 30)
- **Price Range Analysis**: Includes max price variation prediction
- **Separate Cache**: Maintains independent cache from 30-day forecasts

### 3. **Market Insights API Response**
New fields added to `/api/market-insights/<crop>` endpoint:

```json
{
  "trend_details": {
    "trend": "increasing|decreasing|stable",
    "strength": <0-100>,
    "confidence": <0-1>,
    "period_days": 90
  },
  "average_90d": {
    "value": <price>,
    "unit": "INR/quintal",
    "days": 90
  },
  "forecast_90d": {
    "avg": <average_price>,
    "min": <minimum_price>,
    "max": <maximum_price>,
    "price_range": <max-min>,
    "model": "RandomForestRegressor-90day",
    "days": 90
  },
  "data_coverage": {
    "last_90_records": <count>,
    "has_90day_data": <true|false>,
    ...
  }
}
```

## How It Works

### Trend Analysis Process
1. **Data Validation**: Ensures at least 20 data points exist
2. **Period Division**: Splits 90-day data into three equal periods
3. **Price Averaging**: Calculates average prices for early and late periods
4. **Slope Calculation**: Linear regression on 90-day price data
5. **Normalization**: Adjusts slope by mean price for comparable metrics
6. **Classification**: Applies thresholds to classify trend direction
7. **Confidence**: Increases with more data (up to 95% with full 90 days)

### Forecast Process
1. **Data Check**: Requires minimum 90 days of historical data
2. **Feature Engineering**: 
   - Date ordinal (numerical date value)
   - Month (1-12)
   - Day of year (1-365)
3. **Model Training**: RandomForestRegressor with 300 estimators
4. **Future Prediction**: Generates 90-day price forecast
5. **Statistics**: Calculates average, min, max, and range

## API Usage Examples

### Get Market Insights with 90-Day Analysis
```bash
GET /api/market-insights/Rice?state=Punjab&district=Jalandhar
```

Response includes:
- 30-day forecast (traditional)
- **90-day forecast (new)**
- **90-day trend analysis with confidence (new)**
- 90-day average price **(new)**
- Data coverage showing 90-day record count **(new)**

### Interpreting Results

**Trend Strength (0-100)**:
- 0-5: Very weak trend
- 5-15: Weak trend
- 15-30: Moderate trend
- 30+: Strong trend

**Confidence (0-1)**:
- 0.3-0.5: Low confidence (< 20 days data)
- 0.5-0.7: Medium confidence (20-60 days)
- 0.7-0.95: High confidence (60+ days)

**Trend Classification**:
- **Increasing**: Prices moving upward (normalized slope > 0.15)
- **Decreasing**: Prices moving downward (normalized slope < -0.15)
- **Stable**: Prices relatively flat (normalized slope between -0.15 and 0.15)

## Benefits

1. **More Accurate Predictions**: Uses full 90 days instead of 10 days minimum
2. **Better ML Models**: Enhanced RandomForest with optimized parameters
3. **Confidence Metrics**: Know how reliable the prediction is
4. **Longer Forecasts**: 90-day forecasts complement 30-day predictions
5. **Data Transparency**: Shows data coverage and limitations
6. **Better Recommendations**: More reliable trend-based recommendations

## Backward Compatibility

- `classify_trend()` function still works (wraps new function)
- All existing API endpoints remain unchanged
- New fields are additive (don't break old clients)
- 30-day forecasts continue to work as before

## Testing

Test with crops having good historical data:
- Rice (extensive historical data)
- Wheat (stable pricing patterns)
- Cotton (volatile market - tests stability detection)
- Sugarcane (seasonal patterns)

Monitor:
- Trend confidence scores
- Data coverage status
- 90-day vs 30-day forecast agreement
- Trend strength values

## Performance Notes

- 90-day forecasts require more computation than 30-day
- Results are cached to improve performance on repeated requests
- Separate caches for 30-day and 90-day forecasts
- Model retrains only when new data becomes available

## Future Enhancements

Potential improvements:
- Add seasonal decomposition for better pattern detection
- Implement ARIMA models for comparison
- Add anomaly detection for market shocks
- Include confidence intervals in forecasts
- Add volatility clustering detection
