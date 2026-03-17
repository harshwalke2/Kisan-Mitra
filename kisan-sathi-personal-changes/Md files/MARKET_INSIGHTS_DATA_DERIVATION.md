# Market Insights Page - Data Derivation Guide

## Overview
The Market Insights page shows current crop prices, trends, and market predictions for farmers. It helps farmers decide when and where to sell their crops by analyzing historical price data from agricultural markets across India.

---

## 1. DATA SOURCES

### Primary Data Source
**CSV File Location:**
```
data/processed/cleaned_Agriculture_price_dataset.csv
```

### Data Structure
After loading and cleaning, the data has these key columns:

| Column | Meaning | Example | Type |
|--------|---------|---------|------|
| **commodity** | Crop name (normalized) | "wheat", "potato", "tomato" | String |
| **price_date** | Date of price record | 2024-02-15 | DateTime |
| **modal_price** | Current market price | 2500 | Float |
| **min_price** | Lowest price that day | 2400 | Float |
| **max_price** | Highest price that day | 2600 | Float |
| **market** | Market/Mandi name | "delhi", "mumbai" | String |
| **state** | State | "delhi", "maharashtra" | String |
| **district** | District | "New Delhi", "Mumbai" | String |
| **month** | Month extracted from date | 2 | Integer |

### Secondary Data Source (Live Prices)
**For "Aaj Ka Bhav" (Today's Price):**
- CEDA Agmarknet API (if configured)
- Data.gov.in API (if API key provided)
- Fallback: Latest historical data from CSV

---

## 2. DATA PROCESSING PIPELINE

### Step-by-Step Processing

#### Processing Location
File: `app.py` - Multiple helper functions

#### Processing Steps

1. **Load and Clean CSV**
   ```python
   market_prices = pd.read_csv(
       'data/processed/cleaned_Agriculture_price_dataset.csv',
       low_memory=False
   )
   # Normalize column names to lowercase
   market_prices.columns = [col.strip().lower() for col in market_prices.columns]
   # Rename specific columns for consistency
   market_prices.rename(columns={
       "district_name": "district",
       "market_name": "market"
   }, inplace=True)
   ```

2. **Normalize Text Columns**
   - Convert commodity, state, district, market to lowercase
   - Remove extra whitespace
   - Makes searching consistent

3. **Extract Temporal Features**
   ```python
   # Used for forecasting
   date_ordinal = date.toordinal()  # Days since Jan 1, year 1
   month = date.month  # 1-12
   dayofyear = date.timetuple().tm_yday  # 1-365/366
   ```

4. **Result**
   - Clean, indexed dataset ready for queries
   - 47,615+ price records
   - Covers multiple crops, states, and markets

---

## 3. API ENDPOINTS & VALUE DERIVATION

### 3.1 GET /api/ceda/commodities
**Purpose**: Get list of available commodities/crops

#### Derivation Method
```python
# Try to fetch from CEDA API first
try:
    items = fetch_ceda_commodities()  # From CEDA Agmarknet
except:
    # Fallback to local data
    items = get_local_commodities_fallback()

# Return list of commodity names
commodities = [
    {"id": normalize_text(name), "name": name.title()},
    ...
]
```

**How it works:**
1. Try CEDA API (official agricultural data)
2. If CEDA unavailable, use unique commodities from local CSV
3. Return sorted list with display names

**Example Output:**
```json
{
  "status": "success",
  "source": "local",
  "commodities": [
    {"id": "wheat", "name": "Wheat"},
    {"id": "potato", "name": "Potato"},
    {"id": "tomato", "name": "Tomato"},
    ...
  ],
  "count": 450
}
```

**Displayed as:** Dropdown list sorted alphabetically (priority crops like Wheat, Potato at top)

---

### 3.2 GET /api/market-insights/{crop}
**Purpose**: Get comprehensive market analysis and predictions for a crop

#### Derivation Method - Step by Step

**Step 1: Filter Data**
```python
# Get all price records for the crop
crop_data = filter_market_prices(
    crop=crop,
    state=state,    # optional
    district=district,  # optional
    market=market   # optional
)
# Sort by date (oldest first)
crop_data = crop_data.sort_values("price_date")
```

**Step 2: Extract Key Metrics**
```python
# Get latest price data
latest_row = crop_data.iloc[-1]
latest_date = latest_row["price_date"]
latest_price = float(latest_row["modal_price"])

# Get 30-day average
last_30_days = crop_data[crop_data["price_date"] >= latest_date - timedelta(days=30)]
avg_30_day = float(last_30_days["modal_price"].mean())
```

**Step 3: Classify Trend (90-day analysis)**
```python
# Split data into three 30-day periods
prices = crop_data["modal_price"].values
n = len(prices)
period_size = n // 3

early_period = prices[:period_size]       # First 30 days
mid_period = prices[period_size:2*period_size]    # Middle 30 days
late_period = prices[-period_size:]       # Last 30 days

# Calculate averages
early_avg = mean(early_period)
mid_avg = mean(mid_period)
late_avg = mean(late_period)

# Calculate price change percentage
price_change_pct = ((late_avg - early_avg) / early_avg) * 100

# Fit linear regression line through all data
x = array of indices (0, 1, 2, ..., n-1)
y = prices array
slope, intercept = fit_line(x, y)

# Normalize slope to percentage
normalized_slope = (slope / mean_price) * 100

# Determine trend
if normalized_slope > 0.15:
    trend = "increasing"
elif normalized_slope < -0.15:
    trend = "decreasing"
else:
    trend = "stable"

strength = abs(normalized_slope)  # 0-100 scale
confidence = 0.5 + (number_of_data_points / 90) * 0.45
```

**Step 4: Classify Price Stability**
```python
# Calculate coefficient of variation (CV)
mean_price = average of all modal prices
std_dev = standard deviation of prices
CV = std_dev / mean_price

# Classify based on CV
if CV < 0.05:
    stability = "stable"     # Prices vary < 5%
elif CV < 0.15:
    stability = "moderate"   # Prices vary 5-15%
else:
    stability = "volatile"   # Prices vary > 15%
```

**Step 5: Calculate 30-day Forecast**
```python
# Use Random Forest ML model if enough data (>30 days)
if number_of_records >= 30:
    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=10
    )
    
    # Training features: temporal data
    X = [date_ordinal, month, dayofyear] for each date
    y = modal_price for each date
    
    model.fit(X, y)
    
    # Predict next 30 days
    future_dates = [today+1, today+2, ..., today+30]
    predictions = model.predict(future_dates)
    
    forecast = {
        "avg": average(predictions),
        "min": minimum(predictions),
        "max": maximum(predictions),
        "days": 30,
        "model": "RandomForestRegressor"
    }
```

**Step 6: Calculate Market Risk**
```python
# Market risk based on stability
if stability == "volatile":
    market_risk = "high"      # Price swings a lot
elif stability == "moderate":
    market_risk = "medium"    # Some variation
else:
    market_risk = "low"       # Stable, predictable
```

**Complete Output Example:**
```json
{
  "status": "success",
  "crop": "Wheat",
  "has_market_data": true,
  "data_source": "local_csv",
  "market_data": {
    "demand_trend": "high",
    "price_stability": "moderate",
    "global_demand": "increasing",
    "trend_details": {
      "trend": "increasing",
      "strength": 2.35,
      "confidence": 0.850,
      "price_change_pct": 8.50,
      "early_avg": 2100.00,
      "late_avg": 2275.00,
      "period_days": 365
    },
    "latest_price": {
      "value": 2500.00,
      "unit": "INR/quintal",
      "date": "2024-02-15"
    },
    "recent_average": {
      "value": 2450.50,
      "unit": "INR/quintal",
      "days": 30
    },
    "forecast_30d": {
      "avg": 2550.00,
      "min": 2480.00,
      "max": 2620.00,
      "model": "RandomForestRegressor",
      "days": 30
    },
    "recommendation": "Wheat prices show increasing trend with 2.35% strength. Expected 30-day average: ₹2,550/quintal."
  }
}
```

**Displayed as:**
- "Latest Price" card showing current rate
- "Trend" indicator with up/down arrow
- "30-day expected avg" forecast value
- "Market summary" showing demand, stability, recommendation

---

### 3.3 GET /api/agmarket/history?commodity={crop}&days=90
**Purpose**: Get historical price trend data for charts

#### Derivation Method

**Step 1: Filter by Crop**
```python
crop_data = filter_market_prices(commodity)
if crop_data.empty:
    # Try fuzzy matching
    crop_data = market_prices[
        market_prices["commodity"].str.contains(crop, case=False)
    ]
```

**Step 2: Get Last N Days**
```python
crop_data = crop_data.sort_values("price_date")
latest_date = crop_data["price_date"].max()
cutoff_date = latest_date - timedelta(days=days-1)  # days=90
recent = crop_data[crop_data["price_date"] >= cutoff_date]
```

**Step 3: Aggregate by Date (Daily Average)**
```python
# Group multiple market records by date
daily_data = recent.groupby(recent["price_date"].dt.date).aggregate({
    "modal_price": "mean",      # Average price across all mandis that day
    "min_price": "min",         # Lowest price
    "max_price": "max"          # Highest price
})
```

**Step 4: Format for Chart**
```python
time_series = [
    {
        "date": "2024-02-01",
        "modal_price": 2400.50,
        "min_price": 2380.00,
        "max_price": 2450.00
    },
    ...
]
```

**Example Time Series (Last 7 days):**
```
Date       | Modal Price | Min    | Max
-----------|-------------|--------|--------
2024-02-09 | 2520.00    | 2480   | 2560
2024-02-10 | 2530.00    | 2490   | 2570
2024-02-11 | 2540.00    | 2500   | 2580
2024-02-12 | 2545.00    | 2505   | 2585
2024-02-13 | 2550.00    | 2510   | 2590
2024-02-14 | 2555.00    | 2515   | 2595
2024-02-15 | 2560.00    | 2520   | 2600
```

**Displayed as:** Line chart with price on Y-axis, date on X-axis

---

### 3.4 GET /api/agmarket/history (Mandi Comparison)
**Purpose**: Show which mandi (market) has the best price for today

#### Derivation Method

**Step 1: Get Latest Date Data**
```python
latest_date = crop_data["price_date"].max()

# Extract only records from latest date
latest_day_data = crop_data[
    crop_data["price_date"].dt.date == latest_date.date()
]
```

**Step 2: Group by Mandi**
```python
# Group by market, state, district
by_mandi = latest_day_data.groupby(
    ["market", "state", "district"],
    as_index=False
).aggregate({
    "modal_price": "mean",  # If multiple records for same mandi
    "min_price": "min",
    "max_price": "max"
})
```

**Step 3: Sort by Price (Best First)**
```python
by_mandi = by_mandi.sort_values("modal_price", ascending=False)
# Take top 15 mandis
by_mandi = by_mandi.head(15)
```

**Step 4: Format for Display**
```python
formatted = [
    {
        "market": "Delhi Amar Nath Mandi",
        "district": "New Delhi",
        "state": "Delhi",
        "modal_price": 2600.00,
        "min_price": 2580.00,
        "max_price": 2620.00,
        "name": "Delhi (Amar Nath) - ₹2600"  # For chart
    },
    ...
]
```

**Example Output (Top 5 Mandis for Wheat - Feb 15):**
```
Rank | Mandi               | Price (₹/q) | Difference
-----|---------------------|-------------|-------------
1    | Delhi Amar Nath     | 2600        | +₹100 (best)
2    | Punjab Jalandhar    | 2580        | +₹80
3    | Haryana Rohtak      | 2560        | +₹60
4    | UP Meerut          | 2540        | +₹40
5    | Bihar Patna         | 2500        | Baseline
```

**Displayed as:** Horizontal bar chart - longer bar = better price (sell there!)

---

### 3.5 GET /api/agmarket/live?commodity={crop}&source=api
**Purpose**: Get today's live prices from API (Aaj Ka Bhav)

#### Derivation Method

**Data Source Priority:**
```
1. Try CEDA Agmarknet API
2. Try Data.gov.in API
3. Fallback: Latest historical data from CSV
```

**Step 1: Fetch from API**
```python
if AGMARKET_API_KEY exists:
    records = fetch_from_data_gov_in(commodity)
if records empty AND CEDA_API available:
    records = fetch_from_ceda(commodity)
```

**Step 2: Process Live Records**
```python
# API returns multiple records (different mandis, states)
latest_records = records[latest_date]  # Today's records only

# Calculate average price
prices = [record["modal_price"] for record in latest_records]
avg_price = mean(prices)
```

**Step 3: Return Result**
```json
{
  "status": "success",
  "source": "agmarknet",
  "live": true,
  "records": [
    {
      "commodity": "wheat",
      "market": "delhi",
      "date": "2024-02-15",
      "modal_price": 2600,
      "min_price": 2580,
      "max_price": 2620,
      "state": "delhi"
    },
    ...
  ],
  "message": "✓ Live from API",
  "latest_date": "2024-02-15"
}
```

**Fallback (if API fails):**
```python
# Use latest day from historical CSV
latest_price = crop_data.iloc[-1]["modal_price"]
latest_date = crop_data.iloc[-1]["price_date"]

# Return as fallback
{
  "status": "success",
  "source": "local_csv",
  "live": false,
  "value": latest_price,
  "date": latest_date,
  "message": "Using latest historical data"
}
```

**Displayed as:** "Aaj Ka Bhav" card showing today's price

---

## 4. DERIVED METRICS EXPLAINED

### 4.1 Latest Price (₹/quintal)
```
Formula: Latest modal_price from most recent date in dataset
Example: 2500.00 INR

What it means: What the crop costs in markets today
```

### 4.2 30-Day Average Price
```
Formula: AVERAGE(modal_price for last 30 days)

Example:
Prices: 2400, 2420, 2440, 2460, 2480, ...
Average = Sum / 30 = 2450.50 INR

What it means: Typical price over past month
```

### 4.3 Price Trend (%)
```
Formula: ((Early Period Avg - Late Period Avg) / Early Period Avg) × 100

Example:
Early 30 days avg: 2100
Late 30 days avg: 2275
Change = ((2100 - 2275) / 2100) × 100 = -8.33%

Visual: ↓ 8.33% (downward trend)
        ↑ +12.5% (upward trend)
        → ~0% (stable)

What it means: Is price going up or down?
```

### 4.4 Trend Strength (0-100 scale)
```
Formula: |normalized_slope| × 100

Where normalized_slope = (daily_price_change / average_price) × 100

Example:
Slope = 1.5 rupees per day
Average price = 2500
Normalized slope = (1.5 / 2500) × 100 = 0.06%
Strength = 0.06%

What it means: 0-1% = weak, 1-5% = medium, 5%+ = strong
```

### 4.5 Price Stability Classification
```
Formula: Based on Coefficient of Variation (CV)

CV = Standard_Deviation / Mean_Price

Classification:
- CV < 5%:  "stable"           (predictable)
- CV 5-15%: "moderate"         (some variation)
- CV > 15%: "volatile"         (unpredictable, risky)

Example:
Prices: 2400, 2420, 2410, 2430, 2405, 2425, 2415
Mean = 2415
StdDev = 10.5
CV = 10.5 / 2415 = 0.43% → Stable
```

### 4.6 Demand Trend
```
Formula: Based on price trend direction

Rule:
- If trend increasing → demand_trend = "high"
- If trend stable → demand_trend = "moderate"  
- If trend decreasing → demand_trend = "low"

Why? When prices go up = buyers want it (high demand)
     When prices go down = buyers don't want it (low demand)
```

### 4.7 Market Risk Level
```
Formula: Based on price stability

Rule:
- Volatile → market_risk = "high"     (risky to sell)
- Moderate → market_risk = "medium"   (some risk)
- Stable → market_risk = "low"        (safe to sell)

Why? If prices swing wildly, you can't predict them.
     If prices are stable, you know what to expect.
```

### 4.8 30-Day Price Forecast (₹/quintal)
```
Formula: Random Forest ML model trained on historical data

Input Features:
1. date_ordinal - Days since Jan 1, year 1
2. month - 1-12
3. dayofyear - 1-365

Model: RandomForestRegressor (200 trees, max depth 10)

Output: Predicted average price for next 30 days

Example:
Historical data (100 points) → Train model → Predict 30 days → Avg = 2550

What it means: Average price expected for next month
```

### 4.9 Confidence Level (0-1 scale)
```
Formula: 0.5 + (number_of_records / 90) × 0.45

Ranges from 0.5 to 0.95

Example:
30 records: 0.5 + (30/90) × 0.45 = 0.65 → Low confidence
90 records: 0.5 + (90/90) × 0.45 = 0.95 → High confidence

What it means: More historical data = more confident in predictions
```

---

## 5. DATA FLOW SUMMARY

```
┌──────────────────────────────────────┐
│ Agriculture Price CSV (47,615 rows) │
│ - Commodity, Date, Price            │
│ - Market, State, District           │
└────────────────┬─────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│ Data Processing                      │
│ - Normalize text                     │
│ - Extract date features              │
│ - Sort by date                       │
└────────────────┬─────────────────────┘
                 │
    ┌────────────┼────────────┬────────────┬──────────────┐
    │            │            │            │              │
    ▼            ▼            ▼            ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐
│Commodities│ │Market    │  │Price     │  │Trend     │  │Forecast │
│list       │ │Insights  │  │History   │  │Analysis  │  │Model    │
└────┬────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘
     │            │             │             │             │
     └────────────┼─────────────┼─────────────┼─────────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  Frontend (React)│
         │ - Display charts │
         │ - Show cards     │
         │ - Market summary │
         └──────────────────┘
```

---

## 6. EXAMPLE: COMPLETE DATA JOURNEY

### Scenario: Farmer selects "Wheat" crop

#### Step 1: Frontend requests
```
GET /api/ceda/commodities
GET /api/market-insights/wheat
GET /api/agmarket/history?commodity=wheat&days=90
GET /api/agmarket/live?commodity=wheat&source=api
```

#### Step 2: Backend processes

**Commodities List:**
```python
commodities = ["Wheat", "Potato", "Tomato", ...]
```

**Market Insights:**
```python
# Filter wheat data
wheat_data = market_prices[market_prices["commodity"] == "wheat"]
# Total records: 1200 price points over 365 days

# Extract metrics
latest_price = 2500.00
latest_date = 2024-02-15
avg_30 = 2450.50

# Analyze trend (90-day periods)
early_avg = 2100.00
late_avg = 2275.00
trend = "increasing" (slope: 1.96 rupees/day)
strength = 2.35%
confidence = 0.85

# Stability
stddev = 85.5
mean = 2200
CV = 3.88% → "stable"

# Forecast
model.predict(next_30_days) → avg = 2550, min = 2480, max = 2620
```

**Historical Chart Data:**
```python
# Last 90 days daily averages
2024-01-16: 2380
2024-01-17: 2385
...
2024-02-15: 2560
```

**Mandi Comparison:**
```python
# Latest date prices by mandi
Delhi Amar Nath: 2600
Punjab Jalandhar: 2580
Haryana Rohtak: 2560
...
```

#### Step 3: Backend returns JSON

```json
{
  "market_data": {
    "latest_price": {"value": 2500.00},
    "recent_average": {"value": 2450.50, "days": 30},
    "trend_details": {
      "trend": "increasing",
      "strength": 2.35,
      "confidence": 0.85
    },
    "forecast_30d": {
      "avg": 2550.00,
      "min": 2480.00,
      "max": 2620.00
    }
  }
}
```

#### Step 4: Frontend displays

- **Aaj Ka Bhav Card:** "₹2,500 per quintal"
- **Trend Card:** "↑ +8.33% (Increasing)"
- **30-day Forecast:** "₹2,550 expected"
- **Price Trend Chart:** Line showing last 90 days
- **Mandi Comparison:** Bar chart with best prices
- **Market Summary:** "Demand: High, Stability: Stable, Risk: Low"

---

## 7. KEY FORMULAS QUICK REFERENCE

| Metric | Formula | Meaning |
|--------|---------|---------|
| **Latest Price** | `latest_row["modal_price"]` | Today's price |
| **30-Day Avg** | `mean(prices[-30:])` | Average last month |
| **Price Change %** | `((late - early) / early) × 100` | Up or down? |
| **Trend Strength** | `(slope / mean_price) × 100` | How strong? |
| **Stability (CV)** | `std_dev / mean_price` | Predictable? |
| **Demand** | `"high" if increasing else "low"` | Market want it? |
| **Market Risk** | Based on CV value | Safe to sell? |
| **30-d Forecast** | Random Forest ML model | Expected price? |
| **Confidence** | `0.5 + (records/90) × 0.45` | Trust the data? |

---

## 8. EXAMPLE DATA VALUES

### Sample: Wheat Market Analysis

```
Latest Data (Feb 15, 2024):
  - Current Price: ₹2,500/quintal
  - Latest Date: Feb 15, 2024
  
30-Day Snapshot (Jan 16 - Feb 15):
  - Average: ₹2,450.50/quintal
  - Min: ₹2,400/quintal
  - Max: ₹2,550/quintal
  
90-Day Analysis:
  - Early Period (30 days): ₹2,100/quintal
  - Mid Period (30 days): ₹2,180/quintal
  - Late Period (30 days): ₹2,275/quintal
  - Trend: Increasing
  - Change: +8.33%
  - Strength: 2.35%
  - Confidence: 0.85 (85%)
  
Stability:
  - Coefficient of Variation: 3.85%
  - Classification: Stable
  - Market Risk: Low
  
30-Day Forecast (Feb 16 - Mar 16):
  - Expected Average: ₹2,550/quintal
  - Expected Min: ₹2,480/quintal
  - Expected Max: ₹2,620/quintal
  - Model: RandomForestRegressor
  
Best Mandi Today (Top 5):
  1. Delhi Amar Nath: ₹2,600 (+₹100)
  2. Punjab Jalandhar: ₹2,580 (+₹80)
  3. Haryana Rohtak: ₹2,560 (+₹60)
  4. UP Meerut: ₹2,540 (+₹40)
  5. Bihar Patna: ₹2,500 (baseline)
```

### Sample: Tomato Market Analysis

```
Latest Data (Feb 15, 2024):
  - Current Price: ₹800/quintal
  - Latest Date: Feb 15, 2024
  
30-Day Average: ₹750/quintal

90-Day Analysis:
  - Early Period: ₹600
  - Late Period: ₹850
  - Trend: Increasing
  - Change: +41.67%
  - Strength: 7.8%
  - Confidence: 0.80
  
Stability:
  - Coefficient of Variation: 18.5%
  - Classification: Volatile
  - Market Risk: High
  
Recommendation:
  "Tomato prices show strong increasing trend with 7.8% strength.
   Price is volatile (18.5% CV), so high risk. Expected 30-day 
   average: ₹900/quintal. Best to sell soon while prices are up!"
```

---

## 9. DATA QUALITY NOTES

### What Data is Included
✅ Daily price records from agricultural markets  
✅ Modal (most common) prices  
✅ Min and Max prices for the day  
✅ Multiple markets/mandis data  
✅ 365+ days of historical data  
✅ State and district level information

### What Data is Excluded
❌ Export/import data (domestic only)  
❌ Future contracts or derivatives  
❌ Dead/inactive market records  
❌ Records with NULL modal prices

### Data Recency
- Most recent: Today (updated daily)
- Historical: Back to 2016+
- Update frequency: Daily from agricultural markets
- API refresh: Real-time when available

---

## 10. USER INTERPRETATION GUIDE

### What to do with Trend Information?

```
Trend: INCREASING ↑
Price Change: +8.33%
Strength: Medium (2.35%)
Confidence: 85%

Interpretation:
  ✓ Demand is rising
  ✓ Prices are going up
  ✓ Good time to sell (eventually)
  ⚠ Wait a bit more for even better prices?
  
Decision: Hold crop 1-2 weeks for higher prices
```

### What to do with Stability Information?

```
Stability: STABLE
CV: 3.85%
Market Risk: Low

Interpretation:
  ✓ Prices are predictable
  ✓ No wild swings
  ✓ Safe to sell anytime
  
Decision: Sell whenever convenient
```

### What to do with Forecast?

```
30-Day Forecast Average: ₹2,550/quintal
Current Price: ₹2,500/quintal
Expected Increase: +₹50 (+2%)

Interpretation:
  ✓ Prices expected to stay stable/increase
  ✓ Wait 1-2 weeks for ₹50 more profit
  ⚠ But if prices already decreasing, sell today
  
Decision: Check trend + forecast together
```

### What to do with Mandi Comparison?

```
Your Local Mandi: ₹2,500/quintal
Best Mandi: ₹2,600/quintal
Difference: +₹100 per quintal

Interpretation:
  ✓ Nearby better mandi offers ₹100 more
  100 quintals × ₹100 = ₹10,000 extra profit!
  
Decision: If transport cost < ₹100, go to better mandi
```

---

## 11. LIMITATIONS & CONSIDERATIONS

### What the System Cannot Tell You
- Specific future price (only trends/forecasts)
- Quality/grade effects on price
- Buyer availability or demand
- Government policy changes
- Natural disasters or weather events

### Important Assumptions
- Historical patterns repeat (not always true!)
- Data quality is consistent
- No major market disruptions
- Seasonal patterns are recognized

### Best Practices for Farmers
1. Use Market Insights as ONE input, not the only one
2. Check multiple mandis before deciding
3. Monitor trend + forecast + current price together
4. Consider transport and operational costs
5. Check weather and market news
6. Diversify - don't depend on one crop's price

---

## Summary

Every value on the Market Insights page comes from:
1. **Filtering** historical market price data by crop
2. **Aggregating** prices across dates and markets
3. **Analyzing** trends using statistical methods (regression, CV)
4. **Forecasting** using machine learning (Random Forest)
5. **Classifying** risk and demand based on metrics

The data transformations are transparent and repeatable—farmers can understand exactly why the app says what it says about their crop's market!
