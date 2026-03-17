# Global Market Access - Global Export Demand Analysis

## Overview

The **Global Market Access** feature enables farmers to explore worldwide export demand, identify top export markets for their crops, and understand global trade opportunities. This helps farmers make informed decisions about what to grow based on international market trends and demand patterns.

## Data Source

- **FAOSTAT Dataset**: `FAOSTAT_data_en_2-22-2026.csv`
- **Coverage**: 8 countries (Brazil, Kuwait, Luxembourg, Mauritius, Mexico, UAE, UK, USA)
- **Commodities**: 455+ agricultural products and livestock items
- **Time Period**: 2022-2024 data with 2025 forecasts
- **Metrics**: Export quantity (tonnes) and export value (USD)

## Features

### 1. Global Demand View
- **Purpose**: See worldwide export demand trends for specific commodities
- **Data Type**: Shows global export volumes and values for selected crops
- **Time Period**: 3-year historical data (2022-2024) with forecast for next year
- **Use Case**: Understand if demand is increasing, decreasing, or stable

### 2. By Country View
- **Purpose**: Explore what each country exports most
- **Features**:
  - Top export commodities by country (2024)
  - Year-on-year export data
  - Export value in USD

### 3. Top Exporters
- **Purpose**: Identify which countries dominate export for a specific crop
- **Data**: Ranked list of top 8 exporting countries by volume
- **Use Case**: Understand competition in international markets

### 4. Commodity Trend Analysis
- **Purpose**: Track how different countries export a commodity over time
- **Visualization**: Multi-line chart showing export trends
- **Benefit**: See market share shifts and identify rising exporters

### 5. Demand Forecast
- **Purpose**: Predict next year's export demand for a commodity
- **Includes**:
  - Forecasted volume (tonnes or value)
  - Trend direction (increasing/decreasing/stable)
  - Confidence level (high/medium/low)
- **Use Case**: Plan production based on predicted global demand

## API Endpoints

### Countries and Commodities

#### Get All Countries
```
GET /api/global/countries
Response:
{
  "status": "success",
  "countries": ["Brazil", "Mexico", "United States of America", ...],
  "count": 8
}
```

#### Get All Commodities
```
GET /api/global/commodities
Response:
{
  "status": "success",
  "commodities": ["Rice", "Wheat", "Apples", ...],
  "count": 455
}
```

### Export Data

#### Get Export by Country
```
GET /api/global/export-by-country/{country}
GET /api/global/export-by-country/Brazil?element=Export%20quantity

Response:
{
  "status": "success",
  "country": "Brazil",
  "element": "Export quantity",
  "exports": [
    {
      "Item": "Almonds, shelled",
      "Year": 2024,
      "Value": 3.88,
      "Unit": "t"
    }
  ],
  "count": 487
}
```

#### Get Global Export Demand
```
GET /api/global/export-demand
GET /api/global/export-demand?commodity=Rice
GET /api/global/export-demand?commodity=Rice&element=Export%20quantity

Response:
{
  "status": "success",
  "commodity": "Rice",
  "element": "Export quantity",
  "demand": [
    {"Year": 2024, "Value": 15000000.0},
    {"Year": 2023, "Value": 14500000.0},
    {"Year": 2022, "Value": 13800000.0}
  ],
  "years": [2024, 2023, 2022]
}
```

#### Get Top Exporters
```
GET /api/global/top-exporters
GET /api/global/top-exporters?commodity=Rice&year=2024&limit=10

Response:
{
  "status": "success",
  "commodity": "Rice",
  "year": 2024,
  "exporters": [
    {
      "Country": "India",
      "Value": 12000000.0,
      "Year": 2024,
      "Element": "Export quantity"
    }
  ],
  "count": 8
}
```

#### Get Commodity Trend
```
GET /api/global/commodity-trend/{commodity}
GET /api/global/commodity-trend/Rice

Response:
{
  "status": "success",
  "commodity": "Rice",
  "element": "Export quantity",
  "trend": [
    {
      "year": 2024,
      "United States of America": 2500000.0,
      "Brazil": 1200000.0,
      "Mexico": 500000.0
    }
  ],
  "countries": ["United States of America", "Brazil", "Mexico"]
}
```

#### Get Country Commodities
```
GET /api/global/country-commodities/{country}
GET /api/global/country-commodities/Brazil?year=2024&limit=15

Response:
{
  "status": "success",
  "country": "Brazil",
  "year": 2024,
  "commodities": [
    {
      "Commodity": "Sugar, centrifugal",
      "Value": 25000000.0
    }
  ],
  "count": 250
}
```

#### Get Demand Forecast
```
GET /api/global/demand-forecast?commodity=Rice
GET /api/global/demand-forecast?commodity=Rice&country=Brazil

Response:
{
  "status": "success",
  "commodity": "Rice",
  "country": "Global",
  "forecast": {
    "forecast": 15500000.0,
    "trend": "increasing",
    "slope": 350000.0,
    "confidence": "high",
    "next_year": 2025
  }
}
```

## Page Structure

### Left Panel (Selection)
- **Tabs**:
  - "Global Demand" - View global trends for commodities
  - "By Country" - View country-specific exports
- **Global Demand**:
  - Search/filter commodities
  - List of all 455+ commodities
- **By Country**:
  - Search/filter countries
  - List of all 8 countries

### Right Panel (Analytics)
- **Global Demand View**:
  - Demand forecast card (next year volume, trend, confidence)
  - Global export demand trend chart (3-year line chart)
  - Top exporting countries bar chart (top 8)
  - Commodity trend by country (multi-line chart)

- **By Country View**:
  - Top export commodities chart (horizontal bar chart)
  - Export summary table (commodities with year/quantity)

## Usage Examples

### Example 1: Check Global Demand for Rice
1. Go to "Global Market" page
2. Global Demand tab is selected by default
3. Search for "Rice" in the commodity list
4. Click "Rice"
5. View:
   - Global export trend over 3 years
   - Next year forecast
   - Top exporting countries for Rice
   - Which countries are increasing/decreasing exports

### Example 2: Explore Brazil's Exports
1. Go to "Global Market" page
2. Click "By Country" tab
3. Click "Brazil"
4. View:
   - Brazil's top export commodities
   - Which products Brazil exports most
   - Year-on-year export data

### Example 3: Compare Exporters for a Commodity
1. Go to "Global Market" page
2. Global Demand tab
3. Select a commodity (e.g., "Sugarcane")
4. View the commodity trend chart showing all countries
5. Identify which countries are the main competitors

## Data Processing

### Global Market Processor Module
**File**: `training/global_market_processor.py`

**Class**: `GlobalMarketProcessor`

#### Key Methods:
- `get_countries()` - Get list of all countries
- `get_commodities()` - Get list of all commodities
- `get_export_by_country(country)` - Get exports for specific country
- `get_global_export_demand(commodity)` - Get global demand trend
- `get_commodity_export_trend(commodity)` - Get trend across countries
- `get_top_exporters(commodity, year, limit)` - Get top exporting countries
- `get_country_commodity_exports(country)` - Get top commodities for country
- `get_demand_forecast(commodity, country)` - Simple linear regression forecast

#### Data Filtering:
- Only Export data (Element contains "Export")
- Only official figures (Flag in ['A', 'T', 'E', ''])
- Numeric values converted and cleaned (NaN → 0)

### Backend Integration
**File**: `app.py`

**Initialization**:
```python
from training.global_market_processor import GlobalMarketProcessor

# In load_models() function:
faostat_path = Path(__file__).parent / "FAOSTAT_data_en_2-22-2026.csv"
if faostat_path.exists():
    global_market_processor = GlobalMarketProcessor(str(faostat_path))
```

### Frontend Component
**File**: `frontend/src/pages/GlobalMarketAccess.jsx`

**State Management**:
- `selectedCountry` - Current selected country
- `selectedCommodity` - Current selected commodity
- `exportDemand` - Global demand data for display
- `topExporters` - Top exporting countries
- `commodityTrend` - Trend data by country
- `forecast` - Forecast data for next year
- `dataSource` - Toggle between 'global' and 'country' views

**Main Data Fetching Functions**:
- `fetchGlobalDemand()` - Get export demand trend
- `fetchCommodityTrend()` - Get multi-country trend
- `fetchTopExporters()` - Get top 8 exporters
- `fetchCountryExports()` - Get country's exports
- `fetchForecast()` - Get next year forecast

### Styling
**File**: `frontend/src/styles/GlobalMarketAccess.css`

**Color Scheme**:
- Primary: `#27ae60` (green) for positive trends
- Secondary: `#3498db` (blue) for charts
- Alert: `#e74c3c` (red) for decreasing trends
- Background: Gradient from `#f5f7fa` to `#c3cfe2`

**Responsive Design**:
- Desktop: 2-column layout (selection panel + content)
- Tablet/Mobile: Single column stack

## Forecast Algorithm

Uses simple linear regression on historical data:

```
y = mx + b

Where:
- m (slope): Rate of change in exports
- b (intercept): Baseline value
- Confidence based on slope magnitude vs. data variance
```

**Trend Classification**:
- `increasing`: slope > 0
- `decreasing`: slope < 0
- `stable`: slope ≈ 0

**Confidence Levels**:
- `high`: |slope| > std_dev * 0.1
- `medium`: |slope| > 0
- `low`: No change or insufficient data

## Testing

Run the test script to verify all API endpoints:

```bash
cd "c:\Users\Admin\Desktop\ml_project\innovate you\kisan-sathi"
python test_global_api.py
```

Expected output:
```
✓ All 8 API endpoints tested successfully!
- Countries: 8 found
- Commodities: 455 found
- Top exporters loaded
- Demand forecast calculated
- etc.
```

## Future Enhancements

1. **Import Data**: Add import demand to complement export analysis
2. **Trade Balance**: Show which countries are net exporters vs. importers
3. **Price Trends**: Link global export volumes with international prices
4. **Regional Analysis**: Group countries by region for comparative analysis
5. **Historical Comparison**: Multi-year comparison for same period
6. **Volume vs Value Analysis**: Toggle between quantity and monetary value
7. **Alerts**: Notify farmers of significant demand changes
8. **Caching**: Cache API responses (15-minute TTL) to reduce load

## Navigation

- **Route**: `/global-market`
- **Navbar Link**: "Global Market"
- **From Home**: Bottom of page has link to global market insights

## Troubleshooting

### "Global market data not available"
- **Cause**: FAOSTAT CSV file not found or not loaded
- **Solution**: Ensure `FAOSTAT_data_en_2-22-2026.csv` exists in project root
- **Check**: Restart backend server - data loads on app startup

### "No data available" for commodity
- **Cause**: Selected commodity not in dataset
- **Solution**: The dataset has 455 commodities; check spelling or try another
- **Note**: Some commodities have aliases (e.g., "Rice" vs "Paddy rice")

### Charts not showing
- **Cause**: Browser JavaScript issue
- **Solution**: Hard refresh (Ctrl+Shift+R) or clear cache
- **Check**: Console for errors (F12)

### Slow loading
- **Cause**: Large dataset processing on first load
- **Solution**: First load takes 2-3 seconds; subsequent loads cached
- **Note**: 455 commodities × 8 countries × 4 metrics = ~14,560 data points

## Credits

- **Data Source**: FAOSTAT (Food and Agriculture Organization)
- **Time Period**: 2022-2024
- **Updated**: February 22, 2026
- **Processing**: Custom Python analysis with NumPy/Pandas
- **Frontend**: React with Recharts visualization

## Support

For issues or questions about:
- **Data accuracy**: Check FAOSTAT official website
- **Feature requests**: Contact development team
- **Technical issues**: Check logs and test script output
