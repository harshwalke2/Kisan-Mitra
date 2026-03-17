import { AlertCircle, HelpCircle, MapPin, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import '../styles/RecommendationPage.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

// City to State mapping for India
const CITY_STATE_MAP = {
  'mumbai': 'maharashtra',
  'pune': 'maharashtra',
  'nagpur': 'maharashtra',
  'aurangabad': 'maharashtra',
  'delhi': 'delhi',
  'new delhi': 'delhi',
  'gurgaon': 'haryana',
  'noida': 'uttar pradesh',
  'bangalore': 'karnataka',
  'bengaluru': 'karnataka',
  'mysore': 'karnataka',
  'hyderabad': 'telangana',
  'secunderabad': 'telangana',
  'pune': 'maharashtra',
  'ahmedabad': 'gujarat',
  'surat': 'gujarat',
  'vadodara': 'gujarat',
  'jaipur': 'rajasthan',
  'udaipur': 'rajasthan',
  'bhopal': 'madhya pradesh',
  'kolkata': 'west bengal',
  'darjeeling': 'west bengal',
  'lucknow': 'uttar pradesh',
  'kanpur': 'uttar pradesh',
  'varanasi': 'uttar pradesh',
  'amritsar': 'punjab',
  'ludhiana': 'punjab',
  'chandigarh': 'haryana',
  'indore': 'madhya pradesh',
  'nagpur': 'maharashtra',
  'thiruvananthapuram': 'kerala',
  'kochi': 'kerala',
  'kozhikode': 'kerala',
  'thrissur': 'kerala',
  'madras': 'tamil nadu',
  'chennai': 'tamil nadu',
  'coimbatore': 'tamil nadu',
  'salem': 'tamil nadu',
  'madurai': 'tamil nadu',
  'vijayawada': 'andhra pradesh',
  'vishakapatnam': 'andhra pradesh',
  'tirupati': 'andhra pradesh',
  'guwahati': 'assam',
  'ranchi': 'jharkhand',
  'patna': 'bihar',
  'gaya': 'bihar',
  'meerut': 'uttar pradesh',
  'agra': 'uttar pradesh',
  'gwalior': 'madhya pradesh',
  'raipur': 'chhattisgarh',
  'bilaspur': 'chhattisgarh',
  'thiruvanantapuram': 'kerala',
  'kottayam': 'kerala',
  'malappuram': 'kerala'
};

function RecommendationPage() {
  // Input mode toggle
  const [inputMode, setInputMode] = useState('location');
  
  // Location data
  const [locations, setLocations] = useState({});
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [autoFilled, setAutoFilled] = useState(false);
  
  // Weather data
  const [geoLoading, setGeoLoading] = useState(false);
  
  // Testing centers
  const [testingCenters, setTestingCenters] = useState([]);
  const [showCenters, setShowCenters] = useState(false);
  
  const [formData, setFormData] = useState({
    nitrogen: '',
    phosphorus: '',
    potassium: '',
    temperature: '',
    humidity: '',
    ph: '',
    rainfall: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Load locations on mount
  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/locations`);
      const data = await response.json();
      if (data.status === 'success') {
        setLocations(data.locations);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleStateChange = async (e) => {
    const state = e.target.value;
    setSelectedState(state);
    setSelectedDistrict('');
    setAutoFilled(false);
    
    if (state && inputMode === 'location') {
      await fetchSoilData(state, '');
      await fetchWeatherData(state, '');
    }
  };

  const handleDistrictChange = async (e) => {
    const district = e.target.value;
    setSelectedDistrict(district);
    
    if (selectedState && district && inputMode === 'location') {
      await fetchSoilData(selectedState, district);
      await fetchWeatherData(selectedState, district);
    }
  };

  const fetchSoilData = async (state, district) => {
    try {
      setLoading(true);
      let url = `${API_BASE_URL}/api/soil-data?state=${encodeURIComponent(state)}`;
      if (district) {
        url += `&district=${encodeURIComponent(district)}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'success') {
        setFormData(prev => ({
          ...prev,
          nitrogen: data.soil_data.nitrogen,
          phosphorus: data.soil_data.phosphorus,
          potassium: data.soil_data.potassium,
          ph: data.soil_data.ph
        }));
        setAutoFilled(true);
      }
    } catch (error) {
      console.error('Error fetching soil data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherData = async (state, district) => {
    try {
      setGeoLoading(true);
      
      const weatherUrl = `${API_BASE_URL}/api/weather-data?state=${encodeURIComponent(state)}${district ? `&district=${encodeURIComponent(district)}` : ''}`;
      const weatherResponse = await fetch(weatherUrl);
      const weatherData = await weatherResponse.json();

      let weather = null;
      if (weatherData.status === 'success') {
        weather = weatherData.weather_data;
      } else {
        const realtimeResponse = await fetch(`${API_BASE_URL}/api/weather?city=${encodeURIComponent(state)}`);
        const realtimeData = await realtimeResponse.json();
        if (realtimeData.status === 'success') {
          weather = realtimeData.weather_data;
        }
      }

      if (weather) {
        setFormData(prev => ({
          ...prev,
          temperature: weather.temperature,
          humidity: weather.humidity,
          rainfall: weather.rainfall
        }));
        setAutoFilled(true);
        setErrors(prev => ({...prev, location: ''}));
      } else {
        setErrors(prev => ({...prev, location: 'Weather data unavailable. Please enter manually.'}));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setErrors(prev => ({...prev, location: 'Error loading weather data'}));
    } finally {
      setGeoLoading(false);
    }
  };

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setErrors(prev => ({...prev, location: 'Geolocation is not supported by your browser'}));
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Use reverse geocoding to find city
          const geoResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const geoData = await geoResponse.json();
          
          // Extract city/state from reverse geocoding
          const city = geoData.address?.city || 
                       geoData.address?.town || 
                       geoData.address?.village ||
                       geoData.address?.county ||
                       '';
          
          const stateName = geoData.address?.state || '';
          
          // Try to find state from city
          let detectedState = CITY_STATE_MAP[city.toLowerCase()] || stateName.toLowerCase();
          
          // Normalize state name
          const normalizedState = Object.keys(locations).find(
            s => s.toLowerCase() === detectedState.toLowerCase()
          );
          
          if (!normalizedState) {
            setErrors(prev => ({...prev, location: 'Could not detect your state. Please select manually.'}));
            setGeoLoading(false);
            return;
          }
          
          // Use backend endpoint to intelligently find best matching district
          let detectedDistrict = '';
          try {
            const districtResponse = await fetch(
              `${API_BASE_URL}/api/geo-district?lat=${latitude}&lon=${longitude}&state=${encodeURIComponent(normalizedState)}`
            );
            const districtData = await districtResponse.json();
            
            if (districtData.status === 'success' && districtData.district) {
              detectedDistrict = districtData.district;
              console.log(`✓ Auto-detected district: ${districtData.district} (confidence: ${districtData.confidence}%)`);
            }
          } catch (error) {
            console.warn('Could not fetch district from coordinates:', error);
          }
          
          // Auto-select state and district
          setSelectedState(normalizedState);
          setSelectedDistrict(detectedDistrict);
          
          // Fetch weather and soil data
          await fetchWeatherData(normalizedState, detectedDistrict);
        } catch (error) {
          console.error('Error processing geolocation:', error);
          setErrors(prev => ({...prev, location: 'Error processing location. Please select manually.'}));
          setGeoLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrors(prev => ({...prev, location: 'Location permission denied. Please select state manually.'}));
            break;
          case error.POSITION_UNAVAILABLE:
            setErrors(prev => ({...prev, location: 'Location unavailable. Please select state manually.'}));
            break;
          default:
            setErrors(prev => ({...prev, location: 'Error getting location. Please select state manually.'}));
        }
        setGeoLoading(false);
      }
    );
  };

  const fetchTestingCenters = async () => {
    if (!selectedState) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/testing-centers?state=${encodeURIComponent(selectedState)}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setTestingCenters(data.centers);
        setShowCenters(true);
      }
    } catch (error) {
      console.error('Error fetching testing centers:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const { nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall } = formData;

    if (!nitrogen || nitrogen < 0 || nitrogen > 140) newErrors.nitrogen = 'Enter N value (0-140)';
    if (!phosphorus || phosphorus < 0 || phosphorus > 145) newErrors.phosphorus = 'Enter P value (0-145)';
    if (!potassium || potassium < 0 || potassium > 205) newErrors.potassium = 'Enter K value (0-205)';
    if (!temperature || temperature < 5 || temperature > 50) newErrors.temperature = 'Enter temperature (5-50°C)';
    if (!humidity || humidity < 0 || humidity > 100) newErrors.humidity = 'Enter humidity (0-100%)';
    if (!ph || ph < 3 || ph > 10) newErrors.ph = 'Enter pH (3-10)';
    if (!rainfall || rainfall < 0 || rainfall > 300) newErrors.rainfall = 'Enter rainfall (0-300cm)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/recommend-crop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nitrogen: parseFloat(formData.nitrogen),
          phosphorus: parseFloat(formData.phosphorus),
          potassium: parseFloat(formData.potassium),
          temperature: parseFloat(formData.temperature),
          humidity: parseFloat(formData.humidity),
          ph: parseFloat(formData.ph),
          rainfall: parseFloat(formData.rainfall)
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        setResults(data);
        setShowResults(true);
      } else {
        setErrors({ submit: data.message || 'Error getting recommendations' });
      }
    } catch (error) {
      setErrors({ submit: 'Failed to connect to server. Make sure Flask backend is running.' });
    } finally {
      setLoading(false);
    }
  };

  if (showResults && results) {
    return <Navigate to="/results" state={{ results }} />;
  }

  return (
    <div className="recommendation-page section">
      <div className="container">
        <div className="form-wrapper">
          <div className="form-header">
            <h2>Get Crop Recommendations</h2>
            <p>
              Enter your soil and environmental conditions to receive AI-powered 
              crop recommendations tailored to your farm
            </p>
          </div>

          {errors.submit && (
            <div className="error-message">
              <AlertCircle size={20} />
              {errors.submit}
            </div>
          )}

          {/* Mode Toggle */}
          <div className="mode-toggle">
            <button
              type="button"
              className={`mode-btn ${inputMode === 'location' ? 'active' : ''}`}
              onClick={() => setInputMode('location')}
            >
              <MapPin size={18} /> Use My Location
            </button>
            <button
              type="button"
              className={`mode-btn ${inputMode === 'manual' ? 'active' : ''}`}
              onClick={() => setInputMode('manual')}
            >
              ✏️ Enter Soil Test Data
            </button>
          </div>

          <form onSubmit={handleSubmit} className="recommendation-form">
            
            {/* Streamlined Location Section - One click auto-fills everything */}
            {inputMode === 'location' && (
              <div className="form-section location-section">
                <h3>📍 Your Location</h3>
                <p className="section-description">Grant location access for instant auto-fill, or manually select your state</p>
                
                {/* Geolocation Button */}
                <div className="form-group">
                  <button
                    type="button"
                    onClick={requestGeolocation}
                    className="geolocation-btn"
                    disabled={geoLoading}
                  >
                    {geoLoading ? (
                      <>
                        <span className="spinner-mini"></span> Detecting Location...
                      </>
                    ) : (
                      <>
                        📍 Use Current Location
                      </>
                    )}
                  </button>
                  {errors.location && <span className="error-text">{errors.location}</span>}
                  {autoFilled && (
                    <div className="inline-success">✅ All data auto-filled from your location!</div>
                  )}
                </div>

                {/* State & District Selection */}
                <div className="divider">
                  <span>OR</span>
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label htmlFor="state" className="form-label">State *</label>
                    <select
                      id="state"
                      value={selectedState}
                      onChange={handleStateChange}
                      className="form-input"
                      disabled={loadingLocations}
                    >
                      <option value="">Select State</option>
                      {Object.keys(locations).sort().map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="district" className="form-label">District</label>
                    <select
                      id="district"
                      value={selectedDistrict}
                      onChange={handleDistrictChange}
                      className="form-input"
                      disabled={!selectedState}
                    >
                      <option value="">Select District</option>
                      {selectedState && locations[selectedState]?.map(district => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Soil Testing Centers */}
                <button
                  type="button"
                  onClick={fetchTestingCenters}
                  className="testing-btn"
                  disabled={!selectedState}
                >
                  🔬 Find Nearby Soil Testing Centers
                </button>

                {showCenters && testingCenters.length > 0 && (
                  <div className="centers-box">
                    <h4>Nearby Soil Testing Centers:</h4>
                    {testingCenters.map((center, idx) => (
                      <div key={idx} className="center-item">
                        <strong>{center.name}</strong><br />
                        📍 {center.location} | 📞 {center.phone}
                      </div>
                    ))}
                    <p className="helpline">
                      Kisan Call Centre: <strong>1800-180-1551</strong> (Toll Free)
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Soil Nutrients Section */}
            {inputMode === 'manual' && (
              <div className="form-section manual-entry-section">
                <h3>✏️ Manual Entry - Soil Test Data</h3>
                <p className="section-description">Enter your soil test values from your agricultural lab report</p>
              </div>
            )}

            <div className="form-section">
              <h3>🌱 Soil Nutrients (NPK) {autoFilled && <span className="badge">Auto-filled</span>}</h3>
              <div className="grid grid-2">
                <div className="form-group">
                  <label htmlFor="nitrogen" className="form-label">
                    Nitrogen (N) <span className="unit">mg/kg</span>
                    <span className="tooltip">
                      <HelpCircle size={14} />
                      <span className="tooltip-text">For leaf growth. Range: 0-140</span>
                    </span>
                  </label>
                  <input
                    type="number"
                    id="nitrogen"
                    name="nitrogen"
                    value={formData.nitrogen}
                    onChange={handleInputChange}
                    className={`form-input ${errors.nitrogen ? 'input-error' : ''}`}
                    placeholder="0-140"
                    step="0.1"
                    readOnly={inputMode === 'location' && !autoFilled}
                  />
                  {errors.nitrogen && <span className="error-text">{errors.nitrogen}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="phosphorus" className="form-label">
                    Phosphorus (P) <span className="unit">mg/kg</span>
                    <span className="tooltip">
                      <HelpCircle size={14} />
                      <span className="tooltip-text">For root development. Range: 0-145</span>
                    </span>
                  </label>
                  <input
                    type="number"
                    id="phosphorus"
                    name="phosphorus"
                    value={formData.phosphorus}
                    onChange={handleInputChange}
                    className={`form-input ${errors.phosphorus ? 'input-error' : ''}`}
                    placeholder="0-145"
                    step="0.1"
                    readOnly={inputMode === 'location' && !autoFilled}
                  />
                  {errors.phosphorus && <span className="error-text">{errors.phosphorus}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="potassium" className="form-label">
                    Potassium (K) <span className="unit">mg/kg</span>
                    <span className="tooltip">
                      <HelpCircle size={14} />
                      <span className="tooltip-text">For disease resistance. Range: 0-205</span>
                    </span>
                  </label>
                  <input
                    type="number"
                    id="potassium"
                    name="potassium"
                    value={formData.potassium}
                    onChange={handleInputChange}
                    className={`form-input ${errors.potassium ? 'input-error' : ''}`}
                    placeholder="0-205"
                    step="0.1"
                    readOnly={inputMode === 'location' && !autoFilled}
                  />
                  {errors.potassium && <span className="error-text">{errors.potassium}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="ph" className="form-label">
                    Soil pH <span className="unit">3-10</span>
                    <span className="tooltip">
                      <HelpCircle size={14} />
                      <span className="tooltip-text">Soil acidity. Range: 3-10</span>
                    </span>
                  </label>
                  <input
                    type="number"
                    id="ph"
                    name="ph"
                    value={formData.ph}
                    onChange={handleInputChange}
                    className={`form-input ${errors.ph ? 'input-error' : ''}`}
                    placeholder="3-10"
                    step="0.1"
                    readOnly={inputMode === 'location' && !autoFilled}
                  />
                  {errors.ph && <span className="error-text">{errors.ph}</span>}
                </div>
              </div>
            </div>

            {/* Environmental Conditions */}
            <div className="form-section">
              <h3>🌤️ Environmental Conditions</h3>
              <div className="grid grid-2">
                <div className="form-group">
                  <label htmlFor="temperature" className="form-label">
                    Temperature <span className="unit">°C</span>
                  </label>
                  <input
                    type="number"
                    id="temperature"
                    name="temperature"
                    value={formData.temperature}
                    onChange={handleInputChange}
                    placeholder="5-50"
                    className={`form-input ${errors.temperature ? 'input-error' : ''}`}
                    step="0.1"
                  />
                  {errors.temperature && <span className="error-text">{errors.temperature}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="humidity" className="form-label">
                    Humidity <span className="unit">%</span>
                  </label>
                  <input
                    type="number"
                    id="humidity"
                    name="humidity"
                    value={formData.humidity}
                    onChange={handleInputChange}
                    placeholder="0-100"
                    className={`form-input ${errors.humidity ? 'input-error' : ''}`}
                    step="0.1"
                    max="100"
                  />
                  {errors.humidity && <span className="error-text">{errors.humidity}</span>}
                </div>

                <div className="form-group full-width">
                  <label htmlFor="rainfall" className="form-label">
                    Rainfall <span className="unit">cm</span>
                  </label>
                  <input
                    type="number"
                    id="rainfall"
                    name="rainfall"
                    value={formData.rainfall}
                    onChange={handleInputChange}
                    placeholder="0-300"
                    className={`form-input ${errors.rainfall ? 'input-error' : ''}`}
                    step="0.1"
                  />
                  {errors.rainfall && <span className="error-text">{errors.rainfall}</span>}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary btn-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-small"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Get Recommendations
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Tips Section */}
          <div className="tips-section">
            <h3>💡 Tips for Better Recommendations</h3>
            <ul>
              <li><strong>Soil Test:</strong> Get your soil tested from a local agricultural lab for accurate NPK values</li>
              <li><strong>Weather Data:</strong> Use average temperature and humidity for your region</li>
              <li><strong>Rainfall:</strong> Consider annual rainfall in your area</li>
              <li><strong>Precision:</strong> More accurate inputs lead to better recommendations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecommendationPage;
