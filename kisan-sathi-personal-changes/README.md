# KISAN - Crop Recommendation & Decision Support System

![KISAN Banner](https://img.shields.io/badge/Version-1.1.0-green)
![Python](https://img.shields.io/badge/Python-3.8+-blue)
![React](https://img.shields.io/badge/React-18.2.0-61dafb)
![Flask](https://img.shields.io/badge/Flask-2.3.2-black)

## 🌾 **Project Overview**

KISAN is an intelligent agricultural decision support system designed to help Indian farmers make data-driven decisions about crop selection. The system recommends the best crops to grow based on:

- **Soil Conditions**: Nitrogen (N), Phosphorus (P), Potassium (K) levels
- **Environmental Factors**: Temperature, humidity, pH, and rainfall
- **Market Trends**: Local demand, pricing, and global market access
- **Location Assistance**: State/district-based soil defaults for farmers without lab reports
- **Seasonal Guidance**: Optimal crops for each season

### Key Features

✅ **99.09% Accurate Crop Classification** - Using Random Forest ML model  
✅ **95% Yield Prediction Accuracy** - Estimated yield predictions  
✅ **22 Supported Crops** - Comprehensive coverage of major Indian crops  
✅ **Beautiful Farmer-Centric UI** - Mobile-responsive, easy-to-use interface  
✅ **12-Language Support** - Built-in translation options for Indian users  
✅ **Location-Based Input Mode** - Auto-fill soil values by state and district  
✅ **Market Insights** - Live prices, 90-day trends, seasonal recommendations  
✅ **Aaj Ka Bhav (Live)** - Direct API-only price feed when available  
✅ **Risk Management** - Comprehensive risk assessment for informed decisions  
✅ **Real-time Recommendations** - Instant crop suggestions based on input conditions  
✅ **Fertilizer Advisor** - ML-based fertilizer recommendations  
✅ **Global Market Access** - Export demand, top exporters, commodity trends  
✅ **Government Schemes** - Central/state schemes with filters and eligibility  
✅ **WhatsApp Bot** - Automated menu-driven guidance for farmers  
✅ **Web Chat Bot** - Botpress webchat embedded in the UI  

---

## 🏗️ **System Architecture**

```
KISAN/
├── app.py                        # Flask API server
├── requirements.txt              # Python dependencies
├── data/
│   ├── models/                   # Pre-trained ML models + metadata
│   ├── processed/                # Cleaned/merged datasets
│   └── kaggel/                   # Raw source datasets
├── training/                     # Data cleaning, feature engineering, model training scripts
├── frontend/
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── pages/                # Page components
│   │   ├── styles/               # CSS modules
│   │   └── App.jsx               # Main app component
│   ├── public/
│   │   └── index.html            # HTML entry point
│   └── package.json              # React dependencies
│
└── README.md
```

---

## 🚀 **Quick Start Guide**

### Prerequisites

- **Python** 3.8+ (for backend)
- **Node.js** 14+ (for frontend)
- **npm** or **yarn**
- **Git**

### 1️⃣ Clone the Repository

```bash
git clone <repository-url>
cd kisan
```

### 2️⃣ Setup Backend

#### Install Python Dependencies

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Run Flask Server

```bash
# Make sure you're in the project root directory
python app.py
```

The backend will start on `http://localhost:5000`

**API Health Check:**
```bash
curl http://localhost:5000/api/health
```

### 3️⃣ Setup Frontend

#### Install Dependencies

```bash
cd frontend
npm install
```

#### Run React Development Server

```bash
npm start
```

The frontend will open on `http://localhost:3000`

---

## 📊 **API Endpoints**

### Health Check
```http
GET /api/health
```

### Get Available Crops
```http
GET /api/crops/list
```

### Get Locations
```http
GET /api/locations
```

### Get Soil Defaults by Location
```http
GET /api/soil-data?state={state}&district={district}
```

### Get Nearby Soil Testing Centers
```http
GET /api/testing-centers?state={state}
```

### Get Crop Recommendations
```http
POST /api/recommend-crop
Content-Type: application/json

{
  "nitrogen": 50.0,
  "phosphorus": 40.0,
  "potassium": 60.0,
  "temperature": 25.0,
  "humidity": 75.0,
  "ph": 6.5,
  "rainfall": 150.0
}
```

**Response:**
```json
{
  "status": "success",
  "primary_recommendation": "rice",
  "confidence": 94.5,
  "top_recommendations": [
    {
      "crop": "rice",
      "confidence": 94.5,
      "estimated_yield": 45.3,
      "unit": "kg/ha"
    }
  ]
}
```

### Predict Yield
```http
POST /api/yield-prediction
Content-Type: application/json

{
  "nitrogen": 50.0,
  "phosphorus": 40.0,
  "potassium": 60.0,
  "temperature": 25.0,
  "humidity": 75.0,
  "ph": 6.5,
  "rainfall": 150.0,
  "crop": "rice"
}
```

### Get Market Insights
```http
GET /api/market-insights/{crop}
```

### Get Global Market Data
```http
GET /api/global/countries
GET /api/global/commodities
GET /api/global/export-demand?commodity={commodity}
GET /api/global/export-by-country/{country}
GET /api/global/top-exporters?commodity={commodity}&year=2024&limit=10
```

### WhatsApp Webhook
```http
GET /webhook
POST /webhook
```

---

## 🎨 **Frontend Pages**

### 🏠 **Home Page**
- Feature showcase with 6 key capabilities
- How it works step-by-step guide
- Statistics about the system
- CTA buttons for recommendations and insights

### 🌾 **Get Recommendations Page**
- Dual input mode: manual entry or location-based auto-fill
- Real-time input validation
- Form sections:
  - Soil Nutrients (NPK)
  - Soil pH
  - Environmental Conditions (temperature, humidity, rainfall)
- Tips section for farmers

### 📊 **Results Page**
- Top crop recommendation with confidence score
- Priority yield prediction
- Alternative crop options
- Risk assessment
- Market insights specific to selected crop
- Optimal growing conditions
- Seasonal information

### 📈 **Market Insights Page**
- Season selection (Summer, Winter, Rainy, Spring)
- Seasonal crop recommendations
- Market trends and 90-day price stability
- Risk assessment dashboard
- Optimal growing conditions
- Growing timeline
- Farmer tips and best practices

### 🌍 **Global Market Access Page**
- Country and commodity exploration
- Export demand charts and top exporters
- Commodity trend insights for global trade

### 🏛️ **Government Schemes Page**
- Central and state scheme filters
- Eligibility, benefit, and department details
- Official portal links and categories
