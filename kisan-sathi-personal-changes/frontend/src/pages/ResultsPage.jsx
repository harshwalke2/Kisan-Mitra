import { Calendar, CheckCircle, Cloud, Droplets, FlaskConical, Leaf, Target, TrendingUp, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/ResultsPage.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

function ResultsPage() {
  const location = useLocation();
  const [results, setResults] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [fertilizerData, setFertilizerData] = useState(null);
  const [loadingFertilizer, setLoadingFertilizer] = useState(false);

  useEffect(() => {
    if (location.state?.results) {
      setResults(location.state.results);
      setSelectedCrop(location.state.results.primary_recommendation);
      fetchRiskData(location.state.results.primary_recommendation);
      fetchFertilizerRecommendation(location.state.results.primary_recommendation, location.state.results.input_conditions);
    }
  }, [location]);

  const fetchRiskData = async (crop) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/market-insights/${crop}`);
      const data = await response.json();
      if (data.status === 'success') {
        setRiskData(data);
      }
    } catch (error) {
      console.error('Error fetching risk data:', error);
    }
  };

  const fetchFertilizerRecommendation = async (crop, inputConditions) => {
    setLoadingFertilizer(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/recommend-fertilizer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crop: crop,
          nitrogen: inputConditions.nitrogen,
          phosphorus: inputConditions.phosphorus,
          potassium: inputConditions.potassium,
          temperature: inputConditions.temperature,
          humidity: inputConditions.humidity,
          ph: inputConditions.ph,
          rainfall: inputConditions.rainfall
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setFertilizerData(data);
      }
    } catch (error) {
      console.error('Error fetching fertilizer recommendation:', error);
    } finally {
      setLoadingFertilizer(false);
    }
  };

  const handleCropSelect = (crop) => {
    setSelectedCrop(crop);
    fetchRiskData(crop);
    fetchFertilizerRecommendation(crop, results.input_conditions);
  };

  if (!results) {
    return (
      <div className="results-page section">
        <div className="container">
          <div className="no-results">
            <p>No recommendations found. Please go back and fill the form.</p>
            <Link to="/recommend" className="btn btn-primary">Back to Form</Link>
          </div>
        </div>
      </div>
    );
  }

  const primaryCrop = results.top_recommendations[0];
  return (
    <div className="results-page section">
      <div className="container">
        {/* Success Header */}
        <div className="success-header fade-in">
          <div className="success-icon">
            <CheckCircle size={60} color="#2ecc71" />
          </div>
          <h2>Recommendations Generated!</h2>
          <p>Based on your soil and environmental conditions, here are the best crops to grow</p>
        </div>

        {/* Primary Recommendation Card */}
        <div className="primary-recommendation card fade-in">
          <div className="recommendation-badge">🏆 Top Recommendation</div>
          <div className="recommendation-grid">
            <div className="recommendation-content">
              <h3>{primaryCrop.crop.toUpperCase()}</h3>
              <div className="recommendation-stats">
                <div className="stat-item">
                  <span className="stat-label">Confidence</span>
                  <span className="stat-value confidence-high">{primaryCrop.confidence}%</span>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${primaryCrop.confidence}%` }}></div>
                  </div>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Estimated Yield</span>
                  <span className="stat-value">{primaryCrop.estimated_yield} kg/ha</span>
                </div>
              </div>
            </div>
            <div className="recommendation-action">
              <Link to="/recommend" className="btn btn-secondary">New Analysis</Link>
            </div>
          </div>
        </div>

        {/* Fertilizer Recommendation Section */}
        {fertilizerData && (
          <div className="fertilizer-section card fade-in">
            <div className="section-header">
              <FlaskConical size={28} color="#27ae60" />
              <h2>🌿 Fertilizer Advisory for {selectedCrop}</h2>
            </div>
            
            {/* Soil Nutrient Status */}
            <div className="soil-status-grid">
              <div className="nutrient-status">
                <span className="nutrient-label">Nitrogen (N)</span>
                <div className="nutrient-bar-container">
                  <div 
                    className={`nutrient-bar nutrient-${fertilizerData.soil_analysis.nitrogen_status.toLowerCase()}`}
                    style={{ width: `${Math.min((fertilizerData.soil_analysis.nitrogen / 120) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className={`status-badge status-${fertilizerData.soil_analysis.nitrogen_status.toLowerCase()}`}>
                  {fertilizerData.soil_analysis.nitrogen} - {fertilizerData.soil_analysis.nitrogen_status}
                </span>
              </div>
              
              <div className="nutrient-status">
                <span className="nutrient-label">Phosphorus (P)</span>
                <div className="nutrient-bar-container">
                  <div 
                    className={`nutrient-bar nutrient-${fertilizerData.soil_analysis.phosphorus_status.toLowerCase()}`}
                    style={{ width: `${Math.min((fertilizerData.soil_analysis.phosphorus / 90) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className={`status-badge status-${fertilizerData.soil_analysis.phosphorus_status.toLowerCase()}`}>
                  {fertilizerData.soil_analysis.phosphorus} - {fertilizerData.soil_analysis.phosphorus_status}
                </span>
              </div>
              
              <div className="nutrient-status">
                <span className="nutrient-label">Potassium (K)</span>
                <div className="nutrient-bar-container">
                  <div 
                    className={`nutrient-bar nutrient-${fertilizerData.soil_analysis.potassium_status.toLowerCase()}`}
                    style={{ width: `${Math.min((fertilizerData.soil_analysis.potassium / 120) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className={`status-badge status-${fertilizerData.soil_analysis.potassium_status.toLowerCase()}`}>
                  {fertilizerData.soil_analysis.potassium} - {fertilizerData.soil_analysis.potassium_status}
                </span>
              </div>
              
              <div className="nutrient-status">
                <span className="nutrient-label">Soil pH</span>
                <div className="nutrient-bar-container">
                  <div 
                    className="nutrient-bar nutrient-ph"
                    style={{ width: `${(fertilizerData.soil_analysis.ph / 14) * 100}%` }}
                  ></div>
                </div>
                <span className="status-badge status-neutral">
                  {fertilizerData.soil_analysis.ph} - {fertilizerData.soil_analysis.ph < 6.5 ? 'Acidic' : fertilizerData.soil_analysis.ph > 7.5 ? 'Alkaline' : 'Neutral'}
                </span>
              </div>
            </div>

            {/* Primary Fertilizer Recommendation */}
            <div className="primary-fertilizer">
              <div className="primary-fertilizer-badge">⭐ Recommended Fertilizer</div>
              <h3>{fertilizerData.primary_fertilizer}</h3>
              <div className="confidence-score">
                <span>Confidence: {fertilizerData.recommendations[0].confidence}%</span>
                <div className="confidence-bar">
                  <div 
                    className="confidence-fill" 
                    style={{ width: `${fertilizerData.recommendations[0].confidence}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Detailed Fertilizer Recommendations */}
            <div className="fertilizer-recommendations-grid">
              {fertilizerData.recommendations.map((rec, idx) => (
                <div key={idx} className="fertilizer-card">
                  <div className="fertilizer-header">
                    <h4>{rec.fertilizer}</h4>
                    <span className="fertilizer-confidence">{rec.confidence}%</span>
                  </div>
                  
                  <div className="fertilizer-details">
                    <div className="fertilizer-detail-item">
                      <Target size={18} />
                      <div>
                        <span className="detail-label">Dosage</span>
                        <span className="detail-value">{rec.dosage}</span>
                      </div>
                    </div>
                    
                    <div className="fertilizer-detail-item">
                      <Calendar size={18} />
                      <div>
                        <span className="detail-label">Best Timing</span>
                        <span className="detail-value">{rec.timing}</span>
                      </div>
                    </div>
                    
                    <div className="fertilizer-detail-item">
                      <Leaf size={18} />
                      <div>
                        <span className="detail-label">Application Method</span>
                        <span className="detail-value">{rec.application_method}</span>
                      </div>
                    </div>
                    
                    <div className="fertilizer-benefits">
                      <strong>Benefits:</strong>
                      <p>{rec.benefits}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Fertilizer Application Tips */}
            <div className="fertilizer-tips">
              <h4>💡 Application Tips</h4>
              <ul>
                <li>Always conduct soil testing before applying fertilizers</li>
                <li>Apply fertilizers in split doses for better nutrient uptake</li>
                <li>Avoid over-fertilization as it can harm crops and environment</li>
                <li>Apply fertilizers when soil has adequate moisture</li>
                <li>Keep fertilizers away from direct contact with seeds</li>
                <li>Store fertilizers in a cool, dry place away from direct sunlight</li>
              </ul>
            </div>
          </div>
        )}

        {loadingFertilizer && (
          <div className="loading-fertilizer card">
            <div className="loading-spinner"></div>
            <p>Loading fertilizer recommendations...</p>
          </div>
        )}

        <div className="results-grid">
          {/* Alternative Recommendations */}
          <div className="alt-recommendations">
            <h3>Alternative Options</h3>
            <div className="recommendations-list">
              {results.top_recommendations.slice(1).map((rec, idx) => (
                <div 
                  key={idx}
                  className={`recommendation-item ${selectedCrop === rec.crop ? 'active' : ''}`}
                  onClick={() => handleCropSelect(rec.crop)}
                >
                  <div className="item-header">
                    <h4>{rec.crop}</h4>
                    <span className="confidence-badge">{rec.confidence}%</span>
                  </div>
                  <div className="item-details">
                    <span className="yield-info">Est. Yield: {rec.estimated_yield} kg/ha</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Input Conditions Summary */}
          <div className="input-summary card">
            <h3>Your Conditions</h3>
            <div className="conditions-grid">
              <div className="condition-item">
                <span className="condition-icon">N</span>
                <span className="condition-label">Nitrogen</span>
                <span className="condition-value">{results.input_conditions.nitrogen}</span>
              </div>
              <div className="condition-item">
                <span className="condition-icon">P</span>
                <span className="condition-label">Phosphorus</span>
                <span className="condition-value">{results.input_conditions.phosphorus}</span>
              </div>
              <div className="condition-item">
                <span className="condition-icon">K</span>
                <span className="condition-label">Potassium</span>
                <span className="condition-value">{results.input_conditions.potassium}</span>
              </div>
              <div className="condition-item">
                <Cloud size={20} />
                <span className="condition-label">Temp</span>
                <span className="condition-value">{results.input_conditions.temperature}°C</span>
              </div>
              <div className="condition-item">
                <Droplets size={20} />
                <span className="condition-label">Humidity</span>
                <span className="condition-value">{results.input_conditions.humidity}%</span>
              </div>
              <div className="condition-item">
                <span className="condition-icon">pH</span>
                <span className="condition-label">Soil pH</span>
                <span className="condition-value">{results.input_conditions.ph}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Assessment & Market Insights */}
        {riskData && (
          <div className="insights-section">
            <h2>Risk & Market Analysis for {selectedCrop}</h2>
            
            <div className="insights-grid">
              {/* Risk Assessment */}
              <div className="card insight-card">
                <h3>⚠️ Risk Assessment</h3>
                <div className="risk-items">
                  <div className="risk-item">
                    <span className="risk-label">Weather Risk</span>
                    <span className={`risk-badge risk-${riskData.risk_assessment.weather_risk.toLowerCase()}`}>
                      {riskData.risk_assessment.weather_risk}
                    </span>
                  </div>
                  <div className="risk-item">
                    <span className="risk-label">Market Risk</span>
                    <span className={`risk-badge risk-${riskData.risk_assessment.market_risk.toLowerCase()}`}>
                      {riskData.risk_assessment.market_risk}
                    </span>
                  </div>
                  <div className="risk-item">
                    <span className="risk-label">Disease Risk</span>
                    <span className={`risk-badge risk-${riskData.risk_assessment.disease_risk.toLowerCase()}`}>
                      {riskData.risk_assessment.disease_risk}
                    </span>
                  </div>
                  <div className="risk-item overall">
                    <span className="risk-label">Overall Risk</span>
                    <span className={`risk-badge risk-${riskData.risk_assessment.overall_risk.toLowerCase()}`}>
                      {riskData.risk_assessment.overall_risk}
                    </span>
                  </div>
                </div>
              </div>

              {/* Optimal Conditions */}
              <div className="card insight-card">
                <h3>🌱 Optimal Conditions</h3>
                <div className="conditions-items">
                  <div className="condition-range">
                    <span className="range-label">Temperature</span>
                    <span className="range-value">{riskData.optimal_conditions.temperature_range}</span>
                  </div>
                  <div className="condition-range">
                    <span className="range-label">Humidity</span>
                    <span className="range-value">{riskData.optimal_conditions.humidity_range}</span>
                  </div>
                  <div className="condition-range">
                    <span className="range-label">Soil pH</span>
                    <span className="range-value">{riskData.optimal_conditions.ph_range}</span>
                  </div>
                  <div className="condition-range">
                    <span className="range-label">Rainfall</span>
                    <span className="range-value">{riskData.optimal_conditions.rainfall_range}</span>
                  </div>
                </div>
              </div>

              {/* Market Data */}
              <div className="card insight-card">
                <h3>📊 Market Insights</h3>
                <div className="market-items">
                  <div className="market-item">
                    <TrendingUp size={20} />
                    <div>
                      <span className="market-label">Demand Trend</span>
                      <span className="market-value">{riskData.market_data.demand_trend}</span>
                    </div>
                  </div>
                  <div className="market-item">
                    <Zap size={20} />
                    <div>
                      <span className="market-label">Price Stability</span>
                      <span className="market-value">{riskData.market_data.price_stability}</span>
                    </div>
                  </div>
                  {riskData.market_data.latest_price?.value && (
                    <div className="market-item">
                      <span className="market-icon">💰</span>
                      <div>
                        <span className="market-label">Latest Price</span>
                        <span className="market-value">
                          {riskData.market_data.latest_price.value} {riskData.market_data.latest_price.unit}
                        </span>
                      </div>
                    </div>
                  )}
                  {riskData.market_data.forecast_30d?.avg && (
                    <div className="market-item">
                      <span className="market-icon">🧠</span>
                      <div>
                        <span className="market-label">30-day Forecast</span>
                        <span className="market-value">
                          {riskData.market_data.forecast_30d.avg} {riskData.market_data.latest_price?.unit}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <p className="market-recommendation">
                  {riskData.market_data.recommendation}
                </p>
              </div>

              {/* Seasonal Info */}
              <div className="card insight-card">
                <h3>📅 Seasonal Information</h3>
                <div className="seasonal-items">
                  <div className="seasonal-item">
                    <span className="seasonal-label">Best Season</span>
                    <span className="seasonal-value">{riskData.seasonal_info.best_season}</span>
                  </div>
                  <div className="seasonal-item">
                    <span className="seasonal-label">Growing Period</span>
                    <span className="seasonal-value">{riskData.seasonal_info.growing_period}</span>
                  </div>
                  <div className="seasonal-item">
                    <span className="seasonal-label">Harvest Time</span>
                    <span className="seasonal-value">{riskData.seasonal_info.harvest_time}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          <Link to="/recommend" className="btn btn-primary">
            New Analysis
          </Link>
          <Link to="/market-insights" className="btn btn-secondary">
            Explore More Insights
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResultsPage;
