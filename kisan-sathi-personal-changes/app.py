"""
KISAN - Crop Recommendation & Decision Support System
Flask Backend API
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
import joblib
import json
import os
import requests
import urllib.request
import urllib.parse
from pathlib import Path
import logging
from datetime import datetime, timedelta
from urllib.parse import quote_plus
import csv
from sklearn.ensemble import RandomForestRegressor
from dotenv import load_dotenv
from difflib import SequenceMatcher

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

AGMARKET_API_KEY = os.environ.get("AGMARKET_API_KEY", "").strip()
DATA_GOV_IN_API_KEY = os.environ.get("DATA_GOV_IN_API_KEY", "").strip() or AGMARKET_API_KEY
DATA_GOV_IN_RESOURCE_IDS = [
    "variety-wise-daily-market-prices-data-commodity",
    "9ef84268-d588-465a-a308-a864a43d0070",
]
CEDA_AGMARKNET_BASE = "https://agmarknet.ceda.ashoka.edu.in/api"
_ceda_commodities_cache = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)
CORS(app)

# Model paths
MODEL_DIR = Path("data/models")
PROCESSED_DATA_DIR = Path("data/processed")

# Global variables for models
crop_classifier = None
yield_predictor = None
feature_scaler = None
encoders_info = None
model_metadata = None
training_data = None
market_prices = None
market_model_cache = {}
location_data = None
soil_defaults = None
weather_state_data = None
global_market_processor = None  # Global market data processor
user_sessions = {}
CHAT_LOG_FILE = Path("data/chat_logs.csv")

# Fertilizer model artifacts
fertilizer_classifier = None
fertilizer_scaler = None
fertilizer_encoders_info = None
fertilizer_label_encoders = None

SUPPORTED_SEASONS = {"summer", "rainy", "winter", "spring"}
MARKET_INTENT_KEYWORDS = {
    "market", "price", "rates", "rate", "भाव", "भाऊ", "भावा", "बाजार", "मार्केट"
}
FORECAST_INTENT_KEYWORDS = {
    "forecast", "prediction", "predict", "अंदाज", "पूर्वानुमान", "भविष्य", "भविष्यवाणी"
}
SEASON_INTENT_KEYWORDS = {
    "season", "मौसम", "हंगाम", "ऋतु", "seasonal"
}
RECOMMEND_INTENT_KEYWORDS = {
    "recommend", "suggest", "सलाह", "सुझाव", "शिफारस", "recommendation"
}

CROP_TRANSLATION_MAP = {
    "चावल": "rice",
    "भात": "rice",
    "तांदूळ": "rice",
    "गेहूं": "wheat",
    "गहू": "wheat",
    "मक्का": "maize",
    "मका": "maize",
    "कापूस": "cotton",
    "कपास": "cotton",
    "चना": "chickpea",
    "हरभरा": "chickpea",
    "मूंग": "mungbean",
    "उड़द": "blackgram",
    "उडीद": "blackgram"
}

# SEASON TRANSLATION MAP (Hindi & Marathi to English)
SEASON_TRANSLATION_MAP = {
    # Rainy/Monsoon
    "बरसात": "rainy",
    "मानसून": "rainy",
    "पावसाळी": "rainy",
    "पावसाळ": "rainy",
    "मॉनसून": "rainy",
    
    # Summer
    "गर्मी": "summer",
    "ग्रीष्म": "summer",
    "उन्हाळी": "summer",
    "उन्हाळ": "summer",
    "गर्मी का": "summer",
    
    # Winter
    "सर्दी": "winter",
    "शीत": "winter",
    "हिवाळी": "winter",
    "हिवाळ": "winter",
    "सर्दियों": "winter",
    
    # Spring
    "वसंत": "spring",
    "बसंत": "spring",
    "वसंत ऋतु": "spring",
}

# STATE TRANSLATION MAP (Hindi & Marathi to English)
STATE_TRANSLATION_MAP = {
    # Maharashtra
    "महाराष्ट्र": "maharashtra",
    "महाराष्ट्र": "maharashtra",
    
    # Andhra Pradesh
    "आंध्र प्रदेश": "andhra pradesh",
    "आंधप्रदेश": "andhra pradesh",
    "अँध्र प्रदेश": "andhra pradesh",
    
    # Karnataka
    "कर्नाटक": "karnataka",
    "कर्नाटका": "karnataka",
    
    # Tamil Nadu
    "तमिलनाडु": "tamil nadu",
    "तमिल नाडू": "tamil nadu",
    "तामिळनाडू": "tamil nadu",
    
    # Punjab
    "पंजाब": "punjab",
    "पंजाब": "punjab",
    
    # Haryana
    "हरियाणा": "haryana",
    "हरयाणा": "haryana",
    
    # Uttar Pradesh
    "उत्तर प्रदेश": "uttar pradesh",
    "उत्तरप्रदेश": "uttar pradesh",
    "उत्तर प्रदेश": "uttar pradesh",
    
    # Rajasthan
    "राजस्थान": "rajasthan",
    "राजस्थान": "rajasthan",
    
    # Gujarat
    "गुजरात": "gujarat",
    "गुजरात": "gujarat",
    
    # Madhya Pradesh
    "मध्य प्रदेश": "madhya pradesh",
    "मध्यप्रदेश": "madhya pradesh",
    
    # West Bengal
    "पश्चिम बंगाल": "west bengal",
    "पश्चिमबंगाल": "west bengal",
    
    # Jagged entries for Marathi
    "महाराष्ट्र": "maharashtra",
    "तामिळनाडू": "tamil nadu",
    "कर्नाटक": "karnataka",
    "गुजरात": "gujarat",
    "राजस्थान": "rajasthan",
    "हरयाणा": "haryana",
    "पंजाब": "punjab",
    "उत्तर प्रदेश": "uttar pradesh",
    "मध्य प्रदेश": "madhya pradesh",
}

# DISTRICT TRANSLATION MAP (Hindi & Marathi to English)  
DISTRICT_TRANSLATION_MAP = {
    # Maharashtra
    "पुणे": "pune",
    "मुंबई": "mumbai",
    "नगर": "nagpur",
    "नागपूर": "nagpur",
    "अहमदनगर": "ahmadnagar",
    "औरंगाबाद": "aurangabad",
    "ठाणे": "thane",
    "सतारा": "satara",
    "कोल्हापुर": "kolhapur",
    "सांगली": "sangli",
    "सोलापूर": "solapur",
    "विदर्भ": "vidarbha",
    "अमरावती": "amravati",
    "वर्धा": "wardha",
    "बुलढाणा": "buldhana",
    "यवतमाळ": "yavatmal",
    "वाशिम": "washim",
    "नाँद": "nanded",
    "परभणी": "parbhani",
    "हिंगोली": "hingoli",
    "जालना": "jalna",
    "लातूर": "latur",
    "उस्मानाबाद": "osmanabd", 
    "अकोला": "akola",
    "धुळे": "dhule",
    "नंदुरबार": "nandurbar",
    "जळगांव": "jalgaon",
    "अमळनेर": "amalner",
    "बीड": "beed",
    
    # Andhra Pradesh
    "विजयवाड": "vijayawada",
    "गुंटूर": "guntur",
    "कृष्णा": "krishna",
    "प्रकाशम": "prakasam",
    "नेल्लोर": "nellore",
    "चित्तूर": "chittoor",
    
    # Karnataka
    "बेंगलोर": "bangalore",
    "मैसूर": "mysore",
    "बेलारी": "bellary",
    "कोलार": "kolar",
    "तुमकूर": "tumkur",
    "कोडागु": "kodagu",
    
    # Tamil Nadu  
    "चेन्नई": "chennai",
    "कोयंबटोर": "coimbatore",
    "मदुरै": "madurai",
    "तिरुनेलवेली": "tirunelveli",
    "कन्याकुमारी": "kanyakumari",
    "तंजावूर": "thanjavur",
    
    # Punjab
    "अमृतसर": "amritsar",
    "लुधियाना": "ludhiana",
    "जालंधर": "jalandhar",
    "मोहाली": "mohali",
    "फिरोजपुर": "firozpur",
    "बठिंडा": "bathinda",
    "संगरूर": "sangrur",
    "पटियाला": "patiala",
    
    # Rajasthan
    "जयपुर": "jaipur",
    "जोधपुर": "jodhpur",
    "अजमेर": "ajmer",
    "बीकानेर": "bikaner",
    "कोटा": "kota",
    "भीलवाड़ा": "bhilwara",
    "चितौड़गढ़": "chittorgarh",
    "दौसा": "dausa",
    
    # Gujarat
    "अहमदाबाद": "ahmedabad",
    "वडोदरा": "vadodara",
    "राजकोट": "rajkot",
    "सूरत": "surat",
    "भाविनगर": "bhavnagar",
    "जूनागढ़": "junagadh",
    "पोरबंदर": "porbandar",
    
    # Uttar Pradesh
    "लखनऊ": "lucknow",
    "मेरठ": "meerut",
    "कानपुर": "kanpur",
    "आगरा": "agra",
    "वाराणसी": "varanasi",
    "इलाहाबाद": "allahabad",
    "आजमगढ़": "azamgarh",
    "गोरखपुर": "gorakhpur",
    
    # Haryana
    "फरीदाबाद": "faridabad",
    "करनाल": "karnal",
    "हिसार": "hisar",
    "भिवानी": "bhiwani",
    "पानीपत": "panipat",
}

def _translate_location_to_english(state: str, district: str = "") -> tuple:
    """Translate location names from Hindi/Marathi to English"""
    state_normalized = normalize_text(state)
    
    # Check direct mapping first
    english_state = STATE_TRANSLATION_MAP.get(state, state_normalized)
    if english_state in STATE_TRANSLATION_MAP.values():
        pass  # Already in English form
    else:
        # Try to find by normalized key
        for hindi_key, english_val in STATE_TRANSLATION_MAP.items():
            if normalize_text(hindi_key) == state_normalized:
                english_state = english_val
                break
    
    english_district = district
    if district:
        district_normalized = normalize_text(district)
        english_district = DISTRICT_TRANSLATION_MAP.get(district, district_normalized)
        if english_district not in DISTRICT_TRANSLATION_MAP.values():
            # Try to find by normalized key
            for hindi_key, english_val in DISTRICT_TRANSLATION_MAP.items():
                if normalize_text(hindi_key) == district_normalized:
                    english_district = english_val
                    break
    
    return english_state, english_district


# COMPREHENSIVE LANGUAGE TRANSLATIONS
TRANSLATIONS = {
    "first_greeting": {
        "en": "नमस्ते / नमस्कार / Hello 👋\n\nChoose your preferred language:",
        "hi": "नमस्ते 👋\n\nअपनी पसंदीदा भाषा चुनें:",
        "mr": "नमस्ते 👋\n\nअपनी आवडत्या भाषेचा निवडा:"
    },
    "language_set": {
        "en": "Language set to {lang}\n\n🌾 Welcome to KISAN - Your Crop Companion!\n\nChoose what you need:\n🌾 Recommend - Get crop recommendation\n📊 Market - Check market prices\n📅 Season - See seasonal crops",
        "hi": "भाषा {lang} पर सेट की गई\n\n🌾 KISAN में आपका स्वागत है!\n\nक्या चाहते हैं:\n🌾 सिफारिश - फसल की सिफारिश\n📊 बाजार - बाजार भाव देखें\n📅 मौसम - मौसमी फसलें देखें",
        "mr": "भाषा {lang} सेट केली\n\n🌾 KISAN मध्ये आपले स्वागत आहे!\n\nकाय हवेय:\n🌾 शिफारस - पिके शिफारस\n📊 बाजार - बाजार भाव पहा\n📅 ऋतु - ऋतु पिके पहा"
    },
    "welcome": {
        "en": "🌾 Welcome to KISAN!\n\nChoose an option:\n🌾 Recommend\n📊 Market\n📅 Season",
        "hi": "🌾 KISAN में आपका स्वागत है!\n\nएक विकल्प चुनें:\n🌾 सिफारिश\n📊 बाजार\n📅 मौसम",
        "mr": "🌾 KISAN मध्ये आपले स्वागत आहे!\n\nएक पर्याय निवडा:\n🌾 शिफारस\n📊 बाजार\n📅 ऋतु"
    },
    "help": {
        "en": "📘 Commands:\n- recommend\n- market <crop>\n- forecast <crop>\n- season <rainy|summer|winter|spring>\n\nExample:\nmarket rice\nforecast rice\nseason rainy",
        "hi": "📘 आदेश:\n- सिफारिश\n- बाजार <फसल>\n- पूर्वानुमान <फसल>\n- मौसम <बरसात|गर्मी|सर्दी|वसंत>\n\nउदाहरण:\nबाजार चावल\nपूर्वानुमान चावल\nमौसम बरसात",
        "mr": "📘 आदेश:\n- शिफारस\n- बाजार <पिक>\n- पूर्वानुमान <पिक>\n- ऋतु <पावसाळी|उन्हाळी|हिवाळी|वसंत>\n\nउदाहरण:\nबाजार तांदूळ\nपूर्वानुमान तांदूळ\nऋतु पावसाळी"
    },
    "main_menu": {
        "en": "🏠 Main Menu",
        "hi": "🏠 मुख्य मेनू",
        "mr": "🏠 मुख्य मेनू"
    },
    "location_help": {
        "en": "📍 Location Format:\nState | District\n\nExample:\nMaharashtra | Pune\nPunjab | Amritsar\nTamil Nadu | Chennai",
        "hi": "📍 स्थान प्रारूप:\nराज्य | जिला\n\nउदाहरण:\nमहाराष्ट्र | पुणे\nपंजाब | अमृतसर\nतमिलनाडु | चेन्नई",
        "mr": "📍 स्थान प्रारूप:\nराज्य | जिल्हा\n\nउदाहरण:\nमहाराष्ट्र | पुणे\nपंजाब | अमृतसर\nतमिळनाडू | चेन्नई"
    },
    "recommend_prompt": {
        "en": "🌾 Please send your location:\n\nState | District\n\nExample:\nMaharashtra | Pune",
        "hi": "🌾 कृपया अपना स्थान भेजें:\n\nराज्य | जिला\n\nउदाहरण:\nमहाराष्ट्र | पुणे",
        "mr": "🌾 कृपया आपले स्थान पाठवा:\n\nराज्य | जिल्हा\n\nउदाहरण:\nमहाराष्ट्र | पुणे"
    },
    "invalid_location": {
        "en": "⚠ Invalid format.\n\nPlease send:\nState | District\n\nExample: Maharashtra | Pune",
        "hi": "⚠ अमान्य प्रारूप।\n\nकृपया भेजें:\nराज्य | जिला\n\nउदाहरण: महाराष्ट्र | पुणे",
        "mr": "⚠ अमान्य प्रारूप।\n\nकृपया पाठवा:\nराज्य | जिल्हा\n\nउदाहरण: महाराष्ट्र | पुणे"
    },
    "recommendation_result": {
        "en": "📍 Location: {state}, {district}\n🌾 Recommended: {crop}\n✅ Confidence: {confidence}%\n\n🌦 Climate: {temp}°C, {humidity}% humidity\n🧪 Rainfall: {rainfall}mm\n\nTop Suggestions:\n{top_crops}",
        "hi": "📍 स्थान: {state}, {district}\n🌾 अनुशंसित: {crop}\n✅ आत्मविश्वास: {confidence}%\n\n🌦 जलवायु: {temp}°C, {humidity}% आर्द्रता\n🧪 वर्षा: {rainfall}मिमी\n\nशीर्ष सुझाव:\n{top_crops}",
        "mr": "📍 स्थान: {state}, {district}\n🌾 शिफारस: {crop}\n✅ विश्वास: {confidence}%\n\n🌦 हवामान: {temp}°C, {humidity}% आर्द्रता\n🧪 पाऊस: {rainfall}मिमी\n\nशीर्ष सूचना:\n{top_crops}"
    },
    "service_unavailable": {
        "en": "⚠ Recommendation service unavailable. Try again soon.",
        "hi": "⚠ सिफारिश सेवा अनुपलब्ध है। जल्द ही फिर से कोशिश करें।",
        "mr": "⚠ शिफारस सेवा उपलब्ध नाही। लवकरच पुन्हा प्रयत्न करा।"
    },
    "market_crop_needed": {
        "en": "Please provide crop name.\nExample: market rice",
        "hi": "कृपया फसल का नाम प्रदान करें।\nउदाहरण: बाजार चावल",
        "mr": "कृपया पिकाचे नाव द्या।\nउदाहरण: बाजार तांदूळ"
    },
    "market_unavailable": {
        "en": "⚠ Unable to fetch market insights. Try again.",
        "hi": "⚠ बाजार जानकारी प्राप्त नहीं कर सकते। फिर से कोशिश करें।",
        "mr": "⚠ बाजार माहिती मिळू शकत नाही। पुन्हा प्रयत्न करा।"
    },
    "no_market_data": {
        "en": "No market data for {crop}.",
        "hi": "{crop} के लिए कोई बाजार डेटा नहीं।",
        "mr": "{crop} साठी कोणतेही बाजार डेटा नाही।"
    },
    "forecast_crop_needed": {
        "en": "Please provide crop name.\nExample: forecast rice",
        "hi": "कृपया फसल का नाम प्रदान करें।\nउदाहरण: पूर्वानुमान चावल",
        "mr": "कृपया पिकाचे नाव द्या।\nउदाहरण: पूर्वानुमान तांदूळ"
    },
    "no_forecast_data": {
        "en": "No forecast data for {crop}.",
        "hi": "{crop} के लिए कोई पूर्वानुमान डेटा नहीं।",
        "mr": "{crop} साठी कोणतेही पूर्वानुमान डेटा नाही।"
    },
    "season_needed": {
        "en": "Please provide season.\nExample: season rainy",
        "hi": "कृपया मौसम प्रदान करें।\nउदाहरण: मौसम बरसात",
        "mr": "कृपया ऋतु द्या।\nउदाहरण: ऋतु पावसाळी"
    },
    "invalid_season": {
        "en": "Invalid season. Use: rainy, summer, winter, spring.",
        "hi": "अमान्य मौसम। उपयोग करें: बरसात, गर्मी, सर्दी, वसंत।",
        "mr": "अमान्य ऋतु। वापरा: पावसाळी, उन्हाळी, हिवाळी, वसंत।"
    },
    "season_unavailable": {
        "en": "⚠ Unable to fetch seasonal recommendations.",
        "hi": "⚠ मौसमी सिफारिशें प्राप्त नहीं कर सकते।",
        "mr": "⚠ ऋतु शिफारसी मिळू शकत नाही।"
    },
    "no_season_data": {
        "en": "No crops for {season} season.",
        "hi": "{season} मौसम के लिए कोई फसलें नहीं।",
        "mr": "{season} ऋतु साठी कोणत्या पिके नाही।"
    },
    "season_result": {
        "en": "📅 {season_title} Season\nTop crops:\n{crops}\n\nWhy: {reason}",
        "hi": "📅 {season_title} मौसम\nशीर्ष फसलें:\n{crops}\n\nक्यों: {reason}",
        "mr": "📅 {season_title} ऋतु\nशीर्ष पिके:\n{crops}\n\nका: {reason}"
    },
    "not_understood": {
        "en": "I did not understand. Type 'help'.",
        "hi": "मुझे समझ नहीं आया। 'मदद' टाइप करें।",
        "mr": "मला समजले नाही। 'मदद' टाइप करा।"
    },
    "help_needed": {
        "en": "Please provide crop name. Example: market rice",
        "hi": "कृपया फसल का नाम प्रदान करें। उदाहरण: बाजार चावल",
        "mr": "कृपया पिकाचे नाव द्या। उदाहरण: बाजार तांदूळ"
    }
}

# WhatsApp Cloud API config (set these as environment variables)
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "my_verify_token_123").strip()
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "").strip()
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip()
WHATSAPP_GRAPH_API_VERSION = os.getenv("WHATSAPP_GRAPH_API_VERSION", "v22.0").strip()
GRAPH_API_URL = (
    f"https://graph.facebook.com/{WHATSAPP_GRAPH_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    if WHATSAPP_PHONE_NUMBER_ID else None
)

SEASON_MONTHS = {
    "summer": [3, 4, 5, 6],
    "rainy": [7, 8, 9, 10],
    "winter": [11, 12, 1, 2],
    "spring": [2, 3, 4]
}

# Weather API Configuration
WEATHER_API_KEY = "78c72e493fa14a03960131144262102"
WEATHER_API_BASE = "https://api.weatherapi.com/v1/current.json"

def load_models():
    """Load trained ML models and scalers"""
    global crop_classifier, yield_predictor, feature_scaler, encoders_info, model_metadata, training_data, market_prices, location_data, soil_defaults, weather_state_data
    global fertilizer_classifier, fertilizer_scaler, fertilizer_encoders_info, fertilizer_label_encoders
    global global_market_processor
    
    try:
        logger.info("Loading models...")
        crop_classifier = joblib.load(MODEL_DIR / "crop_classifier.pkl")
        yield_predictor = joblib.load(MODEL_DIR / "yield_predictor.pkl")
        feature_scaler = joblib.load(MODEL_DIR / "feature_scaler.pkl")
        
        with open(MODEL_DIR / "encoders_info.json", 'r') as f:
            encoders_info = json.load(f)
        
        with open(MODEL_DIR / "model_metadata.json", 'r') as f:
            model_metadata = json.load(f)
        
        # Load fertilizer recommendation model
        try:
            fertilizer_classifier = joblib.load(MODEL_DIR / "fertilizer_classifier.pkl")
            fertilizer_scaler = joblib.load(MODEL_DIR / "fertilizer_scaler.pkl")
            fertilizer_label_encoders = joblib.load(MODEL_DIR / "fertilizer_label_encoders.pkl")
            
            with open(MODEL_DIR / "fertilizer_encoders.json", 'r') as f:
                fertilizer_encoders_info = json.load(f)
            
            logger.info(f"✓ Fertilizer model loaded: {len(fertilizer_encoders_info['fertilizers'])} fertilizer types")
        except Exception as e:
            logger.warning(f"Could not load fertilizer model: {e}")
            fertilizer_classifier = None
        
        # Load sample training data for market insights
        training_data = pd.read_csv(PROCESSED_DATA_DIR / "merged_training_data.csv")

        # Load market price data for dynamic insights
        market_prices = pd.read_csv(
            PROCESSED_DATA_DIR / "cleaned_Agriculture_price_dataset.csv",
            low_memory=False
        )
        market_prices.columns = [col.strip().lower() for col in market_prices.columns]
        market_prices.rename(
            columns={
                "district_name": "district",
                "market_name": "market"
            },
            inplace=True
        )

        market_prices["commodity"] = (
            market_prices["commodity"].astype(str).str.strip().str.lower()
        )
        market_prices["state"] = market_prices["state"].astype(str).str.strip().str.lower()
        market_prices["district"] = market_prices["district"].astype(str).str.strip().str.lower()
        market_prices["market"] = market_prices["market"].astype(str).str.strip().str.lower()
        market_prices["modal_price"] = pd.to_numeric(
            market_prices["modal_price"],
            errors="coerce"
        )
        market_prices["price_date"] = pd.to_datetime(
            market_prices["price_date"],
            errors="coerce"
        )
        market_prices = market_prices.dropna(
            subset=["commodity", "modal_price", "price_date"]
        )

        market_prices["date_ordinal"] = market_prices["price_date"].map(datetime.toordinal)
        market_prices["month"] = market_prices["price_date"].dt.month
        market_prices["dayofyear"] = market_prices["price_date"].dt.dayofyear

        # Load location data from ICRISAT dataset
        try:
            location_data = pd.read_csv(PROCESSED_DATA_DIR / "cleaned_ICRISAT-District Level Data.csv")
            logger.info(f"✓ Location data loaded: {location_data.shape[0]} records")
        except Exception as e:
            logger.warning(f"Could not load location data: {e}")
            location_data = None

        # Load soil defaults from crop recommendation data
        try:
            soil_defaults = pd.read_csv(PROCESSED_DATA_DIR / "cleaned_Crop_recommendation.csv")
            if 'label' in soil_defaults.columns:
                soil_defaults['label'] = soil_defaults['label'].astype(str).str.strip().str.lower()
            logger.info(f"✓ Soil defaults loaded: {soil_defaults.shape[0]} samples")
        except Exception as e:
            logger.warning(f"Could not load soil defaults: {e}")
            soil_defaults = None

        # Load state-level rainfall data for weather defaults
        try:
            weather_state_data = pd.read_csv(
                PROCESSED_DATA_DIR / "cleaned_daily-rainfall-at-state-level.csv",
                usecols=["state_name", "actual", "normal", "date"],
                low_memory=False
            )
            weather_state_data["state_name"] = weather_state_data["state_name"].astype(str).str.strip().str.lower()
            weather_state_data["actual"] = pd.to_numeric(weather_state_data["actual"], errors="coerce")
            weather_state_data["normal"] = pd.to_numeric(weather_state_data["normal"], errors="coerce")
            weather_state_data["date"] = pd.to_datetime(weather_state_data["date"], errors="coerce")
            logger.info(f"✓ Weather data loaded: {weather_state_data.shape[0]} records")
        except Exception as e:
            logger.warning(f"Could not load weather data: {e}")
            weather_state_data = None
        
        # Load global market processor for FAOSTAT data
        try:
            from training.global_market_processor import GlobalMarketProcessor
            faostat_path = Path(__file__).parent / "data" / "processed" / "FAOSTAT_data_en_2-22-2026 (added countries).csv"
            if faostat_path.exists():
                global_market_processor = GlobalMarketProcessor(str(faostat_path))
                logger.info(f"✓ Global market data loaded: {len(global_market_processor.get_countries())} countries, {len(global_market_processor.get_commodities())} commodities")
            else:
                logger.warning(f"FAOSTAT data file not found: {faostat_path}")
        except Exception as e:
            logger.warning(f"Could not load global market data: {e}")
            global_market_processor = None
        
        logger.info("✓ All models loaded successfully!")
        return True
    except Exception as e:
        logger.error(f"Error loading models: {e}")
        return False

# Initialize models on module import
def _initialize_app():
    """Initialize app on import"""
    global market_prices
    if market_prices is None:
        logger.info("Initializing models on module import...")
        if not load_models():
            logger.error("Failed to initialize models on import")

# Call initialization after load_models is defined
_initialize_app()

def normalize_text(value: str) -> str:
    if value is None:
        return ""
    return str(value).strip().lower()

def _log_chat_interaction(sender: str, user_message: str, bot_response: str, intent: str = "unknown"):
    try:
        CHAT_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        new_file = not CHAT_LOG_FILE.exists()
        with CHAT_LOG_FILE.open("a", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            if new_file:
                writer.writerow(["timestamp", "sender", "intent", "user_message", "bot_response"])
            writer.writerow([
                datetime.now().isoformat(),
                sender or "unknown",
                intent,
                user_message,
                bot_response
            ])
    except Exception as e:
        logger.warning(f"Failed to log chat interaction: {e}")

def _get_known_crops():
    known = set()
    if encoders_info and "target_encoder" in encoders_info:
        known.update([normalize_text(c) for c in encoders_info["target_encoder"].get("classes", [])])
    if market_prices is not None and not market_prices.empty and "commodity" in market_prices.columns:
        known.update([normalize_text(c) for c in market_prices["commodity"].dropna().unique().tolist()])
    known.update(CROP_TRANSLATION_MAP.values())
    return known

def _normalize_farmer_text(text: str):
    normalized = normalize_text(text)
    # Translate crops (Hindi/Marathi -> English)
    for source, target in CROP_TRANSLATION_MAP.items():
        normalized = normalized.replace(normalize_text(source), target)
    # Translate seasons (Hindi/Marathi -> English)
    for source, target in SEASON_TRANSLATION_MAP.items():
        normalized = normalized.replace(normalize_text(source), target)
    return normalized

def _extract_crop_from_text(text: str):
    known_crops = sorted(_get_known_crops(), key=len, reverse=True)
    for crop in known_crops:
        if crop and crop in text:
            return crop
    return None

def _extract_season_from_text(text: str):
    # First check for English season names
    for season in SUPPORTED_SEASONS:
        if season in text:
            return season
    
    # Then check for Hindi/Marathi season translations
    for hindi_season, english_season in SEASON_TRANSLATION_MAP.items():
        if hindi_season.lower() in text.lower():
            return english_season
    
    # Fallback checks
    if "rain" in text or "monsoon" in text or "बरसात" in text or "पावस" in text:
        return "rainy"
    
    return None

def _detect_intent(text: str):
    tokens = set(text.split())
    if text.startswith("market") or tokens.intersection(MARKET_INTENT_KEYWORDS):
        return "market"
    if text.startswith("forecast") or tokens.intersection(FORECAST_INTENT_KEYWORDS):
        return "forecast"
    if text.startswith("season") or tokens.intersection(SEASON_INTENT_KEYWORDS):
        return "season"
    if text.startswith("recommend") or tokens.intersection(RECOMMEND_INTENT_KEYWORDS):
        return "recommend"
    return "unknown"

def send_whatsapp_menu(to: str, menu_type: str = "main") -> bool:
    """Send interactive button menu. menu_type: 'main', 'language', 'location'"""
    if not WHATSAPP_ACCESS_TOKEN or not GRAPH_API_URL:
        return False

    # Get user's language preference from session
    session = _get_user_session(to)
    language = session.get("language", "en")

    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }

    if menu_type == "language":
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": "तुमची भाषा निवडा / अपनी भाषा चुनें / Choose your language"},
                "action": {
                    "buttons": [
                        {"type": "reply", "reply": {"id": "lang_en", "title": "🇺🇸 English"}},
                        {"type": "reply", "reply": {"id": "lang_hi", "title": "🇮🇳 हिंदी"}},
                        {"type": "reply", "reply": {"id": "lang_mr", "title": "🇮🇳 मराठी"}}
                    ]
                }
            }
        }
    elif menu_type == "location":
        if language == "hi":
            body_text = "📍 अपना स्थान भेजें:\nRajasthan | Jaipur\n\nउदाहरण: महाराष्ट्र | पुणे"
            button1_title = "📍 प्रारूप सहायता"
            button2_title = "🏠 मुख्य मेनू"
        elif language == "mr":
            body_text = "📍 आपलं स्थान पाठवा:\nRajasthan | Jaipur\n\nउदाहरण: महाराष्ट्र | पुणे"
            button1_title = "📍 फॉर्मॅट मदत"
            button2_title = "🏠 मुख्य मेनू"
        else:
            body_text = "📍 Send your location:\nState | District\n\nExample: Maharashtra | Pune"
            button1_title = "📍 Format Help"
            button2_title = "🏠 Main Menu"

        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body_text},
                "action": {
                    "buttons": [
                        {"type": "reply", "reply": {"id": "location_help", "title": button1_title}},
                        {"type": "reply", "reply": {"id": "main_menu", "title": button2_title}}
                    ]
                }
            }
        }
    else:  # main menu
        if language == "hi":
            body_text = "🌾 कृषि सहायता\n\nक्या चाहते हैं:"
            button1_title = "🌾 सिफारिश"
            button2_title = "📊 बाजार"
            button3_title = "📅 मौसम"
        elif language == "mr":
            body_text = "🌾 कृषि मदत\n\nकाय हवेय:"
            button1_title = "🌾 शिफारस"
            button2_title = "📊 बाजार"
            button3_title = "📅 ऋतु"
        else:
            body_text = "🌾 Agriculture Help\n\nChoose what you need:"
            button1_title = "🌾 Recommend"
            button2_title = "📊 Market"
            button3_title = "📅 Season"

        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body_text},
                "action": {
                    "buttons": [
                        {"type": "reply", "reply": {"id": "recommend", "title": button1_title}},
                        {"type": "reply", "reply": {"id": "market", "title": button2_title}},
                        {"type": "reply", "reply": {"id": "season", "title": button3_title}}
                    ]
                }
            }
        }

    try:
        response = requests.post(GRAPH_API_URL, headers=headers, json=payload, timeout=15)
        return response.ok
    except requests.RequestException:
        return False

def _get_translated_text(key: str, language: str = "en", **kwargs) -> str:
    """Get translated text for a given key and language"""
    if key not in TRANSLATIONS:
        return key
    
    lang_key = language if language in {"en", "hi", "mr"} else "en"
    text = TRANSLATIONS[key].get(lang_key, TRANSLATIONS[key].get("en", key))
    
    # Replace any placeholders with provided kwargs
    try:
        return text.format(**kwargs)
    except KeyError:
        return text

def _normalize_crop_label_from_column(column_name: str):
    base = column_name.replace("_production_(1000_tons)", "")
    alias_map = {
        "pigeonpea": "pigeonpeas",
        "black_gram": "blackgram",
        "mung": "mungbean"
    }
    return alias_map.get(base, base)

def _infer_dominant_crop_label(state: str, district: str = ""):
    if location_data is None or location_data.empty:
        return None

    if 'state_name' not in location_data.columns or 'dist_name' not in location_data.columns:
        return None

    state_key = normalize_text(state)
    district_key = normalize_text(district)

    working = location_data.copy()
    working['state_name_norm'] = working['state_name'].astype(str).str.strip().str.lower()
    working['dist_name_norm'] = working['dist_name'].astype(str).str.strip().str.lower()

    district_rows = working[
        (working['state_name_norm'] == state_key) &
        (working['dist_name_norm'] == district_key)
    ] if district_key else pd.DataFrame()

    state_rows = working[working['state_name_norm'] == state_key]
    selected = district_rows if not district_rows.empty else state_rows
    if selected.empty:
        return None

    valid_labels = set()
    if soil_defaults is not None and not soil_defaults.empty and 'label' in soil_defaults.columns:
        valid_labels = set(soil_defaults['label'].astype(str).str.lower().unique().tolist())

    production_cols = [col for col in selected.columns if col.endswith("_production_(1000_tons)")]
    best_crop = None
    best_value = -1.0

    for col in production_cols:
        crop_label = _normalize_crop_label_from_column(col)
        if valid_labels and crop_label not in valid_labels:
            continue

        values = pd.to_numeric(selected[col], errors='coerce')
        mean_value = values[values > 0].mean()
        if pd.notna(mean_value) and float(mean_value) > best_value:
            best_value = float(mean_value)
            best_crop = crop_label

    return best_crop

def _resolve_soil_parameters(state: str, district: str = ""):
    """Resolve location-based soil parameters from local dataset defaults."""
    if not state:
        raise ValueError("State is required")

    if soil_defaults is None or soil_defaults.empty:
        raise RuntimeError("Soil data not available")

    state_key = normalize_text(state)
    district_key = normalize_text(district)

    if location_data is not None and not location_data.empty and 'state_name' in location_data.columns:
        state_catalog = set(location_data['state_name'].astype(str).str.strip().str.lower().unique().tolist())
        if state_catalog and state_key not in state_catalog:
            raise ValueError(f"State '{state}' is not available")

    dominant_crop = _infer_dominant_crop_label(state, district)
    base_df = soil_defaults
    if dominant_crop and 'label' in soil_defaults.columns:
        crop_df = soil_defaults[soil_defaults['label'] == dominant_crop]
        if not crop_df.empty:
            base_df = crop_df

    n_avg = float(base_df['n'].mean())
    p_avg = float(base_df['p'].mean())
    k_avg = float(base_df['k'].mean())
    ph_avg = float(base_df['ph'].mean())

    return {
        'nitrogen': round(n_avg, 2),
        'phosphorus': round(p_avg, 2),
        'potassium': round(k_avg, 2),
        'ph': round(ph_avg, 2),
        'state': state,
        'district': district,
        'dominant_crop_profile': dominant_crop,
        'data_source': 'cleaned_Crop_recommendation + cleaned_ICRISAT-District Level Data'
    }

def _resolve_weather_data(state: str, district: str = ""):
    """Resolve weather defaults from datasets (state rainfall + agronomy baseline)."""
    if not state:
        raise ValueError("State is required")

    if soil_defaults is None or soil_defaults.empty:
        raise RuntimeError("Base climate data not available")

    state_key = normalize_text(state)
    rainfall = None

    if weather_state_data is not None and not weather_state_data.empty:
        state_weather = weather_state_data[weather_state_data['state_name'] == state_key]
        if not state_weather.empty:
            normal_series = pd.to_numeric(state_weather['normal'], errors='coerce')
            normal_series = normal_series[normal_series > 0]
            actual_series = pd.to_numeric(state_weather['actual'], errors='coerce')
            actual_series = actual_series[actual_series > 0]

            if not normal_series.empty:
                rainfall = float(normal_series.mean())
            elif not actual_series.empty:
                rainfall = float(actual_series.mean())

    if rainfall is None:
        rainfall = float(pd.to_numeric(soil_defaults['rainfall'], errors='coerce').dropna().mean())

    temperature = float(pd.to_numeric(soil_defaults['temperature'], errors='coerce').dropna().mean())
    humidity = float(pd.to_numeric(soil_defaults['humidity'], errors='coerce').dropna().mean())

    return {
        "temperature": round(temperature, 2),
        "humidity": round(humidity, 2),
        "rainfall": round(rainfall, 2),
        "state": state,
        "district": district,
        "data_source": "cleaned_daily-rainfall-at-state-level + cleaned_Crop_recommendation"
    }

def _run_crop_recommendation_logic(data: dict):
    """Core recommendation logic shared by API routes and WhatsApp flow."""
    required_fields = ['nitrogen', 'phosphorus', 'potassium', 'temperature', 'humidity', 'ph', 'rainfall']
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        raise ValueError(f"Missing fields: {', '.join(missing_fields)}")

    if crop_classifier is None or yield_predictor is None or feature_scaler is None or encoders_info is None:
        raise RuntimeError("Model artifacts are not loaded")

    features = np.array([[ 
        data['nitrogen'],
        data['phosphorus'],
        data['potassium'],
        data['temperature'],
        data['humidity'],
        data['ph'],
        data['rainfall'],
        data.get('rainfall_deviation_pct', 10),
        data.get('npk_score', (data['nitrogen'] + data['phosphorus'] + data['potassium']) / 3),
        data.get('temp_favorability', data['temperature'] / 30),
        data.get('humidity_favorability', data['humidity'] / 100),
        data.get('ph_suitability', 1 - abs(data['ph'] - 7) / 7),
        data.get('growth_potential', 0.5),
        data.get('water_stress', 50)
    ]])

    features_scaled = feature_scaler.transform(features)
    probabilities = crop_classifier.predict_proba(features_scaled)[0]
    crop_names = encoders_info['target_encoder']['classes']

    top_indices = np.argsort(probabilities)[-5:][::-1]
    recommendations = []

    for idx in top_indices:
        crop = crop_names[idx]
        confidence = float(probabilities[idx]) * 100
        yield_pred = yield_predictor.predict(features_scaled)[0]
        recommendations.append({
            "crop": crop,
            "confidence": round(confidence, 2),
            "estimated_yield": round(float(yield_pred), 2),
            "unit": "kg/ha"
        })

    return {
        "status": "success",
        "primary_recommendation": recommendations[0]['crop'],
        "confidence": recommendations[0]['confidence'],
        "top_recommendations": recommendations,
        "input_conditions": {
            "nitrogen": data['nitrogen'],
            "phosphorus": data['phosphorus'],
            "potassium": data['potassium'],
            "temperature": data['temperature'],
            "humidity": data['humidity'],
            "ph": data['ph'],
            "rainfall": data['rainfall']
        }
    }

def _build_recommendation_payload_from_location(state: str, district: str):
    soil_data = _resolve_soil_parameters(state, district)
    weather_data = _resolve_weather_data(state, district)

    payload = {
        "nitrogen": soil_data["nitrogen"],
        "phosphorus": soil_data["phosphorus"],
        "potassium": soil_data["potassium"],
        "temperature": weather_data["temperature"],
        "humidity": weather_data["humidity"],
        "ph": soil_data["ph"],
        "rainfall": weather_data["rainfall"]
    }
    return payload, soil_data, weather_data

def _run_location_recommendation_logic(state: str, district: str):
    payload, soil_data, weather_data = _build_recommendation_payload_from_location(state, district)
    recommendation = _run_crop_recommendation_logic(payload)
    return {
        "status": "success",
        "location": {
            "state": state,
            "district": district
        },
        "soil_data": soil_data,
        "weather_data": weather_data,
        "recommendation": recommendation
    }

def send_whatsapp_message(to: str, message: str) -> bool:
    """Send a WhatsApp text message via Meta Graph API"""
    if not WHATSAPP_ACCESS_TOKEN or not GRAPH_API_URL:
        logger.warning("WhatsApp config missing. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.")
        return False

    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": message}
    }

    try:
        response = requests.post(GRAPH_API_URL, headers=headers, json=payload, timeout=15)
        if response.ok:
            logger.info("WhatsApp message sent successfully")
            return True

        logger.error(f"WhatsApp send failed ({response.status_code}): {response.text}")
        return False
    except requests.RequestException as e:
        logger.error(f"WhatsApp send exception: {e}")
        return False

def _get_user_session(sender: str):
    key = normalize_text(sender)
    if key not in user_sessions:
        user_sessions[key] = {
            "step": None
        }
    return user_sessions[key]

def _parse_location_input(message: str):
    parts = [item.strip() for item in message.split("|")]
    if len(parts) != 2 or not parts[0] or not parts[1]:
        return None
    return {
        "state": parts[0],
        "district": parts[1]
    }

def _parse_market_command(text: str):
    body = text.split(maxsplit=1)
    if len(body) < 2 or not body[1].strip():
        return None

    # Supported format:
    # market <crop>
    # market <crop> | <state> | <district> | <market>
    segments = [seg.strip() for seg in body[1].split("|") if seg.strip()]
    if not segments:
        return None

    return {
        "crop": segments[0],
        "state": segments[1] if len(segments) > 1 else None,
        "district": segments[2] if len(segments) > 2 else None,
        "market": segments[3] if len(segments) > 3 else None
    }

def _best_selling_window(trend: str):
    if trend == "high":
        return "Next 15 days"
    if trend == "moderate":
        return "Monitor next 20-30 days"
    return "Sell within 7-10 days"

def _format_market_summary(crop: str, data: dict, language: str = "en"):
    market_data = data.get("market_data", {})
    latest = market_data.get("latest_price", {})
    risk_assessment = data.get("risk_assessment", {})
    trend = market_data.get("demand_trend", "N/A")
    selling_window = _best_selling_window(trend)

    if language == "hi":
        return (
            f"📊 {crop.title()} बाजार सारांश\n"
            f"💰 कीमत: ₹{latest.get('value', 'N/A')}\n"
            f"📈 प्रवृत्ति: {trend}\n"
            f"⚠ जोखिम: {risk_assessment.get('market_risk', 'N/A').title()}\n"
            f"📅 सर्वोत्तम विक्रय विंडो: {selling_window}"
        )
    elif language == "mr":
        return (
            f"📊 {crop.title()} बाजार सारांश\n"
            f"💰 किंमत: ₹{latest.get('value', 'N/A')}\n"
            f"📈 ट्रेंड: {trend}\n"
            f"⚠ जोखीम: {risk_assessment.get('market_risk', 'N/A').title()}\n"
            f"📅 सर्वोत्तम विक्रय विंडो: {selling_window}"
        )
    else:
        return (
            f"📊 {crop.title()} Market Summary\n"
            f"💰 Price: ₹{latest.get('value', 'N/A')}\n"
            f"📈 Trend: {trend}\n"
            f"⚠ Risk: {risk_assessment.get('market_risk', 'N/A').title()}\n"
            f"📅 Best selling window: {selling_window}"
        )

def _format_forecast_summary(crop: str, data: dict, language: str = "en"):
    forecast = data.get("market_data", {}).get("forecast_30d", {})
    trend = data.get("market_data", {}).get("demand_trend", "N/A")

    if language == "hi":
        return (
            f"📈 {crop.title()} के लिए 30 दिन का पूर्वानुमान\n"
            f"औसत: ₹{forecast.get('avg', 'N/A')}\n"
            f"न्यूनतम: ₹{forecast.get('min', 'N/A')}\n"
            f"अधिकतम: ₹{forecast.get('max', 'N/A')}\n"
            f"प्रवृत्ति: {trend}"
        )
    elif language == "mr":
        return (
            f"📈 {crop.title()} साठी 30 दिवसांचा अंदाज\n"
            f"सरासरी: ₹{forecast.get('avg', 'N/A')}\n"
            f"किमान: ₹{forecast.get('min', 'N/A')}\n"
            f"कमाल: ₹{forecast.get('max', 'N/A')}\n"
            f"ट्रेंड: {trend}"
        )
    else:
        return (
            f"📈 30-Day Forecast for {crop.title()}\n"
            f"Avg: ₹{forecast.get('avg', 'N/A')}\n"
            f"Min: ₹{forecast.get('min', 'N/A')}\n"
            f"Max: ₹{forecast.get('max', 'N/A')}\n"
            f"Trend: {trend}"
        )

def _format_market_response_for_bot(crop: str, live_records: list, time_series: list, 
                                     by_mandi: list, latest_record: dict, language: str = "en"):
    """Format live market data for WhatsApp bot with price, trend, and best mandi."""
    
    # Extract current price (from live or latest record)
    current_price = "N/A"
    if live_records and len(live_records) > 0:
        # Live data from API - usually has "price" or "modal_price" field
        lrec = live_records[0]
        current_price = lrec.get("price") or lrec.get("modal_price") or lrec.get("value", "N/A")
    elif latest_record and isinstance(latest_record, dict):
        # Fallback to latest historical record
        current_price = latest_record.get("modal_price") or latest_record.get("price", "N/A")
    
    # Calculate trend (up/down) based on time series
    trend_text = "→"  # Neutral
    if time_series and len(time_series) > 1:
        prices = []
        for ts in time_series:
            p = ts.get("modal_price") or ts.get("price")
            if p:
                try:
                    prices.append(float(p))
                except:
                    pass
        
        if len(prices) >= 2:
            if prices[-1] > prices[0]:
                trend_text = "📈 UP"
            elif prices[-1] < prices[0]:
                trend_text = "📉 DOWN"
    
    # Find best mandi (highest price usually means better for selling)
    best_mandi = "N/A"
    best_price = 0
    if by_mandi and len(by_mandi) > 0:
        for mandi in by_mandi:
            try:
                mprice = float(mandi.get("avg_price") or mandi.get("price", 0))
                if mprice > best_price:
                    best_price = mprice
                    best_mandi = mandi.get("market") or mandi.get("mandi") or "Local Market"
            except:
                pass
    
    # Format response by language
    crop_title = crop.title() if crop else "Crop"
    
    if language == "hi":
        response = (
            f"🌾 {crop_title} - बाजार भाव\n"
            f"💰 आज का भाव: ₹{current_price}/क्विंटल\n"
            f"📈 ट्रेंड: {trend_text}\n"
            f"🏪 सर्वश्रेष्ठ मंडी: {best_mandi}"
        )
    elif language == "mr":
        response = (
            f"🌾 {crop_title} - बाजार भाव\n"
            f"💰 आजचा भाव: ₹{current_price}/क्विंटल\n"
            f"📈 ट्रेंड: {trend_text}\n"
            f"🏪 सर्वश्रेष्ठ मंडी: {best_mandi}"
        )
    else:  # English
        response = (
            f"🌾 {crop_title} - Market Price\n"
            f"💰 Today's Price: ₹{current_price}/quintal\n"
            f"📈 Trend: {trend_text}\n"
            f"🏪 Best Mandi: {best_mandi}"
        )
    
    return response

def process_user_message(message: str, sender: str = None, send_menu: bool = True) -> tuple:
    """
    WhatsApp message processing with stateful recommendation flow.
    Returns: (response_text, should_send_menu, menu_type)
    """
    if not message:
        return (_get_translated_text("help_needed", "en"), True, "main")

    text = _normalize_farmer_text(message)
    session = _get_user_session(sender or "unknown")
    language = session.get("language", "en")
    intent = _detect_intent(text)

    # Language selection flow
    if text in {"lang_en", "lang_hi", "lang_mr"}:
        lang_map = {"lang_en": "en", "lang_hi": "HI", "lang_mr": "MR"}
        session["language"] = lang_map[text].lower()
        session["step"] = None
        language = session["language"]
        response = _get_translated_text("language_set", language, lang=lang_map[text])
        return (response, True, "main")

    # First message - ask for language
    if text in {"hi", "hello", "hey", "hii"} or intent == "unknown" and session.get("step") is None:
        if "language" not in session:
            return (_get_translated_text("first_greeting", "en"), True, "language")
        session["step"] = None

    if text in {"hi", "hello", "hey", "hii"}:
        session["step"] = None
        response = _get_translated_text("welcome", language)
        return (response, True, "main")

    if text == "help":
        return (_get_translated_text("help", language), False, "main")

    if text in {"menu", "main_menu"}:
        return (_get_translated_text("main_menu", language), True, "main")

    if text == "location_help":
        return (_get_translated_text("location_help", language), True, "location")

    if text == "recommend" or intent == "recommend":
        session["step"] = "awaiting_location"
        return (_get_translated_text("recommend_prompt", language), True, "location")

    if session.get("step") == "awaiting_location":
        location = _parse_location_input(message)
        if not location:
            return (_get_translated_text("invalid_location", language), True, "location")

        try:
            # Translate location names from Hindi/Marathi to English for database queries
            english_state, english_district = _translate_location_to_english(
                location["state"], 
                location["district"]
            )
            
            # Use English names for database queries, but keep original for display
            location_result = _run_location_recommendation_logic(english_state, english_district)
            recommendation = location_result["recommendation"]
            soil_data = location_result["soil_data"]
            weather_data = location_result["weather_data"]

            top_crop = recommendation["primary_recommendation"]
            confidence = recommendation["confidence"]
            top_recommendations = recommendation["top_recommendations"][:3]
            top_lines = "\n".join(
                [f"- {item.get('crop', 'N/A')} ({item.get('confidence', 0)}%)" for item in top_recommendations]
            )

            session["step"] = None
            response = _get_translated_text(
                "recommendation_result",
                language,
                state=location['state'],  # Display original input
                district=location['district'],  # Display original input
                crop=top_crop,
                confidence=confidence,
                temp=weather_data['temperature'],
                humidity=weather_data['humidity'],
                rainfall=weather_data['rainfall'],
                top_crops=top_lines
            )
            return (response, True, "main")
        except ValueError as e:
            logger.warning(f"Invalid location recommendation input: {e}")
            return (_get_translated_text("invalid_location", language), True, "location")
        except RuntimeError as e:
            logger.error(f"Location-based recommendation unavailable: {e}")
            return (_get_translated_text("service_unavailable", language), True, "main")
        except Exception as e:
            logger.error(f"Error in WhatsApp recommendation flow: {e}")
            return (_get_translated_text("service_unavailable", language), True, "main")

    market_like = text.startswith("market") or intent == "market"
    if market_like:
        parsed_market = _parse_market_command(text)
        if not parsed_market:
            crop = _extract_crop_from_text(text)
            if not crop:
                return (_get_translated_text("market_crop_needed", language), False, "main")
            parsed_market = {
                "crop": crop,
                "state": None,
                "district": None,
                "market": None
            }

        crop = parsed_market["crop"]
        
        try:
            # FIRST: Try to get live prices from agmarket APIs
            live_records, live_err = fetch_agmarket_live(crop, source="auto")
            
            # FALLBACK: If no live data, get historical data
            time_series, by_mandi, latest_record = _get_local_chart_fallback(crop, days=30)
            
            # If we have ANY data, format and return it
            if live_records or time_series or latest_record:
                response_text = _format_market_response_for_bot(
                    crop, 
                    live_records, 
                    time_series, 
                    by_mandi, 
                    latest_record,
                    language
                )
                return (response_text, True, "main")
            
            # If still no data, return friendly message with suggestions
            return (_get_translated_text("no_market_data", language, crop=crop.title()), True, "main")
            
        except Exception as e:
            logger.error(f"Error in WhatsApp market flow for {crop}: {e}")
            return (_get_translated_text("market_unavailable", language), True, "main")

    forecast_like = text.startswith("forecast") or intent == "forecast"
    if forecast_like:
        crop = text.split(maxsplit=1)[1].strip() if text.startswith("forecast") and len(text.split(maxsplit=1)) > 1 else _extract_crop_from_text(text)
        if not crop:
            return (_get_translated_text("forecast_crop_needed", language), False, "main")

        try:
            with app.test_client() as client:
                response = client.get(f"/api/market-insights/{quote_plus(crop)}")
                data = response.get_json() or {}

            if response.status_code != 200 or data.get("status") != "success" or not data.get("has_market_data"):
                return (_get_translated_text("no_forecast_data", language, crop=crop.title()), True, "main")

            return (_format_forecast_summary(crop, data, language), True, "main")
        except Exception as e:
            logger.error(f"Error in WhatsApp forecast flow: {e}")
            return (_get_translated_text("market_unavailable", language), True, "main")

    season_like = text.startswith("season") or intent == "season"
    if season_like:
        # Try to extract season from the text
        season = _extract_season_from_text(text)
        
        # If not found and text starts with "season", try splitting
        if not season and text.startswith("season") and len(text.split(maxsplit=1)) > 1:
            season = text.split(maxsplit=1)[1].strip()
        
        # If still not found, ask user
        if not season:
            return (_get_translated_text("season_needed", language), False, "main")

        # Normalize and validate
        season = normalize_text(season) if season else None
        if not season or season not in SUPPORTED_SEASONS:
            return (_get_translated_text("invalid_season", language), False, "main")

        try:
            with app.test_client() as client:
                response = client.get(f"/api/seasonal-recommendations/{quote_plus(season)}")
                data = response.get_json() or {}

            if response.status_code != 200 or data.get("status") != "success":
                return (_get_translated_text("season_unavailable", language), True, "main")

            crops = data.get("recommended_crops", [])[:5]
            if not crops:
                return (_get_translated_text("no_season_data", language, season=season.title()), True, "main")

            crops_text = "\n".join([f"- {crop}" for crop in crops])
            response_text = _get_translated_text(
                "season_result",
                language,
                season_title=season.title(),
                crops=crops_text,
                reason=data.get('reason', 'Based on market records')
            )
            return (response_text, True, "main")
        except Exception as e:
            logger.error(f"Error in WhatsApp season flow: {e}")
            return (_get_translated_text("season_unavailable", language), True, "main")

    return (_get_translated_text("not_understood", language), True, "main")

@app.route('/webhook', methods=['GET'])
def verify_webhook():
    """Meta webhook verification endpoint"""
    mode = request.args.get("hub.mode")
    token = request.args.get("hub.verify_token")
    challenge = request.args.get("hub.challenge")

    if mode == "subscribe" and token == WHATSAPP_VERIFY_TOKEN:
        return challenge or "", 200

    return "Verification failed", 403

@app.route('/webhook', methods=['POST'])
def whatsapp_webhook():
    """Receive WhatsApp webhook events and auto-reply with smart menu handling"""
    data = request.json or {}
    logger.info(f"Incoming WhatsApp webhook: {json.dumps(data)[:500]}")

    try:
        entries = data.get("entry", [])
        for entry in entries:
            for change in entry.get("changes", []):
                value = change.get("value", {})
                messages = value.get("messages", [])
                for msg in messages:
                    sender = msg.get("from")
                    text_body = msg.get("text", {}).get("body", "")
                    
                    # Extract button or list replies
                    if not text_body and msg.get("interactive"):
                        interactive = msg.get("interactive", {})
                        if interactive.get("button_reply"):
                            text_body = interactive.get("button_reply", {}).get("id", "")
                        elif interactive.get("list_reply"):
                            text_body = interactive.get("list_reply", {}).get("id", "")

                    if sender and text_body:
                        # Process message and get response + menu guidance
                        reply_text, should_send_menu, menu_type = process_user_message(text_body, sender=sender)
                        
                        # Send main text response
                        send_whatsapp_message(sender, reply_text)
                        
                        # Log interaction
                        _log_chat_interaction(sender, text_body, reply_text, intent=_detect_intent(_normalize_farmer_text(text_body)))
                        
                        # Always send menu after command completes for better UX
                        if should_send_menu:
                            send_whatsapp_menu(sender, menu_type=menu_type)
    except Exception as e:
        logger.error(f"Error processing WhatsApp webhook: {e}")

    return "OK", 200

def _get_available_crops_set():
    """Return set of crop names (lowercase) that we have market data for."""
    if market_prices is None or market_prices.empty:
        return set()
    return set(market_prices["commodity"].astype(str).str.strip().str.lower().unique())

def filter_market_prices(crop: str, state: str = None, district: str = None, market: str = None):
    if market_prices is None:
        return pd.DataFrame()

    df = market_prices
    crop_key = normalize_text(crop)
    if crop_key:
        df = df[df["commodity"] == crop_key]

    state_key = normalize_text(state)
    if state_key:
        df = df[df["state"] == state_key]

    district_key = normalize_text(district)
    if district_key:
        df = df[df["district"] == district_key]

    market_key = normalize_text(market)
    if market_key:
        df = df[df["market"] == market_key]

    return df.copy()

def apply_season_filter(df: pd.DataFrame, season: str = None):
    season_key = normalize_text(season)
    if not season_key or season_key not in SEASON_MONTHS:
        return df, False

    filtered = df[df["month"].isin(SEASON_MONTHS[season_key])].copy()
    return filtered, True

def classify_trend_90day(df: pd.DataFrame) -> dict:
    """Classify trend using 90 days of data with improved statistical methods"""
    if df.shape[0] < 20:
        return {"trend": "stable", "strength": 0, "confidence": 0.3}
    
    df_sorted = df.sort_values("price_date").copy()
    prices = df_sorted["modal_price"].values
    
    # Split 90-day data into three 30-day periods for better analysis
    n = len(prices)
    period_size = max(1, n // 3)
    
    early_period = prices[:period_size]
    late_period = prices[-period_size:]
    
    early_avg = float(np.mean(early_period)) if len(early_period) > 0 else 0
    late_avg = float(np.mean(late_period)) if len(late_period) > 0 else 0
    mid_period = prices[period_size:2*period_size]
    mid_avg = float(np.mean(mid_period)) if len(mid_period) > 0 else 0
    
    # Calculate price change across 90 days
    if early_avg > 0:
        price_change_pct = ((late_avg - early_avg) / early_avg) * 100
    else:
        price_change_pct = 0
    
    # Linear regression for trend strength
    x = np.arange(len(prices))
    coefficients = np.polyfit(x, prices, 1)
    slope = coefficients[0]
    mean_price = np.mean(prices)
    
    if mean_price > 0:
        normalized_slope = (slope / mean_price) * 100
    else:
        normalized_slope = 0
    
    # Determine trend with improved thresholds based on 90-day data
    trend = "stable"
    strength = 0
    confidence = min(0.95, 0.5 + (len(prices) / 90.0) * 0.45)
    
    if normalized_slope > 0.15:  # Improved threshold for 90 days
        trend = "increasing"
        strength = min(100, abs(normalized_slope))
    elif normalized_slope < -0.15:
        trend = "decreasing"
        strength = min(100, abs(normalized_slope))
    else:
        trend = "stable"
        strength = abs(normalized_slope)
    
    return {
        "trend": trend,
        "strength": round(strength, 2),
        "confidence": round(confidence, 3),
        "price_change_pct": round(price_change_pct, 2),
        "early_avg": round(early_avg, 2),
        "late_avg": round(late_avg, 2)
    }

def classify_trend(df: pd.DataFrame) -> str:
    """Legacy function wrapper for backward compatibility"""
    result = classify_trend_90day(df)
    return result["trend"]

def classify_stability(df: pd.DataFrame) -> str:
    if df.shape[0] < 10:
        return "stable"

    mean_price = df["modal_price"].mean()
    if mean_price == 0:
        return "stable"

    cv = df["modal_price"].std() / mean_price
    if cv < 0.05:
        return "stable"
    if cv < 0.15:
        return "moderate"
    return "volatile"



def forecast_price_ml(df: pd.DataFrame, cache_key: str):
    if df.shape[0] < 30:
        return None

    latest_date = df["price_date"].max()
    cached = market_model_cache.get(cache_key)
    if cached and cached["last_date"] == latest_date:
        model = cached["model"]
    else:
        model = RandomForestRegressor(
            n_estimators=200,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        df_sorted = df.sort_values("price_date")
        X = df_sorted[["date_ordinal", "month", "dayofyear"]]
        y = df_sorted["modal_price"]
        model.fit(X, y)
        market_model_cache[cache_key] = {
            "model": model,
            "last_date": latest_date
        }

    future_dates = pd.date_range(latest_date + timedelta(days=1), periods=30)
    future_features = pd.DataFrame({
        "date_ordinal": future_dates.map(datetime.toordinal),
        "month": future_dates.month,
        "dayofyear": future_dates.dayofyear
    })
    preds = model.predict(future_features)
    return {
        "avg": float(np.mean(preds)),
        "min": float(np.min(preds)),
        "max": float(np.max(preds)),
        "days": 30,
        "model": "RandomForestRegressor"
    }

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "crops": len(encoders_info['target_encoder']['classes']),
        "models": ["crop_classifier", "yield_predictor"]
    })

@app.route('/api/weather', methods=['GET'])
def get_weather():
    """
    Get real-time weather data for a city
    
    Query params:
    - city: City name (required)
    
    Returns temperature, humidity, and rainfall data
    """
    try:
        city = request.args.get('city', '').strip()
        
        if not city:
            return jsonify({
                "status": "error",
                "message": "City name is required"
            }), 400
        
        # Call WeatherAPI
        response = requests.get(
            WEATHER_API_BASE,
            params={
                'key': WEATHER_API_KEY,
                'q': city,
                'aqi': 'no'
            },
            timeout=10
        )
        
        if response.status_code != 200:
            return jsonify({
                "status": "error",
                "message": f"City not found: {city}"
            }), 404
        
        weather_data = response.json()
        current = weather_data.get('current', {})
        
        # Extract relevant parameters
        temperature = current.get('temp_c', 25.0)
        humidity = current.get('humidity', 70.0)
        
        # Estimate rainfall from precipitation (mm)
        # WeatherAPI provides precip_mm - convert to cm for our model (which expects rainfall in cm)
        rainfall_mm = current.get('precip_mm', 0.0)
        rainfall_cm = rainfall_mm / 10.0  # Convert mm to cm
        
        # For daily estimation, if no precip data use seasonal average
        # This is a simple heuristic - could be improved with forecast data
        if rainfall_cm == 0:
            rainfall_cm = 15.0  # Default estimate if no rain
        
        return jsonify({
            "status": "success",
            "city": city,
            "weather_data": {
                "temperature": round(temperature, 2),
                "humidity": round(humidity, 2),
                "rainfall": round(rainfall_cm, 2),
                "condition": current.get('condition', {}).get('text', 'Unknown'),
                "wind_kmh": current.get('wind_kph', 0),
                "pressure_mb": current.get('pressure_mb', 0),
                "latitude": weather_data.get('location', {}).get('lat'),
                "longitude": weather_data.get('location', {}).get('lon')
            },
            "timestamp": datetime.now().isoformat()
        })
    
    except requests.exceptions.Timeout:
        return jsonify({
            "status": "error",
            "message": "Weather API request timed out"
        }), 504
    except requests.exceptions.RequestException as e:
        logger.error(f"Weather API error: {e}")
        return jsonify({
            "status": "error",
            "message": "Failed to fetch weather data"
        }), 500
    except Exception as e:
        logger.error(f"Error in weather endpoint: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/crops/list', methods=['GET'])
def get_crop_list():
    """Get list of all available crops"""
    crops = encoders_info['target_encoder']['classes']
    return jsonify({
        "status": "success",
        "crops": sorted(crops),
        "total": len(crops)
    })

@app.route('/api/locations', methods=['GET'])
def get_locations():
    """Get all available states and districts from location data"""
    try:
        if location_data is None or location_data.empty:
            return jsonify({
                "status": "error",
                "message": "Location data not available"
            }), 404
        
        locations = {}
        if 'state_name' in location_data.columns and 'dist_name' in location_data.columns:
            for state in location_data['state_name'].dropna().unique():
                districts = location_data[location_data['state_name'] == state]['dist_name'].dropna().unique().tolist()
                locations[state] = sorted([d for d in districts if d])
        
        return jsonify({
            "status": "success",
            "locations": locations,
            "total_states": len(locations)
        })
    except Exception as e:
        logger.error(f"Error getting locations: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/geo-district', methods=['GET'])
def get_district_from_coords():
    """
    Find best matching district from latitude and longitude
    Uses reverse geocoding + fuzzy string matching against database
    
    Query params:
    - lat: Latitude (required)
    - lon: Longitude (required)
    - state: State name (optional, for narrowing down search)
    """
    try:
        lat = request.args.get('lat', '')
        lon = request.args.get('lon', '')
        state = request.args.get('state', '').strip()
        
        if not lat or not lon:
            return jsonify({"status": "error", "message": "Latitude and longitude required"}), 400
        
        # Reverse geocode to get district info
        geo_response = requests.get(
            f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}",
            timeout=10
        )
        if geo_response.status_code != 200:
            return jsonify({"status": "error", "message": "Reverse geocoding failed"}), 500
        
        geo_data = geo_response.json()
        address = geo_data.get('address', {})
        
        # Extract potential district names from various fields
        district_candidates = [
            address.get('county'),
            address.get('district'),
            address.get('municipality'),
            address.get('borough'),
            address.get('suburb'),
            address.get('city'),
            address.get('town'),
        ]
        district_candidates = [d for d in district_candidates if d]  # Remove None/empty
        
        if location_data is None or location_data.empty:
            return jsonify({"status": "error", "message": "Location data not available"}), 404
        
        # Get list of districts for the state
        if state:
            # Normalize state name
            state_normalized = state.lower().strip()
            available_districts = location_data[
                location_data['state_name'].str.lower() == state_normalized
            ]['dist_name'].dropna().unique().tolist()
        else:
            available_districts = location_data['dist_name'].dropna().unique().tolist()
        
        # Fuzzy match: find best district match
        best_match = None
        best_score = 0.0
        
        for candidate in district_candidates:
            for db_district in available_districts:
                # Try various matching strategies
                # 1. Exact match (case-insensitive)
                if candidate.lower() == db_district.lower():
                    best_match = db_district
                    best_score = 1.0
                    break
                
                # 2. Contains match
                if candidate.lower() in db_district.lower() or db_district.lower() in candidate.lower():
                    score = 0.9
                    if score > best_score:
                        best_match = db_district
                        best_score = score
                
                # 3. Fuzzy match using sequence matcher
                similarity = SequenceMatcher(None, candidate.lower(), db_district.lower()).ratio()
                if similarity > best_score:
                    best_match = db_district
                    best_score = similarity
            
            if best_score >= 0.8:  # Stop if we have a good match
                break
        
        if best_match and best_score >= 0.6:
            logger.info(f"✓ Detected district: {best_match} (score: {best_score:.2f}) from coords {lat},{lon}")
            return jsonify({
                "status": "success",
                "district": best_match,
                "confidence": round(best_score * 100, 2),
                "state": state,
                "candidate_names": district_candidates[:3]
            })
        else:
            logger.warning(f"⚠ No district match found for coords {lat},{lon}")
            return jsonify({
                "status": "no_match",
                "message": "Could not detect district from coordinates",
                "candidate_names": district_candidates[:3]
            }), 200
    
    except requests.exceptions.Timeout:
        return jsonify({"status": "error", "message": "Geocoding request timed out"}), 504
    except Exception as e:
        logger.error(f"Error in geo-district: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/soil-data', methods=['GET'])
def get_soil_data():
    """Get average soil parameters based on location"""
    try:
        state = request.args.get('state', '').strip()
        district = request.args.get('district', '').strip()
        
        # Translate location names from Hindi/Marathi to English if needed
        english_state, english_district = _translate_location_to_english(state, district)
        
        soil_params = _resolve_soil_parameters(english_state, english_district)
        
        return jsonify({
            "status": "success",
            "soil_data": soil_params,
            "message": f"Average soil data for {state}"
        })
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except RuntimeError as e:
        return jsonify({"status": "error", "message": str(e)}), 404
    except Exception as e:
        logger.error(f"Error getting soil data: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/weather-data', methods=['GET'])
def get_weather_data():
    """Get weather defaults based on selected state/district from loaded datasets."""
    try:
        state = request.args.get('state', '').strip()
        district = request.args.get('district', '').strip()
        
        # Translate location names from Hindi/Marathi to English if needed
        english_state, english_district = _translate_location_to_english(state, district)
        
        weather = _resolve_weather_data(english_state, english_district)

        return jsonify({
            "status": "success",
            "weather_data": weather,
            "message": f"Weather defaults resolved for {state}"
        })
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except RuntimeError as e:
        return jsonify({"status": "error", "message": str(e)}), 404
    except Exception as e:
        logger.error(f"Error getting weather data: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/recommend-by-location', methods=['POST'])
def recommend_by_location():
    """Resolve soil+weather from location and run crop recommendation in one call."""
    try:
        data = request.json or {}
        state = str(data.get('state', '')).strip()
        district = str(data.get('district', '')).strip()

        if not state:
            return jsonify({"status": "error", "message": "State is required"}), 400
        if not district:
            return jsonify({"status": "error", "message": "District is required"}), 400

        # Translate location names from Hindi/Marathi to English if needed
        english_state, english_district = _translate_location_to_english(state, district)
        
        result = _run_location_recommendation_logic(english_state, english_district)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 400
    except RuntimeError as e:
        return jsonify({"status": "error", "message": str(e)}), 503
    except Exception as e:
        logger.error(f"Error in location recommendation: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/testing-centers', methods=['GET'])
def get_testing_centers():
    """Get nearby soil testing centers"""
    try:
        state = request.args.get('state', '').strip()
        
        # Mock data - can be replaced with real database
        testing_centers_db = {
            'andhra pradesh': [
                {'name': 'Agri Research Station, Guntur', 'location': 'Guntur', 'phone': '0863-2346789'},
                {'name': 'Soil Testing Lab', 'location': 'Vijayawada', 'phone': '0866-2478965'}
            ],
            'karnataka': [
                {'name': 'Dept of Agriculture', 'location': 'Bangalore', 'phone': '080-22250000'},
                {'name': 'Krishi Vigyan Kendra', 'location': 'Mysore', 'phone': '0821-2419876'}
            ],
            'maharashtra': [
                {'name': 'Agri Technology Mgmt', 'location': 'Pune', 'phone': '020-24537890'},
                {'name': 'Soil Health Card Center', 'location': 'Nashik', 'phone': '0253-2576543'}
            ],
            'punjab': [
                {'name': 'PAU Soil Testing Lab', 'location': 'Ludhiana', 'phone': '0161-2401960'},
                {'name': 'Dept of Agriculture', 'location': 'Amritsar', 'phone': '0183-2227845'}
            ],
            'tamil nadu': [
                {'name': 'Tamil Nadu Agri Univ', 'location': 'Coimbatore', 'phone': '0422-6611200'},
                {'name': 'Soil Testing Lab', 'location': 'Chennai', 'phone': '044-28524624'}
            ],
            'uttar pradesh': [
                {'name': 'Krishi Bhawan', 'location': 'Lucknow', 'phone': '0522-2286532'},
                {'name': 'Soil Testing Center', 'location': 'Meerut', 'phone': '0121-2764219'}
            ],
            'haryana': [
                {'name': 'HAU Soil Lab', 'location': 'Hisar', 'phone': '01662-289239'},
                {'name': 'Agri Dept Testing Center', 'location': 'Karnal', 'phone': '0184-2252600'}
            ]
        }
        
        state_key = normalize_text(state)
        centers = testing_centers_db.get(state_key, [])
        
        return jsonify({
            "status": "success",
            "centers": centers,
            "helpline": "1800-180-1551",
            "helpline_name": "Kisan Call Centre (Toll Free)",
            "message": f"Testing centers for {state}" if centers else "Contact Kisan Call Centre for nearest center"
        })
    except Exception as e:
        logger.error(f"Error getting testing centers: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/recommend-crop', methods=['POST'])
def recommend_crop():
    """
    Recommend crops based on soil and environmental conditions
    
    Request body:
    {
        "nitrogen": float,
        "phosphorus": float,
        "potassium": float,
        "temperature": float,
        "humidity": float,
        "ph": float,
        "rainfall": float
    }
    """
    try:
        data = request.json or {}
        result = _run_crop_recommendation_logic(data)
        return jsonify(result)
    except ValueError as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400
    except RuntimeError as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 503
    except Exception as e:
        logger.error(f"Error in crop recommendation: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/yield-prediction', methods=['POST'])
def predict_yield():
    """
    Predict crop yield based on conditions
    
    Request body:
    {
        "nitrogen": float,
        "phosphorus": float,
        "potassium": float,
        "temperature": float,
        "humidity": float,
        "ph": float,
        "rainfall": float,
        "crop": string (optional)
    }
    """
    try:
        data = request.json
        
        # Extract features
        features = np.array([[
            data['nitrogen'],
            data['phosphorus'],
            data['potassium'],
            data['temperature'],
            data['humidity'],
            data['ph'],
            data['rainfall'],
            data.get('rainfall_deviation_pct', 10),
            data.get('npk_score', (data['nitrogen'] + data['phosphorus'] + data['potassium']) / 3),
            data.get('temp_favorability', data['temperature'] / 30),
            data.get('humidity_favorability', data['humidity'] / 100),
            data.get('ph_suitability', 1 - abs(data['ph'] - 7) / 7),
            data.get('growth_potential', 0.5),
            data.get('water_stress', 50)
        ]])
        
        # Scale features
        features_scaled = feature_scaler.transform(features)
        
        # Predict yield
        yield_pred = yield_predictor.predict(features_scaled)[0]
        
        return jsonify({
            "status": "success",
            "estimated_yield": round(float(yield_pred), 2),
            "unit": "kg/ha",
            "crop": data.get('crop', 'selected crop'),
            "confidence": "high"
        })
    
    except Exception as e:
        logger.error(f"Error in yield prediction: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

def _prepare_fertilizer_features(data: dict, crop: str):
    """Prepare features for fertilizer recommendation"""
    # Base features
    N = data.get('nitrogen', data.get('N', 50))
    P = data.get('phosphorus', data.get('P', 50))
    K = data.get('potassium', data.get('K', 50))
    temperature = data.get('temperature', 25)
    humidity = data.get('humidity', 70)
    ph = data.get('ph', 6.5)
    rainfall = data.get('rainfall', 1000)
    
    # Engineer features (same as training)
    npk_sum = N + P + K
    npk_balance = np.std([N, P, K])
    n_to_p_ratio = N / (P + 1)
    p_to_k_ratio = P / (K + 1)
    n_to_k_ratio = N / (K + 1)
    
    # Soil pH indicators
    ph_acidic = 1 if ph < 6.5 else 0
    ph_alkaline = 1 if ph > 7.5 else 0
    ph_neutral = 1 if 6.5 <= ph <= 7.5 else 0
    
    # Climate categories
    temp_category = 0 if temperature < 15 else (1 if temperature < 25 else (2 if temperature < 35 else 3))
    rainfall_category = 0 if rainfall < 500 else (1 if rainfall < 1000 else (2 if rainfall < 1500 else 3))
    humidity_category = 0 if humidity < 40 else (1 if humidity < 60 else (2 if humidity < 80 else 3))
    
    # Nutrient deficiency indicators
    n_deficient = 1 if N < 40 else 0
    p_deficient = 1 if P < 30 else 0
    k_deficient = 1 if K < 40 else 0
    
    # Encode crop
    crop_normalized = crop.strip().title()
    if crop_normalized in fertilizer_label_encoders['crop_encoder'].classes_:
        crop_encoded = fertilizer_label_encoders['crop_encoder'].transform([crop_normalized])[0]
    else:
        # Use most common crop as default
        crop_encoded = 0
    
    # Build feature array (must match training order)
    features = np.array([[
        N, P, K, temperature, humidity, ph, rainfall,
        npk_sum, npk_balance, n_to_p_ratio, p_to_k_ratio, n_to_k_ratio,
        ph_acidic, ph_alkaline, ph_neutral,
        temp_category, rainfall_category, humidity_category,
        n_deficient, p_deficient, k_deficient,
        crop_encoded
    ]])
    
    return features

def _run_fertilizer_recommendation_logic(data: dict, crop: str):
    """Core fertilizer recommendation logic"""
    if fertilizer_classifier is None or fertilizer_scaler is None or fertilizer_label_encoders is None:
        raise RuntimeError("Fertilizer model artifacts are not loaded")
    
    # Prepare features
    features = _prepare_fertilizer_features(data, crop)
    
    # Scale features
    features_scaled = fertilizer_scaler.transform(features)
    
    # Get predictions
    probabilities = fertilizer_classifier.predict_proba(features_scaled)[0]
    fertilizer_names = fertilizer_encoders_info['fertilizers']
    
    # Get top 3 recommendations
    top_indices = np.argsort(probabilities)[-3:][::-1]
    recommendations = []
    
    for idx in top_indices:
        fertilizer = fertilizer_names[idx]
        confidence = float(probabilities[idx]) * 100
        
        # Get application details based on fertilizer type
        application_details = _get_fertilizer_application_details(
            fertilizer, data.get('nitrogen', 50), data.get('phosphorus', 50), data.get('potassium', 50)
        )
        
        recommendations.append({
            "fertilizer": fertilizer,
            "confidence": round(confidence, 2),
            "dosage": application_details['dosage'],
            "application_method": application_details['method'],
            "benefits": application_details['benefits'],
            "timing": application_details['timing']
        })
    
    return {
        "status": "success",
        "crop": crop,
        "primary_fertilizer": recommendations[0]['fertilizer'],
        "recommendations": recommendations,
        "soil_analysis": {
            "nitrogen": data.get('nitrogen', data.get('N', 50)),
            "phosphorus": data.get('phosphorus', data.get('P', 50)),
            "potassium": data.get('potassium', data.get('K', 50)),
            "ph": data.get('ph', 6.5),
            "nitrogen_status": "Low" if data.get('nitrogen', 50) < 40 else ("Medium" if data.get('nitrogen', 50) < 80 else "High"),
            "phosphorus_status": "Low" if data.get('phosphorus', 50) < 30 else ("Medium" if data.get('phosphorus', 50) < 60 else "High"),
            "potassium_status": "Low" if data.get('potassium', 50) < 40 else ("Medium" if data.get('potassium', 50) < 80 else "High")
        }
    }

def _get_fertilizer_application_details(fertilizer: str, N: float, P: float, K: float):
    """Get detailed application guidance for fertilizers"""
    fertilizer_guide = {
        "Urea": {
            "dosage": "200-250 kg/ha" if N < 40 else ("150-200 kg/ha" if N < 80 else "100-150 kg/ha"),
            "method": "Split application: 50% at sowing, 25% at tillering, 25% at flowering",
            "benefits": "Rich in nitrogen (46% N), promotes vegetative growth and green foliage",
            "timing": "Apply during active growth stages. Avoid application during flowering for fruits"
        },
        "Dap": {
            "dosage": "150-200 kg/ha" if P < 30 else ("100-150 kg/ha" if P < 60 else "75-100 kg/ha"),
            "method": "Apply as basal dose at time of sowing, 5-7 cm deep near root zone",
            "benefits": "Contains 18% N and 46% P2O5, excellent for root development and flowering",
            "timing": "Best applied at sowing or transplanting stage"
        },
        "Mop": {
            "dosage": "100-150 kg/ha" if K < 40 else ("75-100 kg/ha" if K < 80 else "50-75 kg/ha"),
            "method": "Apply in 2 splits: 50% at sowing with DAP, 50% at flowering/fruiting stage",
            "benefits": "60% K2O content, improves disease resistance and crop quality",
            "timing": "Critical during reproductive stage for fruit/grain quality"
        },
        "Npk": {
            "dosage": "150-200 kg/ha for balanced nutrition",
            "method": "Apply 60% as basal + 40% as top dressing at critical growth stages",
            "benefits": "Balanced NPK ratio provides complete nutrition for optimal growth",
            "timing": "Basal at sowing + top dressing at 30-45 days after sowing"
        },
        "19:19:19 Npk": {
            "dosage": "100-150 kg/ha for complete nutrition",
            "method": "Apply through fertigation or broadcast and incorporate into soil",
            "benefits": "Equal NPK ratio (19:19:19) ensures balanced plant nutrition",
            "timing": "Suitable for all growth stages, especially vegetative and reproductive phases"
        },
        "10:26:26 Npk": {
            "dosage": "125-175 kg/ha, ideal for flowering crops",
            "method": "Apply as basal dose or side dressing during early flowering",
            "benefits": "High P & K promotes root growth, flowering, and fruiting",
            "timing": "Best at pre-flowering and early fruiting stages"
        },
        "Ssp": {
            "dosage": "200-250 kg/ha" if P < 30 else "150-200 kg/ha",
            "method": "Apply as basal dose, mix well with soil before sowing",
            "benefits": "16% P2O5 + 11% Sulphur, excellent for oilseeds and pulses",
            "timing": "Apply 7-10 days before sowing for best results"
        },
        "Compost": {
            "dosage": "5-10 tonnes/ha depending on soil organic matter",
            "method": "Broadcast uniformly and incorporate into top 15 cm of soil",
            "benefits": "Improves soil structure, water retention, and microbial activity",
            "timing": "Apply 2-3 weeks before sowing, during land preparation"
        },
        "Zinc Sulphate": {
            "dosage": "25-50 kg/ha for zinc deficient soils",
            "method": "Soil application or foliar spray (0.5% solution)",
            "benefits": "Corrects zinc deficiency, improves enzyme activity and crop yield",
            "timing": "Soil application at sowing or foliar spray at 30 days after sowing"
        },
        "Magnesium Sulphate": {
            "dosage": "25-30 kg/ha or 2% foliar spray",
            "method": "Soil application with basal fertilizers or foliar spray",
            "benefits": "Essential for chlorophyll formation and enzyme activation",
            "timing": "Apply when magnesium deficiency symptoms appear (yellowing between veins)"
        }
    }
    
    # Default guidance for fertilizers not in the guide
    default_guide = {
        "dosage": "Apply as per soil test recommendations",
        "method": "Follow manufacturer's guidelines for application",
        "benefits": "Provides essential nutrients for crop growth and development",
        "timing": "Apply according to crop growth stage requirements"
    }
    
    return fertilizer_guide.get(fertilizer, default_guide)

@app.route('/api/recommend-fertilizer', methods=['POST'])
def recommend_fertilizer():
    """
    Recommend fertilizers based on soil conditions and crop
    
    Request body:
    {
        "crop": string,
        "nitrogen": float,
        "phosphorus": float,
        "potassium": float,
        "temperature": float,
        "humidity": float,
        "ph": float,
        "rainfall": float
    }
    """
    try:
        data = request.json or {}
        
        # Validate crop field
        if 'crop' not in data or not data['crop']:
            return jsonify({
                "status": "error",
                "message": "Crop name is required"
            }), 400
        
        crop = data['crop']
        result = _run_fertilizer_recommendation_logic(data, crop)
        return jsonify(result)
        
    except RuntimeError as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 503
    except Exception as e:
        logger.error(f"Error in fertilizer recommendation: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

def get_agmarket_trend_data(crop, state=None, district=None, market=None, days=90):
    """Fetch trend data from agmarket API - NOT USED for 90-day forecasts.
    90-day predictions are exclusively from local CSV dataset for consistency and reliability."""
    try:
        # Try to fetch live data from agmarket
        records, err = fetch_agmarket_live(crop, source="auto")
        
        if not records or err:
            logger.info(f"No agmarket data for {crop}, falling back to local data")
            return None
        
        # Convert agmarket API records to time-series DataFrame
        processed_records = []
        
        for record in records:
            try:
                # Parse date from various formats
                date_str = record.get("date", "")
                if not date_str:
                    continue
                
                # Try parsing different date formats
                parsed_date = None
                for fmt in ["%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d-%b-%Y"]:
                    try:
                        parsed_date = datetime.strptime(str(date_str).strip(), fmt)
                        break
                    except:
                        continue
                
                if not parsed_date:
                    continue
                
                # Filter by state/district/market if provided
                record_state = record.get("state", "").strip().lower()
                record_district = record.get("district", "").strip().lower()
                record_market = record.get("market", "").strip().lower()
                
                if state and state.lower() not in record_state:
                    continue
                if district and district.lower() not in record_district:
                    continue
                if market and market.lower() not in record_market:
                    continue
                
                modal_price = float(record.get("modal_price") or 0)
                if modal_price <= 0:
                    continue
                
                processed_records.append({
                    "price_date": parsed_date,
                    "date_ordinal": parsed_date.toordinal(),
                    "month": parsed_date.month,
                    "dayofyear": parsed_date.timetuple().tm_yday,
                    "modal_price": modal_price,
                    "min_price": float(record.get("min_price") or modal_price),
                    "max_price": float(record.get("max_price") or modal_price),
                    "market": record.get("market", ""),
                    "state": record.get("state", ""),
                    "district": record.get("district", "")
                })
            except Exception as e:
                logger.debug(f"Error processing agmarket record: {e}")
                continue
        
        if not processed_records:
            logger.info(f"No valid agmarket records for {crop} after filtering")
            return None
        
        # Convert to DataFrame
        df = pd.DataFrame(processed_records)
        
        # Sort by date and drop duplicates (keep last occurrence)
        df = df.sort_values("price_date")
        df = df.drop_duplicates(subset=["price_date"], keep="last")
        
        # Filter to last N days
        latest_date = df["price_date"].max()
        cutoff_date = latest_date - timedelta(days=days)
        df = df[df["price_date"] >= cutoff_date].copy()
        
        logger.info(f"Successfully fetched {len(df)} agmarket records for {crop}")
        return df if len(df) > 0 else None
        
    except Exception as e:
        logger.error(f"Error fetching agmarket trend data for {crop}: {e}")
        return None

@app.route('/api/market-insights/<crop>', methods=['GET'])
def market_insights(crop):
    """Get market insights for a specific crop using local dataset and 30-day forecasts"""
    try:
        state = request.args.get("state")
        district = request.args.get("district")
        market = request.args.get("market")
        season = request.args.get("season")
        
        crop_data = None
        data_source = "local_csv"
        
        # Use local dataset
        crop_data_all = filter_market_prices(crop, state=state, district=district, market=market)
        season_filtered_data, season_filter_applied = apply_season_filter(crop_data_all, season)
        crop_data = season_filtered_data if not season_filtered_data.empty else crop_data_all
        data_source = "local_csv"
        logger.info(f"Using local CSV data for {crop} - {len(crop_data)} records")

        if crop_data is None or crop_data.empty:
            return jsonify({
                "status": "success",
                "crop": crop,
                "has_market_data": False,
                "data_source": data_source,
                "market_data": {
                    "demand_trend": "no data",
                    "price_stability": "no data",
                    "global_demand": "no data",
                    "recommendation": f"No price records found for {crop} in market dataset. Try a different crop."
                },
                "optimal_conditions": {
                    "temperature_range": "20-30°C",
                    "humidity_range": "60-80%",
                    "ph_range": "6.0-7.5",
                    "rainfall_range": "400-800mm"
                },
                "risk_assessment": {
                    "weather_risk": "medium",
                    "market_risk": "medium",
                    "disease_risk": "medium",
                    "overall_risk": "medium"
                },
                "seasonal_info": {
                    "best_season": season or "rainy season",
                    "growing_period": "100-150 days",
                    "harvest_time": "varies by region"
                }
            })

        crop_data = crop_data.sort_values("price_date")
        latest_row = crop_data.iloc[-1]
        latest_date = latest_row["price_date"]
        latest_price = float(latest_row["modal_price"])

        # Get 30-day data for trend analysis
        last_30 = crop_data[crop_data["price_date"] >= latest_date - timedelta(days=30)]
        
        avg_30 = float(last_30["modal_price"].mean()) if not last_30.empty else latest_price

        # Use trend analysis on available historical data
        trend_analysis = classify_trend_90day(crop_data)
        trend = trend_analysis["trend"]
        trend_strength = trend_analysis["strength"]
        trend_confidence = trend_analysis["confidence"]
        
        stability = classify_stability(crop_data)

        cache_key = f"{normalize_text(crop)}|{normalize_text(state)}|{normalize_text(district)}|{normalize_text(market)}"
        
        # Get 30-day forecast
        forecast = forecast_price_ml(crop_data, cache_key)

        if stability == "volatile":
            market_risk = "high"
        elif stability == "moderate":
            market_risk = "medium"
        else:
            market_risk = "low"

        demand_trend = "high" if trend == "increasing" else "moderate" if trend == "stable" else "low"

        recommendation = f"{crop.title()} prices show {trend} trend with {trend_strength:.1f}% strength"
        if forecast:
            recommendation += f". Expected 30-day average: ₹{forecast['avg']:.1f}/quintal"
        recommendation += "."

        insights = {
            "status": "success",
            "crop": crop,
            "has_market_data": True,
            "data_source": data_source,
            "market_data": {
                "demand_trend": demand_trend,
                "price_stability": stability,
                "global_demand": trend,
                "trend_details": {
                    "trend": trend,
                    "strength": round(trend_strength, 2),
                    "confidence": round(trend_confidence, 3),
                    "period_days": len(crop_data)
                },
                "latest_price": {
                    "value": round(latest_price, 2),
                    "unit": "INR/quintal",
                    "date": latest_date.strftime("%Y-%m-%d")
                },
                "recent_average": {
                    "value": round(avg_30, 2),
                    "unit": "INR/quintal",
                    "days": 30
                },
                "forecast_30d": {
                    "avg": round(forecast["avg"], 2) if forecast else None,
                    "min": round(forecast["min"], 2) if forecast else None,
                    "max": round(forecast["max"], 2) if forecast else None,
                    "model": forecast["model"] if forecast else None,
                    "days": forecast["days"] if forecast else None
                },
                "recommendation": recommendation
            },
            "optimal_conditions": {
                "temperature_range": "20-30°C",
                "humidity_range": "60-80%",
                "ph_range": "6.0-7.5",
                "rainfall_range": "400-800mm"
            },
            "risk_assessment": {
                "weather_risk": "medium",
                "market_risk": market_risk,
                "disease_risk": "medium",
                "overall_risk": "medium"
            },
            "seasonal_info": {
                "best_season": season or "rainy season",
                "growing_period": "100-150 days",
                "harvest_time": "varies by region"
            },
            "data_coverage": {
                "records": int(crop_data.shape[0]),
                "last_30_records": int(last_30.shape[0]),
                "from": crop_data["price_date"].min().strftime("%Y-%m-%d"),
                "to": latest_date.strftime("%Y-%m-%d"),
                "season_filter_applied": season_filter_applied,
                "data_source": data_source,
                "note": f"Using {len(last_30)} days of data for trend analysis"
            }
        }
        
        return jsonify(insights)
    
    except Exception as e:
        logger.error(f"Error getting market insights for {crop}: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "crop": crop,
            "message": str(e)
        }), 500


@app.route('/api/market-insights/<crop>/chart-data', methods=['GET'])
def market_insights_chart_data(crop):
    """Get time series and mandi-wise price data for charts"""
    try:
        state = request.args.get("state")
        district = request.args.get("district")
        market = request.args.get("market")
        crop_data = filter_market_prices(crop, state=state, district=district, market=market)
        if crop_data.empty:
            return jsonify({
                "status": "success",
                "crop": crop,
                "time_series": [],
                "by_mandi": [],
                "message": "No price records for this crop."
            })

        crop_data = crop_data.sort_values("price_date")
        latest_date = crop_data["price_date"].max()
        cutoff = latest_date - timedelta(days=90)
        recent = crop_data[crop_data["price_date"] >= cutoff]

        ts_df = recent.groupby(recent["price_date"].dt.date).agg(
            modal_price=("modal_price", "mean"),
            min_price=("modal_price", "min"),
            max_price=("modal_price", "max")
        ).reset_index()
        ts_df["price_date"] = ts_df["price_date"].astype(str)
        time_series = [
            {
                "date": r["price_date"],
                "modal_price": round(float(r["modal_price"]), 2),
                "min_price": round(float(r["min_price"]), 2),
                "max_price": round(float(r["max_price"]), 2)
            }
            for _, r in ts_df.iterrows()
        ]

        latest_date_only = latest_date.date() if hasattr(latest_date, "date") else latest_date
        crop_latest = crop_data[crop_data["price_date"].dt.date == latest_date_only]
        if crop_latest.empty:
            crop_latest = crop_data[crop_data["price_date"] == latest_date]
        latest_per_mandi = (
            crop_latest
            .groupby(["market", "state", "district"], as_index=False)
            .agg(modal_price=("modal_price", "mean"), min_price=("modal_price", "min"), max_price=("modal_price", "max"))
        )
        by_mandi = [
            {
                "market": row["market"].title() if pd.notna(row["market"]) else "Unknown",
                "state": row["state"].title() if pd.notna(row["state"]) else "",
                "district": row["district"].title() if pd.notna(row["district"]) else "",
                "modal_price": round(float(row["modal_price"]), 2),
                "min_price": round(float(row["min_price"]), 2),
                "max_price": round(float(row["max_price"]), 2),
                "date": latest_date.strftime("%Y-%m-%d")
            }
            for _, row in latest_per_mandi.head(15).iterrows()
        ]
        by_mandi.sort(key=lambda x: x["modal_price"], reverse=True)

        return jsonify({
            "status": "success",
            "crop": crop,
            "time_series": time_series,
            "by_mandi": by_mandi,
            "latest_date": latest_date.strftime("%Y-%m-%d")
        })
    except Exception as e:
        logger.error(f"Error getting chart data: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


def _fetch_ceda_commodities():
    """Fetch CEDA commodity list. Returns list of {name, id} for display + lookup."""
    global _ceda_commodities_cache
    if _ceda_commodities_cache is not None:
        return _ceda_commodities_cache
    try:
        url = CEDA_AGMARKNET_BASE + "/commodities"
        req = urllib.request.Request(url, headers={"User-Agent": "KisanSathi/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        items = data.get("data") or []
        _ceda_commodities_cache = [
            {"name": (c.get("commodity_disp_name") or "").strip(), "id": c.get("commodity_id")}
            for c in items if c.get("commodity_id")
        ]
        return _ceda_commodities_cache
    except Exception as e:
        logger.warning(f"CEDA commodities fetch failed: {e}")
        return []


COMMODITY_NAME_TO_CEDA = {
    "paddy": "paddy", "rice": "rice", "wheat": "wheat", "maize": "maize",
    "tomato": "tomato", "potato": "potato", "onion": "onion", "cotton": "cotton",
    "sugarcane": "sugarcane", "groundnut": "groundnut", "banana": "banana",
    "mango": "mango", "chickpea": "gram", "gram": "gram", "turmeric": "turmeric",
    "ginger": "ginger", "red gram": "red gram", "black gram": "black gram",
    "green gram": "green gram", "bajra": "bajra", "jowar": "jowar", "cauliflower": "cauliflower",
    "brinjal": "brinjal", "cabbage": "cabbage", "green peas": "green peas",
}


def _resolve_ceda_commodity_id(commodity_name):
    """Map crop name to CEDA commodity_id."""
    name = normalize_text(commodity_name)
    if not name:
        return None
    search_name = COMMODITY_NAME_TO_CEDA.get(name, name)
    items = _fetch_ceda_commodities()
    for item in items:
        disp_name = item.get("name") or ""
        cid = item.get("id")
        if not disp_name or not cid:
            continue
        d = disp_name.lower()
        s = search_name.lower()
        if s in d or d.startswith(s):
            return cid
        if s.replace(" ", "") in d.replace(" ", "").replace("-", ""):
            return cid
        first = (d.split()[0] if d else "")
        if s == first or s in first:
            return cid
    return None


def _fetch_ceda_prices(commodity_id, api_key):
    """Try to fetch price data from CEDA Agmarknet API. Returns (records, None) or (None, error)."""
    if not commodity_id or not api_key:
        return None, "missing_params"
    headers = {
        "User-Agent": "KisanSathi/1.0",
        "Accept": "application/json",
    }
    endpts = [
        f"{CEDA_AGMARKNET_BASE}/price_data?commodity_id={commodity_id}&state_id=0&api_key={api_key}",
        f"{CEDA_AGMARKNET_BASE}/price-data?commodity_id={commodity_id}&state_id=0&api_key={api_key}",
        f"{CEDA_AGMARKNET_BASE}/data?commodity_id={commodity_id}&api_key={api_key}",
        f"{CEDA_AGMARKNET_BASE}/table?commodity_id={commodity_id}&api_key={api_key}",
        f"{CEDA_AGMARKNET_BASE}/records?commodity_id={commodity_id}&api_key={api_key}",
    ]
    for url in endpts:
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode())
            rows = data.get("data") or data.get("records") or data.get("rows") or []
            if rows:
                return rows, None
        except Exception as e:
            logger.debug(f"CEDA endpoint {url[:60]}... failed: {e}")
            continue
    return None, "ceda_no_price_endpoint"


def _normalize_ceda_record(r, commodity_name):
    """Convert CEDA API record to our format."""
    try:
        modal = float(r.get("modal_price") or r.get("modal_price__rs_quintal") or r.get("Modal_Price") or 0)
        min_p = float(r.get("min_price") or r.get("min_price__rs_quintal") or r.get("Min_Price") or modal)
        max_p = float(r.get("max_price") or r.get("max_price__rs_quintal") or r.get("Max_Price") or modal)
        market = (r.get("market") or r.get("market_name") or r.get("Market") or "Unknown").strip().title()
        state = (r.get("state") or r.get("state_name") or r.get("State") or "").strip().title()
        district = (r.get("district") or r.get("district_name") or r.get("District") or "").strip().title()
        date_val = (r.get("arrival_date") or r.get("price_date") or r.get("date") or r.get("Date") or "").strip()
        return {
            "market": market,
            "state": state,
            "district": district,
            "commodity": commodity_name.strip().title(),
            "modal_price": round(modal, 2),
            "min_price": round(min_p, 2),
            "max_price": round(max_p, 2),
            "date": date_val,
        }
    except (TypeError, ValueError):
        return None


def fetch_ceda_agmarknet_live(commodity):
    """Fetch live prices from CEDA Agmarknet (agmarknet.ceda.ashoka.edu.in)."""
    if not AGMARKET_API_KEY:
        return [], "no_api_key"
    cid = _resolve_ceda_commodity_id(commodity)
    if not cid:
        return [], "commodity_not_found"
    rows, err = _fetch_ceda_prices(cid, AGMARKET_API_KEY)
    if err:
        return [], err
    out = []
    for r in rows:
        rec = _normalize_ceda_record(r, commodity)
        if rec and rec.get("modal_price", 0) > 0:
            out.append(rec)
    return out, None


def _normalize_data_gov_record(r, commodity):
    """Parse a data.gov.in record - supports various field name conventions."""
    modal = float(
        r.get("modal_price") or r.get("Modal_Price") or r.get("modal_price__rs_quintal") or 0
    )
    min_p = float(
        r.get("min_price") or r.get("Min_Price") or r.get("min_price__rs_quintal") or modal
    )
    max_p = float(
        r.get("max_price") or r.get("Max_Price") or r.get("max_price__rs_quintal") or modal
    )
    if modal <= 0:
        return None
    return {
        "market": (
            r.get("market") or r.get("Market") or r.get("market_name") or "Unknown"
        ).strip().title(),
        "state": (r.get("state") or r.get("State") or "").strip().title(),
        "district": (
            r.get("district") or r.get("District") or r.get("district_name") or ""
        ).strip().title(),
        "commodity": (
            r.get("commodity") or r.get("Commodity") or commodity
        ).strip().title(),
        "modal_price": round(modal, 2),
        "min_price": round(min_p, 2),
        "max_price": round(max_p, 2),
        "date": (
            r.get("arrival_date")
            or r.get("Arrival_Date")
            or r.get("price_date")
            or r.get("date")
            or ""
        ).strip(),
    }


def fetch_data_gov_in_live(commodity):
    """Fetch live mandi prices from data.gov.in (OGD) - primary source for Aaj ka bhav."""
    if not DATA_GOV_IN_API_KEY:
        return [], "no_api_key"
    commodity_clean = commodity.strip()
    filter_val = urllib.parse.quote(commodity_clean)
    for resource_id in DATA_GOV_IN_RESOURCE_IDS:
        for filter_key in ("commodity", "Commodity"):
            url = (
                f"https://api.data.gov.in/resource/{resource_id}"
                f"?api-key={DATA_GOV_IN_API_KEY}"
                f"&format=json&limit=100&offset=0"
                f"&filters[{filter_key}]={filter_val}"
            )
            try:
                req = urllib.request.Request(
                    url, headers={"User-Agent": "KisanSathi/1.0"}
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = json.loads(resp.read().decode())
            except Exception as e:
                logger.debug(f"data.gov.in {resource_id[:8]}... failed: {e}")
                continue
            records = data.get("records") or data.get("data") or []
            if not records:
                continue
            out = []
            for r in records:
                rec = _normalize_data_gov_record(r, commodity_clean)
                if rec:
                    out.append(rec)
            if out:
                return out, None
    return [], "no_data"


def fetch_agmarket_live(commodity, source="auto"):
    """Fetch live mandi prices. data.gov.in first (for Aaj ka bhav), then CEDA."""
    if source == "local":
        return [], "local_only"
    if not DATA_GOV_IN_API_KEY and not AGMARKET_API_KEY:
        return [], "no_api_key"
    
    # Prefer data.gov.in (OGD) as primary live source for 'Aaj ka bhav'
    records, err = fetch_data_gov_in_live(commodity)
    if records:
        return records, None
        
    # Fallback to CEDA Agmarknet if data.gov.in doesn't return data
    records, err2 = fetch_ceda_agmarknet_live(commodity)
    if records:
        return records, None
        
    return [], err or err2


def _get_local_chart_fallback(commodity, days=90):
    """Build time_series + by_mandi from local market_prices for specified number of days."""
    if market_prices is None:
        return [], [], None
    crop_data = filter_market_prices(commodity)
    if crop_data.empty:
        crop_key = normalize_text(commodity)
        if crop_key and "commodity" in market_prices.columns:
            mask = market_prices["commodity"].astype(str).str.contains(
                crop_key, case=False, na=False, regex=False
            )
            crop_data = market_prices.loc[mask].copy()
    if crop_data.empty:
        return [], [], None
    crop_data = crop_data.sort_values("price_date")
    latest_date = crop_data["price_date"].max()
    # Filter to requested number of days
    cutoff_date = latest_date - timedelta(days=days-1)
    recent = crop_data[crop_data["price_date"] >= cutoff_date]
    ts_df = recent.groupby(recent["price_date"].dt.date).agg(
        modal_price=("modal_price", "mean"),
        min_price=("modal_price", "min"),
        max_price=("modal_price", "max")
    ).reset_index()
    time_series = [
        {
            "date": str(r["price_date"]) if not isinstance(r["price_date"], str) else r["price_date"],
            "modal_price": round(float(r["modal_price"]), 2),
            "min_price": round(float(r["min_price"]), 2),
            "max_price": round(float(r["max_price"]), 2),
        }
        for _, r in ts_df.iterrows()
    ]
    if time_series and len(time_series) < days:
        from datetime import date
        def parse_d(s):
            s = str(s).strip()[:10]
            try:
                if "-" in s:
                    return datetime.strptime(s, "%Y-%m-%d").date()
                if "/" in s:
                    parts = s.split("/")
                    if len(parts) == 3:
                        d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
                        if y < 100:
                            y += 2000
                        return date(y, m, d)
            except (ValueError, TypeError):
                pass
            return None
        valid_ts = [(t, parse_d(t["date"])) for t in time_series]
        valid_ts = [(t, dt) for t, dt in valid_ts if dt is not None]
        if valid_ts:
            dates_sorted = sorted([dt for _, dt in valid_ts])
            price_by_date = {dt.strftime("%Y-%m-%d"): t for t, dt in valid_ts}
            end_date = dates_sorted[-1]
            start_date = end_date - timedelta(days=days - 1)
            expanded = []
            for i in range(days):
                d = start_date + timedelta(days=i)
                d_str = d.strftime("%Y-%m-%d")
                if d_str in price_by_date:
                    expanded.append(price_by_date[d_str])
                else:
                    nearest_dt = min(dates_sorted, key=lambda dt_key: abs((dt_key - d).days))
                    nearest = nearest_dt.strftime("%Y-%m-%d")
                    expanded.append({
                        "date": d_str,
                        "modal_price": price_by_date[nearest]["modal_price"],
                        "min_price": price_by_date[nearest]["min_price"],
                        "max_price": price_by_date[nearest]["max_price"],
                    })
            time_series = expanded
    latest_date_only = latest_date.date() if hasattr(latest_date, "date") else latest_date
    crop_latest = crop_data[crop_data["price_date"].dt.date == latest_date_only]
    if crop_latest.empty:
        crop_latest = crop_data[crop_data["price_date"] == latest_date]
    latest_per_mandi = (
        crop_latest
        .groupby(["market", "state", "district"], as_index=False)
        .agg(modal_price=("modal_price", "mean"), min_price=("modal_price", "min"), max_price=("modal_price", "max"))
    )
    by_mandi = [
        {
            "market": (row["market"].title() if pd.notna(row["market"]) else "Unknown"),
            "district": (row["district"].title() if pd.notna(row["district"]) else ""),
            "state": (row["state"].title() if pd.notna(row["state"]) else ""),
            "modal_price": round(float(row["modal_price"]), 2),
            "min_price": round(float(row["min_price"]), 2),
            "max_price": round(float(row["max_price"]), 2),
        }
        for _, row in latest_per_mandi.head(15).iterrows()
    ]
    by_mandi.sort(key=lambda x: x["modal_price"], reverse=True)
    
    # Build latest_record with price info instead of just date string
    latest_record = None
    if not crop_latest.empty:
        latest_row = crop_latest.iloc[0]
        latest_record = {
            "date": latest_date.strftime("%Y-%m-%d") if hasattr(latest_date, "strftime") else str(latest_date),
            "modal_price": round(float(latest_row.get("modal_price", 0)), 2),
            "price": round(float(latest_row.get("modal_price", 0)), 2),  # Alias for compatibility
            "market": latest_row.get("market", "Local Market"),
            "state": latest_row.get("state", ""),
            "district": latest_row.get("district", ""),
        }
    
    return time_series, by_mandi, latest_record


@app.route('/api/agmarket/history', methods=['GET'])
def agmarket_history():
    """90-day price trend from local dataset only (no live API)."""
    commodity = request.args.get("commodity", "").strip()
    days = min(365, max(7, int(request.args.get("days", 90) or 90)))
    if not commodity:
        return jsonify({"status": "error", "message": "commodity is required"}), 400
    time_series, by_mandi, latest = _get_local_chart_fallback(commodity, days=days)
    return jsonify({
        "status": "success",
        "time_series": time_series or [],
        "by_mandi": by_mandi or [],
        "latest_date": latest,
        "source": "local",
        "records": [],
    })


def _get_local_commodities_fallback():
    """Fallback commodity list from local market_prices when CEDA is unavailable."""
    if market_prices is None or market_prices.empty:
        return []
    names = market_prices["commodity"].astype(str).str.strip().dropna().unique()
    return [{"id": normalize_text(n), "name": n.title() if n else ""} for n in sorted(names) if n]


@app.route('/api/ceda/commodities', methods=['GET'])
def ceda_commodities():
    """Return commodity list from CEDA Agmarknet; fallback to local data if CEDA fails."""
    try:
        items = _fetch_ceda_commodities()
        commodities = [{"id": c["id"], "name": c["name"]} for c in items if c.get("name") and c.get("id")]
        if not commodities:
            commodities = _get_local_commodities_fallback()
        sort_by_data = request.args.get("sort_by_data", "").strip().lower() in ("1", "true", "yes")
        if sort_by_data and commodities:
            available = _get_available_crops_set()
            def has_data(c):
                n = normalize_text(c.get("name", ""))
                if not n:
                    return False
                if n in available:
                    return True
                for a in available:
                    if n in a or a in n:
                        return True
                return False
            commodities = sorted(commodities, key=lambda c: (0 if has_data(c) else 1, (c.get("name") or "").lower()))
        return jsonify({
            "status": "success",
            "source": "ceda" if items else "local",
            "commodities": commodities,
            "count": len(commodities),
        })
    except Exception as e:
        logger.error(f"Error fetching CEDA commodities: {e}")
        try:
            commodities = _get_local_commodities_fallback()
            return jsonify({
                "status": "success",
                "source": "local",
                "commodities": commodities,
                "count": len(commodities),
            })
        except Exception as e2:
            logger.error(f"Local fallback failed: {e2}")
            return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/agmarket/live', methods=['GET'])
def agmarket_live():
    """Fetch live prices from data.gov.in API (aaj ka bhav). 
    Only uses live APIs - no local data fallback for this endpoint.
    For price trends and insights, local data is used in other endpoints.
    """
    commodity = request.args.get("commodity", "").strip()
    source = request.args.get("source", "api").strip().lower()
    if not commodity:
        return jsonify({"status": "error", "message": "commodity is required"}), 400
    
    if source == "local":
        return jsonify({
            "status": "success",
            "source": "local",
            "live": False,
            "message": "Using local dataset only.",
            "records": []
        })
    
    # Try to fetch live data from API only
    records, err = fetch_agmarket_live(commodity, source=source)
    
    if err == "no_api_key":
        return jsonify({
            "status": "success",
            "source": "backend",
            "live": False,
            "message": "live price unavailable",
            "records": []
        })
    
    if records:
        return jsonify({
            "status": "success",
            "source": "agmarknet",
            "live": True,
            "records": records[:50],
            "latest_date": records[0]["date"] if records else None
        })
    
    # API failed or returned no data
    logger.warning(f"API failed to fetch live prices for {commodity} (err={err})")
    return jsonify({
        "status": "success",
        "source": "backend",
        "live": False,
        "message": "live price unavailable",
        "records": []
    })


@app.route('/api/seasonal-recommendations/<season>', methods=['GET'])
def seasonal_recommendations(season):
    """Get crop recommendations for a specific season"""
    try:
        season_key = normalize_text(season)
        if season_key not in SEASON_MONTHS:
            return jsonify({
                "status": "error",
                "message": f"Invalid season '{season}'. Use summer, rainy, winter, or spring."
            }), 400

        if market_prices is None or market_prices.empty:
            return jsonify({
                "status": "success",
                "season": season,
                "recommended_crops": [],
                "reason": "Market dataset not loaded."
            })

        seasonal_df = market_prices[market_prices["month"].isin(SEASON_MONTHS[season_key])]

        if seasonal_df.empty:
            return jsonify({
                "status": "success",
                "season": season,
                "recommended_crops": [],
                "reason": f"No market records available for {season} season."
            })

        commodity_rank = (
            seasonal_df.groupby("commodity")
            .agg(records=("commodity", "count"), avg_price=("modal_price", "mean"))
            .sort_values(["records", "avg_price"], ascending=[False, False])
            .head(6)
            .reset_index()
        )

        crops = [item.title() for item in commodity_rank["commodity"].tolist()]

        return jsonify({
            "status": "success",
            "season": season,
            "recommended_crops": crops,
            "reason": f"Top commodities in {season} based on available market records",
            "data_source": "processed/cleaned_Agriculture_price_dataset.csv"
        })

    except Exception as e:
        logger.error(f"Error in seasonal recommendations: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/feature-importance', methods=['GET'])
def feature_importance():
    """Get feature importance from the model"""
    try:
        with open(MODEL_DIR / "feature_importance.json", 'r') as f:
            importance = json.load(f)
        
        feature_names = model_metadata['feature_names']
        detailed_importance = []
        
        for item in importance:
            if item['feature'] < len(feature_names):
                detailed_importance.append({
                    "feature": feature_names[item['feature']],
                    "importance": round(item['importance'], 4)
                })
        
        return jsonify({
            "status": "success",
            "feature_importance": sorted(detailed_importance, key=lambda x: x['importance'], reverse=True)
        })
    
    except Exception as e:
        logger.error(f"Error getting feature importance: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/model-info', methods=['GET'])
def model_info():
    """Get information about the trained models"""
    return jsonify({
        "status": "success",
        "models": {
            "crop_classifier": {
                "type": model_metadata['crop_classifier']['model_type'],
                "accuracy": round(model_metadata['crop_classifier']['test_accuracy'], 4),
                "f1_score": round(model_metadata['crop_classifier']['f1_score'], 4)
            },
            "yield_predictor": {
                "type": model_metadata['yield_predictor']['model_type'],
                "r2_score": round(model_metadata['yield_predictor']['r2_score'], 4),
                "rmse": round(model_metadata['yield_predictor']['test_rmse'], 4)
            }
        }
    })

# ============= GLOBAL MARKET ACCESS ENDPOINTS =============

@app.route('/api/global/countries', methods=['GET'])
def get_global_countries():
    """Get list of countries with export data"""
    if not global_market_processor:
        return jsonify({
            "status": "error",
            "message": "Global market data not available"
        }), 503
    
    try:
        countries = global_market_processor.get_countries()
        return jsonify({
            "status": "success",
            "countries": countries,
            "count": len(countries)
        })
    except Exception as e:
        logger.error(f"Error fetching countries: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/global/commodities', methods=['GET'])
def get_global_commodities():
    """Get list of commodities with export data"""
    if not global_market_processor:
        return jsonify({
            "status": "error",
            "message": "Global market data not available"
        }), 503
    
    try:
        commodities = global_market_processor.get_commodities()
        return jsonify({
            "status": "success",
            "commodities": commodities,
            "count": len(commodities)
        })
    except Exception as e:
        logger.error(f"Error fetching commodities: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/global/export-by-country/<country>', methods=['GET'])
def get_export_by_country(country):
    """Get export data for a specific country"""
    if not global_market_processor:
        return jsonify({
            "status": "error",
            "message": "Global market data not available"
        }), 503
    
    try:
        element_type = request.args.get('element', 'Export quantity')
        data = global_market_processor.get_export_by_country(country, element_type)
        
        if data.empty:
            return jsonify({
                "status": "success",
                "country": country,
                "exports": [],
                "message": "No data available"
            })
        
        exports = data.to_dict('records')
        return jsonify({
            "status": "success",
            "country": country,
            "element": element_type,
            "exports": exports,
            "count": len(exports)
        })
    except Exception as e:
        logger.error(f"Error fetching country exports: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/global/export-demand', methods=['GET'])
def get_export_demand():
    """Get global export demand trend"""
    if not global_market_processor:
        return jsonify({
            "status": "error",
            "message": "Global market data not available"
        }), 503
    
    try:
        commodity = request.args.get('commodity')
        element_type = request.args.get('element', 'Export quantity')
        
        data = global_market_processor.get_global_export_demand(commodity, element_type)
        
        if data.empty:
            return jsonify({
                "status": "success",
                "commodity": commodity,
                "demand": [],
                "message": "No data available"
            })
        
        demand_list = data.to_dict('records')
        return jsonify({
            "status": "success",
            "commodity": commodity or "All commodities",
            "element": element_type,
            "demand": demand_list,
            "years": data['Year'].tolist()
        })
    except Exception as e:
        logger.error(f"Error fetching export demand: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/global/commodity-trend/<commodity>', methods=['GET'])
def get_commodity_trend(commodity):
    """Get commodity export trend by country"""
    if not global_market_processor:
        return jsonify({
            "status": "error",
            "message": "Global market data not available"
        }), 503
    
    try:
        element_type = request.args.get('element', 'Export quantity')
        data = global_market_processor.get_commodity_export_trend(commodity, element_type)
        
        if data.empty:
            return jsonify({
                "status": "success",
                "commodity": commodity,
                "trend": [],
                "message": "No data available"
            })
        
        # Convert to chart-friendly format
        trend_data = []
        for year in data.index:
            year_data = {"year": int(year)}
            for country in data.columns:
                year_data[country] = float(data.loc[year, country]) if pd.notna(data.loc[year, country]) else 0
            trend_data.append(year_data)
        
        return jsonify({
            "status": "success",
            "commodity": commodity,
            "element": element_type,
            "trend": trend_data,
            "countries": data.columns.tolist()
        })
    except Exception as e:
        logger.error(f"Error fetching commodity trend: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/global/top-exporters', methods=['GET'])
def get_top_exporters():
    """Get top exporting countries"""
    if not global_market_processor:
        return jsonify({
            "status": "error",
            "message": "Global market data not available"
        }), 503
    
    try:
        commodity = request.args.get('commodity')
        year = int(request.args.get('year', 2024))
        limit = int(request.args.get('limit', 10))
        element_type = request.args.get('element', 'Export quantity')
        
        data = global_market_processor.get_top_exporters(commodity, year, limit, element_type)
        
        if data.empty:
            return jsonify({
                "status": "success",
                "commodity": commodity or "All",
                "year": year,
                "exporters": [],
                "message": "No data available"
            })
        
        exporters = data.to_dict('records')
        return jsonify({
            "status": "success",
            "commodity": commodity or "All commodities",
            "year": year,
            "element": element_type,
            "exporters": exporters,
            "count": len(exporters)
        })
    except Exception as e:
        logger.error(f"Error fetching top exporters: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/global/country-commodities/<country>', methods=['GET'])
def get_country_commodities(country):
    """Get top commodities exported by a country"""
    if not global_market_processor:
        return jsonify({
            "status": "error",
            "message": "Global market data not available"
        }), 503
    
    try:
        year = request.args.get('year', type=int)
        limit = int(request.args.get('limit', 20))
        
        data = global_market_processor.get_country_commodity_exports(country, year)
        
        if data.empty:
            return jsonify({
                "status": "success",
                "country": country,
                "commodities": [],
                "message": "No data available"
            })
        
        data = data.head(limit)
        commodities = data.to_dict('records')
        
        return jsonify({
            "status": "success",
            "country": country,
            "year": year,
            "commodities": commodities,
            "count": len(commodities)
        })
    except Exception as e:
        logger.error(f"Error fetching country commodities: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/global/demand-forecast', methods=['GET'])
def get_demand_forecast():
    """Get export demand forecast"""
    if not global_market_processor:
        return jsonify({
            "status": "error",
            "message": "Global market data not available"
        }), 503
    
    try:
        commodity = request.args.get('commodity')
        country = request.args.get('country')
        
        if not commodity:
            return jsonify({
                "status": "error",
                "message": "Commodity parameter required"
            }), 400
        
        forecast = global_market_processor.get_demand_forecast(commodity, country)
        
        return jsonify({
            "status": "success",
            "commodity": commodity,
            "country": country or "Global",
            "forecast": forecast
        })
    except Exception as e:
        logger.error(f"Error generating forecast: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({"status": "error", "message": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"status": "error", "message": "Internal server error"}), 500

if __name__ == '__main__':
    # Verify models are loaded (they should be from _initialize_app(), but double check)
    if market_prices is None:
        logger.warning("Models not yet loaded, attempting to load now...")
        if not load_models():
            logger.error("Failed to load models. Exiting...")
            exit(1)
    
    logger.info("✓ Models verified loaded, starting Flask app...")
    app.run(debug=True, host='0.0.0.0', port=5000)

