# Weather API Integration - KISAN Weather Auto-Fill Feature

## 🌦️ Overview

KISAN now integrates **real-time weather data** from WeatherAPI to automatically fill temperature, humidity, and rainfall fields. Users can enter their city, and the system will fetch live weather conditions to provide more accurate crop recommendations.

---

## 🚀 How It Works

### User Flow (Frontend)
1. User opens the Recommendation form
2. **Weather Section** at the top prompts: "Enter your city"
3. User types city name (e.g., "Mumbai") and clicks "Search" or presses Enter
4. System calls backend `/api/weather` endpoint
5. Backend fetches real-time data from WeatherAPI
6. Frontend auto-fills:
   - **Temperature** (°C)
   - **Humidity** (%)
   - **Rainfall** (cm)
7. User still selects State/District for soil NPK defaults
8. Ready to get crop recommendations!

### Complete Auto-Fill Combination
- **Weather**: City-based (real-time) → Temperature, Humidity, Rainfall
- **Soil**: State/District-based → Nitrogen, Phosphorus, Potassium, pH
- **Result**: Highly accurate recommendations combining soil + weather conditions

---

## 📡 Backend API

### Endpoint: `/api/weather`

**Method:** `GET`

**Query Parameters:**
- `city` (required): City name (e.g., "Mumbai", "Delhi", "Bangalore")

**Example Request:**
```bash
curl "http://localhost:5000/api/weather?city=Mumbai"
```

**Success Response (200):**
```json
{
  "status": "success",
  "city": "Mumbai",
  "weather_data": {
    "temperature": 28.5,
    "humidity": 72.0,
    "rainfall": 1.2,
    "condition": "Partly cloudy",
    "wind_kmh": 15.2,
    "pressure_mb": 1013.2,
    "latitude": 19.0759,
    "longitude": 72.8776
  },
  "timestamp": "2026-02-21T10:30:45.123456"
}
```

**Error Response (404) - City not found:**
```json
{
  "status": "error",
  "message": "City not found: xyz"
}
```

**Error Response (400) - Missing city:**
```json
{
  "status": "error",
  "message": "City name is required"
}
```

---

## 🔧 Technical Details

### Weather Data Source
- **API**: WeatherAPI.com
- **API Key**: `78c72e493fa14a03960131144262102`
- **Endpoint**: `https://api.weatherapi.com/v1/current.json`

### Data Mapping
| Field | Source | Unit | Usage |
|-------|--------|------|-------|
| temperature | `current.temp_c` | °C | Direct → Form Input |
| humidity | `current.humidity` | % | Direct → Form Input |
| rainfall | `current.precip_mm` | mm | Convert to cm → Form Input |
| condition | `current.condition.text` | Text | Display to user |
| wind_kmh | `current.wind_kph` | km/h | Extra context |
| pressure_mb | `current.pressure_mb` | mb | Extra context |

### Rainfall Conversion
```python
rainfall_mm = current.get('precip_mm', 0.0)
rainfall_cm = rainfall_mm / 10.0  # Convert mm to cm for model

# If no precipitation data, default to 15cm
if rainfall_cm == 0:
    rainfall_cm = 15.0
```

---

## 🎨 Frontend Integration

### New State Variables
```javascript
const [cityInput, setCityInput] = useState('');
const [weatherLoading, setWeatherLoading] = useState(false);
const [weatherFilled, setWeatherFilled] = useState(false);
```

### New Functions
```javascript
// Fetch weather data from backend
const fetchWeatherData = async (city) => { ... }

// Handle Enter key press
const handleWeatherSearch = (e) => {
  if (e.key === 'Enter') {
    fetchWeatherData(cityInput);
  }
}
```

### UI Components
- **Weather Search Section** at top of form
- **City Input Field** with placeholder suggestions
- **Search Button** with loading state
- **Success Message** when weather is loaded
- **Error Message** if city not found

### CSS Classes
```css
.input-with-button         /* Container for input + button */
.search-btn               /* Weather search button styling */
.section-description      /* Helper text below heading */
.info-box.success         /* Success message styling */
.optional                 /* Optional label styling */
```

---

## 🧪 Testing

### Test the API Endpoint
```bash
python test_weather_api.py
```

This script tests the weather endpoint with 5 major Indian cities:
- Mumbai
- Delhi
- Bangalore
- Pune
- Chennai

### Manual Testing in Browser
1. Start Flask backend: `python app.py`
2. Open frontend: `http://localhost:3000`
3. Navigate to Recommendation page
4. Enter city name (e.g., "Mumbai")
5. Click "Search" button
6. Verify weather fields auto-fill with real data

---

## 🐛 Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "City not found" | Invalid city name | Check spelling, try major city |
| "Weather API request timed out" | Network issue | Check internet connection |
| "Failed to fetch weather data" | Backend error | Check Flask logs, restart server |
| Empty weather fields | Weather endpoint unavailable | Make sure API key is valid |

---

## 🔐 Security Note

The API key is stored in the backend (`app.py`) and never exposed to the frontend, ensuring:
- ✅ API key cannot be compromised via client-side inspection
- ✅ All weather API calls go through your own backend
- ✅ Rate limiting can be implemented on backend if needed

---

## 📈 Future Enhancements

1. **Forecast Data**: Use 3-5 day forecast instead of current weather
2. **Seasonal Rainfall**: Combine current weather with historical rainfall patterns
3. **Soil Moisture**: Integrate soil moisture sensors with weather data
4. **Weather Alerts**: Notify users of extreme weather for their crops
5. **Historical Analysis**: Compare current conditions with seasonal norms

---

## 🌾 Use Case Example

**Farmer Scenario:**
```
1. Farmer (in Pune) opens KISAN
2. Enters city: "Pune"
3. Weather auto-fills:
   - Temperature: 26°C (current)
   - Humidity: 65% (current)
   - Rainfall: 2.5cm (current condition)
4. Selects State: "Maharashtra"
5. Selects District: "Pune"
6. Soil auto-fills:
   - N: 42 mg/kg (state average)
   - P: 38 mg/kg (state average)
   - K: 45 mg/kg (state average)
   - pH: 6.8 (state average)
7. Clicks "Get Recommendations"
8. Receives top 5 crop suggestions for CURRENT CONDITIONS:
   - Temperature 26°C + Pune soil → Sugarcane, Maize, Cotton...
```

---

## 📞 Support

For issues:
1. Check the test script: `python test_weather_api.py`
2. Verify API key validity: Check WeatherAPI dashboard
3. Check backend logs: Look for API response errors
4. Verify city name: Use major Indian cities first

---

**Happy Farming with Real-Time Weather! 🌾🌦️**

*KISAN - Making Agriculture Intelligent with Live Data*
