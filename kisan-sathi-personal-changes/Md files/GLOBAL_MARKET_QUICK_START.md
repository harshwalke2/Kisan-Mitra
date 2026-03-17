# Global Market Access - Quick Reference Guide

## 🌐 What is Global Market Access?

A new page in Kisan-Sathi that shows farmers worldwide export demand for agricultural commodities, helping them understand international market opportunities and make informed planting decisions.

---

## 📍 How to Access

1. **From Navigation**: Click "Global Market" in the top navbar
2. **Direct URL**: `http://localhost:3000/global-market`
3. **Menu**: Available from main navigation on all pages

---

## 🎯 Two Main Features

### 1️⃣ Global Demand (Default Tab)

**What You See**:
- 📊 Export demand trend (3-year line chart)
- 🎯 Next year forecast with confidence level
- 🏆 Top 8 exporting countries (bar chart)
- 📈 Country comparison trends (multi-line chart)

**How to Use**:
1. Tab is selected by default
2. Search for your crop (e.g., "Rice")
3. View the demand trends
4. Check which countries export the most
5. Use forecast to plan production

**Example Insights**:
- Rice demand growing 5% annually
- Top exporter: India (12M tonnes)
- Next year forecast: 15.5M tonnes

---

### 2️⃣ By Country

**What You See**:
- 🏢 Top 15 commodities for selected country
- 📦 Export data by year
- 💰 Export values in USD

**How to Use**:
1. Click "By Country" tab
2. Select a country (Brazil, Mexico, USA, etc.)
3. See their top export products
4. View year-over-year data

**Example Insights**:
- Brazil exports 250+ commodities
- Top: Coffee, Sugarcane, Soybeans
- Exports growing year-over-year

---

## 📊 Available Data

| Category | Data |
|----------|------|
| **Countries** | 8 (USA, Brazil, Mexico, UK, UAE, Kuwait, Luxembourg, Mauritius) |
| **Commodities** | 455+ products |
| **Time Period** | 2022-2024 historical + 2025 forecast |
| **Metrics** | Export quantity (tonnes) + Export value (USD) |
| **Update Frequency** | Updated with latest FAOSTAT data |

---

## 🔍 Search & Filter

### Global Demand Tab
- **Search Box**: Type commodity name
- **Auto-complete**: Shows matching commodities
- **Case Insensitive**: Works with any spelling variation
- **Instant Filter**: Results update as you type

### By Country Tab
- **Search Box**: Type country name
- **Auto-complete**: Shows matching countries
- **Exact Match**: Only exact country names

---

## 📈 Understanding the Charts

### 1. Demand Trend (Line Chart)
- **X-axis**: Year (2022, 2023, 2024)
- **Y-axis**: Export volume (in millions of tonnes)
- **Red Dot**: Highest point = peak export year
- **Trend**: Up arrow = growing, Down = declining, Level = stable

### 2. Top Exporters (Bar Chart)
- **Height**: Export volume of each country
- **Dark Green**: #1 exporter
- **Light Green**: Lower ranked exporters
- **Ordered**: Left to right by volume

### 3. Country Comparison (Multi-Line Chart)
- **Multiple Lines**: Each country represented
- **Different Colors**: Easy distinction
- **Legend**: Shows country names
- **Hover**: See exact values

### 4. Export Summary (Table)
- **Columns**: Commodity | Year | Quantity | Unit
- **Sortable**: Click headers to sort
- **Scrollable**: See up to 10 records
- **Color Coded**: Alternating rows for readability

---

## 💡 Farmer Tips

### Planning Production
1. Check global demand trend - is it growing?
2. Look at forecast - expect demand to grow/shrink?
3. See top exporters - understand competition
4. Compare with home market prices - is export price better?

### Finding Opportunities
1. Look for commodities with **increasing** demand
2. Check if demand forecast is **high confidence**
3. See if your country exports it already
4. Compare with current market prices

### Risk Assessment
1. Decreasing demand (↘️) = risk
2. Stable demand (→) = steady income
3. Increasing demand (↗️) = opportunity
4. Low confidence forecast = wait and see

---

## 🔗 Related Features

| Feature | Purpose | Link |
|---------|---------|------|
| **Market Insights** | Local market prices | Click in navbar |
| **Crop Recommendation** | Get crop suggestions | Click in navbar |
| **Results** | View detailed analysis | After recommendation |

---

## ❓ FAQ

### Q: How often is the data updated?
**A**: Data from FAOSTAT (FAO Food Database). Currently 2022-2024 data with 2025 forecasts. Updates when new official data is released.

### Q: Why is my commodity not showing?
**A**: 455+ commodities are included. Try different spellings. If still not found, it may not have trade data for selected countries.

### Q: How accurate are the forecasts?
**A**: Uses linear regression on 3-year history. Confidence level shows reliability:
- **High** = Strong trend, high accuracy
- **Medium** = Moderate trend
- **Low** = Weak signal, use with caution

### Q: Can I export the data?
**A**: Not yet, but you can take screenshots. CSV export coming soon.

### Q: Mobile friendly?
**A**: Yes! Works on phones, tablets, and desktops. Auto-adjusts layout.

---

## 🐛 Troubleshooting

### Issue: "Global market data not available"
**Solution**: Make sure backend is running. Restart server.

### Issue: No data shown for commodity
**Solution**: Try another commodity. Not all commodities have data for all countries.

### Issue: Charts not displaying
**Solution**: Hard refresh browser (Ctrl+Shift+R). Clear browser cache.

### Issue: Slow loading
**Solution**: Normal on first load (2-3 seconds). Subsequent loads are faster.

---

## 🎓 Key Metrics to Look For

### Demand Level
- **High**: 10M+ tonnes/year
- **Medium**: 1M-10M tonnes/year
- **Low**: <1M tonnes/year

### Growth Rate
- **Strong Growth**: >10% year-over-year
- **Moderate Growth**: 3-10% annually
- **Flat**: 0-3% change
- **Declining**: Negative %

### Forecast Confidence
- **High**: Strong trend, reliable prediction
- **Medium**: Moderate trend, okay prediction
- **Low**: Weak trend, uncertain prediction

---

## 📱 Device Support

| Device | Status | Notes |
|--------|--------|-------|
| Desktop | ✅ Full | Best experience |
| Tablet | ✅ Full | Optimized layout |
| Mobile | ✅ Full | Stacked layout |
| Small Phone | ✅ Full | Touch optimized |

---

## 🔐 Data Privacy

- **No Personal Data Collected**: Your selections are not saved
- **Public Data Only**: Uses FAOSTAT public database
- **No Cookies**: No tracking cookies
- **Anonymous Usage**: All sessions are anonymous
- **No Export Restrictions**: Can analyze freely

---

## 💬 Support & Feedback

### Getting Help
- Check documentation files in project folder
- Review API examples in `test_global_api.py`
- See error messages - they're helpful!

### Reporting Issues
- Note the commodity/country that caused issue
- Note browser and device type
- Include screenshot if possible
- Describe what happened

---

## 🎯 Quick Start (3 Steps)

1. **Click "Global Market"** in navbar
2. **Search commodity** (e.g., "Rice")
3. **View demand trend** and make decision!

---

## 📊 Sample Data Points

### Rice
- 2024 Global Exports: 15.2M tonnes
- Growth: +2% vs 2023
- Top Exporter: India (12M tonnes)
- 2025 Forecast: 15.5M tonnes (High confidence)
- Trend: ↗️ Increasing

### Wheat
- 2024 Global Exports: 210M tonnes
- Growth: +1% vs 2023
- Top Exporter: USA (40M tonnes)
- 2025 Forecast: 215M tonnes (Medium confidence)
- Trend: → Stable

### Sugarcane
- 2024 Global Exports: 1.8M tonnes
- Growth: +8% vs 2023
- Top Exporter: Brazil (1.2M tonnes)
- 2025 Forecast: 1.95M tonnes (High confidence)
- Trend: ↗️ Increasing

---

## 🚀 Next Steps

1. **Explore**: Try different commodities and countries
2. **Compare**: Use by-country tab to find opportunities
3. **Plan**: Use forecasts to decide what to grow
4. **Monitor**: Check back regularly for updates
5. **Combine**: Use with Local Market Insights for full picture

---

## 📚 Documentation

For detailed information, see:
- `GLOBAL_MARKET_ACCESS_GUIDE.md` - Complete guide
- `IMPLEMENTATION_GLOBAL_MARKET.md` - Technical details
- `GLOBAL_MARKET_COMPLETE_SUMMARY.md` - Project summary

---

**Last Updated**: February 22, 2026  
**Status**: ✅ Ready to Use  
**Support**: Check documentation files
