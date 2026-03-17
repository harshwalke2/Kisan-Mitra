# KAISAN Testing & QA Guide

This document outlines comprehensive testing strategies for the KAISAN system.

## 📋 Testing Overview

Tests are organized by component:
- **Backend API Tests**
- **Frontend Component Tests**
- **Integration Tests**
- **Performance Tests**
- **Security Tests**
- **Accessibility Tests**

---

## 🔵 Backend API Testing

### 1. Health Check Endpoint

```bash
# Test
curl http://localhost:5000/api/health

# Expected
{
  "status": "healthy",
  "timestamp": "2024-02-16T10:30:00.123456",
  "crops": 22,
  "models": ["crop_classifier", "yield_predictor"]
}
```

### 2. Crops List Endpoint

```bash
# Test
curl http://localhost:5000/api/crops/list

# Verify
- Returns 22 crops
- All crop names are lowercase
- No duplicates
```

### 3. Crop Recommendation Endpoint

#### Test Case 1: Valid Input

```bash
curl -X POST http://localhost:5000/api/recommend-crop \
  -H "Content-Type: application/json" \
  -d '{
    "nitrogen": 50,
    "phosphorus": 40,
    "potassium": 60,
    "temperature": 25,
    "humidity": 75,
    "ph": 6.5,
    "rainfall": 150
  }'

# Verify
- Status: success
- primary_recommendation: string
- confidence: 0-100
- top_recommendations: array of 5 items
- Each recommendation has: crop, confidence, estimated_yield
```

#### Test Case 2: Missing Fields

```bash
curl -X POST http://localhost:5000/api/recommend-crop \
  -H "Content-Type: application/json" \
  -d '{
    "nitrogen": 50
  }'

# Expected Error
{
  "status": "error",
  "message": "Missing fields: phosphorus, potassium, ..."
}
```

#### Test Case 3: Out of Range Values

```bash
curl -X POST http://localhost:5000/api/recommend-crop \
  -H "Content-Type: application/json" \
  -d '{
    "nitrogen": 1000,  # Too high
    "phosphorus": -10,  # Negative
    "potassium": 60,
    "temperature": 100,  # Too high
    "humidity": 150,  # Over 100
    "ph": 0,  # Too low
    "rainfall": -50  # Negative
  }'

# Verify: Proper error handling
```

#### Test Case 4: Edge Cases

```bash
# Minimum values
curl -X POST http://localhost:5000/api/recommend-crop \
  -H "Content-Type: application/json" \
  -d '{
    "nitrogen": 0,
    "phosphorus": 0,
    "potassium": 0,
    "temperature": 5,
    "humidity": 0,
    "ph": 3,
    "rainfall": 0
  }'

# Maximum values
curl -X POST http://localhost:5000/api/recommend-crop \
  -H "Content-Type: application/json" \
  -d '{
    "nitrogen": 140,
    "phosphorus": 145,
    "potassium": 205,
    "temperature": 50,
    "humidity": 100,
    "ph": 10,
    "rainfall": 300
  }'
```

### 4. Market Insights Endpoint

```bash
curl http://localhost:5000/api/market-insights/rice

# Verify structure
{
  "status": "success",
  "crop": "rice",
  "market_data": {
    "demand_trend": string,
    "price_stability": string,
    "global_demand": string
  },
  "risk_assessment": {
    "weather_risk": string,
    "market_risk": string,
    "disease_risk": string,
    "overall_risk": string
  },
  "optimal_conditions": {
    "temperature_range": string,
    "humidity_range": string,
    "ph_range": string,
    "rainfall_range": string
  },
  "seasonal_info": {
    "best_season": string,
    "growing_period": string,
    "harvest_time": string
  }
}
```

### 5. Seasonal Recommendations

```bash
# Test each season
curl http://localhost:5000/api/seasonal-recommendations/summer
curl http://localhost:5000/api/seasonal-recommendations/winter
curl http://localhost:5000/api/seasonal-recommendations/rainy
curl http://localhost:5000/api/seasonal-recommendations/spring

# Verify
- Returns array of crops
- Each season has relevant crops
- Response time < 100ms
```

### 6. Model Info Endpoint

```bash
curl http://localhost:5000/api/model-info

# Verify metrics
- crop_classifier.type: "RandomForestClassifier"
- crop_classifier.accuracy: ~0.99
- yield_predictor.type: "RandomForestRegressor"
- yield_predictor.r2_score: ~0.954
```

### 7. Feature Importance

```bash
curl http://localhost:5000/api/feature-importance

# Verify
- Array of features with importance scores
- Sum of importances = ~1.0
- 14 features total
- Sorted by importance (highest first)
```

---

## 🔴 Frontend Component Testing

### 1. Navigation

```javascript
// Test Cases
- Home link navigates to /
- Get Recommendation link navigates to /recommend
- Market Insights link navigates to /market-insights
- Logo click navigates to /
- Mobile menu opens/closes correctly
```

### 2. Home Page

```javascript
// Elements to verify
- Hero header displays correctly
- 6 feature cards render
- "How it Works" section shows 4 steps
- Statistics section shows 4 metrics
- CTA buttons navigate correctly
- Footer is visible
- Responsive on mobile (stack to single column)
```

### 3. Recommendation Form

```javascript
// Form Validation Tests
- All required fields show error when empty
- Nitrogen: 0-140 range validation
- Phosphorus: 0-145 range validation
- Potassium: 0-205 range validation
- Temperature: 5-50 range validation
- Humidity: 0-100 range validation
- pH: 3-10 range validation
- Rainfall: 0-300 range validation

// Form Submission
- Valid form submits successfully
- API call is made to /api/recommend-crop
- Loading spinner shows during processing
- Results page displays on success
- Error message shows on failure
```

### 4. Results Page

```javascript
// Content Verification
- Primary recommendation displays
- Confidence score shows progress bar
- "Top Recommendation" badge shows
- Alternative options list displays
- Each option is clickable
- Risk assessment shows 4 items
- Optimal conditions cards display
- Seasonal timeline section shows
- Action buttons navigate correctly

// Dynamic Content
- Selecting alternative crop updates display
- Risk data updates when crop changes
```

### 5. Market Insights Page

```javascript
// Season Selection
- 4 season buttons render
- Selected season highlights
- Clicking season updates crop list
- Loading spinner shows during fetch

// Crop Selection
- Crops list populates from API
- Clicking crop updates market data
- First crop auto-selects

// Data Display
- Market trends display correctly
- Risk assessment shows 4 items
- Optimal conditions display 4 boxes
- Seasonal timeline displays 3 items
- Tips section shows 6 tips
```

---

## 🟢 Integration Tests

### Complete User Flow 1: Get Recommendation

```
1. User navigates to /recommend
2. Fills form with valid data
3. Submits form
4. API returns recommendation
5. Results page displays
6. Alternative crops clickable
7. Risk data updates on crop change
```

### Complete User Flow 2: Explore Market

```
1. User navigates to /market-insights
2. Selects a season
3. API returns seasonal crops
4. Clicks on a crop
5. API returns market insights
6. Data displays all sections
7. Navigates to different seasons
```

### Complete User Flow 3: Recommendation to Insights

```
1. User gets recommendation
2. Clicks "Explore More Insights"
3. Market insights page displays
4. Selected crop data shows
5. User can explore other crops
```

---

## ⚡ Performance Tests

### Backend Performance

```bash
# Response Time Test
time curl http://localhost:5000/api/recommend-crop \
  -H "Content-Type: application/json" \
  -d '{...}'

# Expected: < 500ms
```

### Load Testing (Apache Bench)

```bash
# Install
apt install apache2-utils

# Test 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost:5000/api/health

# Verify
- Requests per second > 100
- Failed requests = 0
- Mean time per request < 100ms
```

### Frontend Performance

```bash
# Build analysis
cd frontend
npm run build
npm install -g webpack-bundle-analyzer
npx webpack-bundle-analyzer ./build/static/js/main.*.js
```

---

## 🔒 Security Tests

### Input Validation

```bash
# SQL Injection test
curl -X POST http://localhost:5000/api/recommend-crop \
  -H "Content-Type: application/json" \
  -d '{"nitrogen": "1; DROP TABLE--", ...}'

# Should sanitize/reject

# Script injection test
curl http://localhost:5000/api/market-insights/'<script>alert(1)</script>'

# Should return 404 or sanitized
```

### CORS Testing

```bash
# Should allow from localhost:3000
curl -H "Origin: http://localhost:3000" \
  http://localhost:5000/api/health

# Should reject from other origins (optional)
```

### Rate Limiting (when implemented)

```bash
# Make 100 requests to same endpoint
for i in {1..100}; do
  curl http://localhost:5000/api/health
done

# Verify rate limit kicks in after threshold
```

---

## ♿ Accessibility Tests

### Manual Testing

```
1. Keyboard Navigation
   - Tab through all form inputs
   - Enter submits form
   - Escape closes modals
   - All links accessible via keyboard

2. Screen Reader
   - Use NVDA (Windows) or VoiceOver (macOS)
   - Test form labels are read correctly
   - Verify headings are announced
   - Check alt text (if images present)

3. Color Contrast
   - Primary green #2ecc71 on white: WCAG AAA
   - Text sizes readable at 110% zoom
   - Warning colors (orange/red) usable by colorblind users
```

### Automated Accessibility Testing

```bash
# Install axe DevTools Chrome Extension
# Run accessibility audit on each page
# Fix any violations
```

---

## 📊 Test Results Template

```
Date: 2024-02-16
Tester: [Name]
Browser: Chrome 120
OS: Windows 11

Test Case: [Name]
Status: ✓ PASS / ✗ FAIL
Issue: [If failed]
Notes: [Any observations]

Test Case: [Name]
Status: ✓ PASS / ✗ FAIL
...

Overall Result: ✓ ALL TESTS PASSING
```

---

## 🔄 Continuous Testing

### Pre-Deployment Checklist

- [ ] All backend API endpoints respond correctly
- [ ] All forms validate input properly
- [ ] All pages responsive on mobile
- [ ] Error messages display clearly
- [ ] Performance metrics acceptable
- [ ] No CORS errors
- [ ] All links navigate correctly
- [ ] Models loaded successfully
- [ ] No console errors in browser
- [ ] Database connections working
- [ ] Environment variables configured
- [ ] Logs being recorded properly

---

## 📝 Bug Report Template

```
Title: [Brief description]

Environment:
- OS: [Windows/macOS/Linux]
- Browser: [Chrome/Firefox/Safari]
- Backend Status: Running/Not Running
- Frontend URL: http://...

Steps to Reproduce:
1. [First action]
2. [Second action]
3. [Expected vs Actual result]

Error Messages:
[Copy from console/network tab]

Screenshots:
[Attach if relevant]

Severity: Critical/High/Medium/Low
```

---

## ✅ Quality Metrics

Track these metrics:

- **API Test Pass Rate**: Target 100%
- **Frontend Component Test Pass Rate**: Target 100%
- **Performance (Response Time)**: Target < 500ms
- **Accessibility Score**: Target > 90/100
- **Browser Coverage**: Chrome, Firefox, Safari, Edge
- **Mobile Compatibility**: 100% on phones/tablets
- **Code Coverage**: Target > 80%

---

**Good luck with testing! 🧪**
