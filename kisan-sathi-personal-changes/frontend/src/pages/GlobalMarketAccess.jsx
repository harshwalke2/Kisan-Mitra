import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Globe, Zap, BarChart3, Info } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import '../styles/GlobalMarketAccess.css';

const API_BASE = 'http://localhost:5000/api';

function GlobalMarketAccess() {
  const [globalCountries, setGlobalCountries] = useState([]);
  const [globalCommodities, setGlobalCommodities] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedCommodity, setSelectedCommodity] = useState(null);
  const [countryExports, setCountryExports] = useState([]);
  const [exportDemand, setExportDemand] = useState([]);
  const [commodityTrend, setCommodityTrend] = useState([]);
  const [topExporters, setTopExporters] = useState([]);
  const [countryExportCommodities, setCountryExportCommodities] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [countryFilter, setCountryFilter] = useState("");
  const [commodityFilter, setCommodityFilter] = useState("");
  const [dataSource, setDataSource] = useState('global'); // 'global' or 'country'

  // Load countries and commodities on mount
  useEffect(() => {
    fetchCountriesAndCommodities();
  }, []);

  const fetchCountriesAndCommodities = async () => {
    try {
      const [countriesRes, commoditiesRes] = await Promise.all([
        fetch(`${API_BASE}/global/countries`),
        fetch(`${API_BASE}/global/commodities`)
      ]);

      const countriesData = await countriesRes.json();
      const commoditiesData = await commoditiesRes.json();

      if (countriesData.status === 'success') {
        setGlobalCountries(countriesData.countries);
        setSelectedCountry(countriesData.countries[0] || null);
      }

      if (commoditiesData.status === 'success') {
        setGlobalCommodities(commoditiesData.commodities);
        setSelectedCommodity(commoditiesData.commodities[0] || null);
      }
    } catch (error) {
      console.error('Error fetching countries/commodities:', error);
    }
  };

  // Fetch global export demand
  const fetchGlobalDemand = async (commodity) => {
    if (!commodity) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/global/export-demand?commodity=${encodeURIComponent(commodity)}`);
      const data = await res.json();
      if (data.status === 'success') {
        setExportDemand(data.demand || []);
      }
    } catch (error) {
      console.error('Error fetching global demand:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch commodity trend across countries
  const fetchCommodityTrend = async (commodity) => {
    if (!commodity) return;
    try {
      const res = await fetch(`${API_BASE}/global/commodity-trend/${encodeURIComponent(commodity)}`);
      const data = await res.json();
      if (data.status === 'success') {
        setCommodityTrend(data.trend || []);
      }
    } catch (error) {
      console.error('Error fetching commodity trend:', error);
    }
  };

  // Fetch top exporters
  const fetchTopExporters = async (commodity) => {
    if (!commodity) return;
    try {
      const res = await fetch(`${API_BASE}/global/top-exporters?commodity=${encodeURIComponent(commodity)}&year=2024&limit=8`);
      const data = await res.json();
      if (data.status === 'success') {
        setTopExporters(data.exporters || []);
      }
    } catch (error) {
      console.error('Error fetching top exporters:', error);
    }
  };

  // Fetch country exports
  const fetchCountryExports = async (country) => {
    if (!country) return;
    try {
      const res = await fetch(`${API_BASE}/global/export-by-country/${encodeURIComponent(country)}`);
      const data = await res.json();
      if (data.status === 'success') {
        setCountryExports(data.exports || []);
      }
    } catch (error) {
      console.error('Error fetching country exports:', error);
    }
  };

  // Fetch country's commodities
  const fetchCountryExportCommodities = async (country) => {
    if (!country) return;
    try {
      const res = await fetch(`${API_BASE}/global/country-commodities/${encodeURIComponent(country)}?year=2024&limit=15`);
      const data = await res.json();
      if (data.status === 'success') {
        setCountryExportCommodities(data.commodities || []);
      }
    } catch (error) {
      console.error('Error fetching country commodities:', error);
    }
  };

  // Fetch forecast
  const fetchForecast = async (commodity, country = null) => {
    if (!commodity) return;
    try {
      const url = country
        ? `${API_BASE}/global/demand-forecast?commodity=${encodeURIComponent(commodity)}&country=${encodeURIComponent(country)}`
        : `${API_BASE}/global/demand-forecast?commodity=${encodeURIComponent(commodity)}`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'success') {
        setForecast(data.forecast);
      }
    } catch (error) {
      console.error('Error fetching forecast:', error);
    }
  };

  // Handle commodity selection
  const handleCommoditySelect = (commodity) => {
    setSelectedCommodity(commodity);
    setDataSource('global');
    fetchGlobalDemand(commodity);
    fetchCommodityTrend(commodity);
    fetchTopExporters(commodity);
    fetchForecast(commodity);
  };

  // Handle country selection
  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setDataSource('country');
    fetchCountryExports(country);
    fetchCountryExportCommodities(country);
  };

  const filteredCountries = useMemo(() => {
    const q = countryFilter.trim().toLowerCase();
    if (!q) return globalCountries;
    return globalCountries.filter((c) => c.toLowerCase().includes(q));
  }, [globalCountries, countryFilter]);

  const filteredCommodities = useMemo(() => {
    const q = commodityFilter.trim().toLowerCase();
    if (!q) return globalCommodities;
    return globalCommodities.filter((c) => c.toLowerCase().includes(q));
  }, [globalCommodities, commodityFilter]);

  // Chart data for top exporters
  const topExportersChart = useMemo(() => {
    return topExporters.map((exp) => ({
      name: exp.Country.slice(0, 12),
      value: exp.Value,
      fullName: exp.Country,
    }));
  }, [topExporters]);

  // Calculate trend indicator
  const demandTrend = useMemo(() => {
    if (exportDemand.length < 2) return null;
    const first = exportDemand[exportDemand.length - 1]?.Value || 0;
    const last = exportDemand[0]?.Value || 0;
    if (first > 0) {
      return ((last - first) / first) * 100;
    }
    return null;
  }, [exportDemand]);

  return (
    <div className="global-market-page section">
      <div className="container">
        <div className="page-header global-hero">
          <div className="hero-badge-row">
            <div className="hero-badge">
              <span className="live-badge">
                <span className="pulse" /> Global Trade Data · {globalCountries.length} countries
              </span>
            </div>
          </div>
          <h1>🌍 Global Market Access</h1>
          <p className="hero-sub">
            Explore worldwide export demand, find top markets for your crops, and understand global trade opportunities — help farmers reach international buyers.
          </p>
        </div>

        <div className="global-main-grid">
          {/* Left Panel - Selection */}
          <div className="global-selection-panel">
            <div className="selection-tabs">
              <button
                className={`tab-btn ${dataSource === 'global' ? 'active' : ''}`}
                onClick={() => setDataSource('global')}
              >
                <Globe size={18} /> Global Demand
              </button>
              <button
                className={`tab-btn ${dataSource === 'country' ? 'active' : ''}`}
                onClick={() => setDataSource('country')}
              >
                <Zap size={18} /> By Country
              </button>
            </div>

            {dataSource === 'global' ? (
              <div className="selection-card">
                <h3>📦 Select Commodity</h3>
                <input
                  type="text"
                  className="commodity-search"
                  placeholder="Search commodity…"
                  value={commodityFilter}
                  onChange={(e) => setCommodityFilter(e.target.value)}
                />
                <div className="commodities-list">
                  {filteredCommodities.length > 0 ? (
                    filteredCommodities.map((commodity, idx) => (
                      <button
                        key={idx}
                        className={`commodity-item ${selectedCommodity === commodity ? 'active' : ''}`}
                        onClick={() => handleCommoditySelect(commodity)}
                      >
                        <span>{commodity}</span>
                        <span className="arrow">→</span>
                      </button>
                    ))
                  ) : (
                    <p className="no-data">No matches found</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="selection-card">
                <h3>🌐 Select Country</h3>
                <input
                  type="text"
                  className="commodity-search"
                  placeholder="Search country…"
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                />
                <div className="countries-list">
                  {filteredCountries.length > 0 ? (
                    filteredCountries.map((country, idx) => (
                      <button
                        key={idx}
                        className={`country-item ${selectedCountry === country ? 'active' : ''}`}
                        onClick={() => handleCountrySelect(country)}
                      >
                        <span>{country}</span>
                        <span className="arrow">→</span>
                      </button>
                    ))
                  ) : (
                    <p className="no-data">No matches found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Data Display */}
          <div className="global-content-panel">
            {dataSource === 'global' ? (
              <>
                {selectedCommodity && (
                  <div className="commodity-header">
                    <h2>📊 {selectedCommodity} — Global Market</h2>
                  </div>
                )}

                {/* Demand Forecast */}
                {selectedCommodity && forecast && (
                  <div className="forecast-card card">
                    <div className="forecast-content">
                      <div className="forecast-item">
                        <span className="forecast-label">Next Year Forecast</span>
                        <span className="forecast-value">
                          {forecast.forecast ? forecast.forecast.toLocaleString('en-IN', {maximumFractionDigits: 0}) : '—'} tonnes
                        </span>
                      </div>
                      <div className="forecast-item">
                        <span className="forecast-label">Trend</span>
                        <span className={`trend-badge trend-${forecast.trend}`}>
                          {forecast.trend === 'increasing' && <TrendingUp size={16} />}
                          {forecast.trend === 'decreasing' && <TrendingDown size={16} />}
                          {forecast.trend}
                        </span>
                      </div>
                      <div className="forecast-item">
                        <span className="forecast-label">Confidence</span>
                        <span className="confidence-badge">{forecast.confidence}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Export Demand Trend */}
                {exportDemand.length > 0 && (
                  <div className="chart-card card">
                    <h3>📈 Global Export Demand Trend</h3>
                    {demandTrend !== null && (
                      <p className="trend-indicator">
                        {demandTrend > 0 ? '↗️ Increasing' : demandTrend < 0 ? '↘️ Decreasing' : '→ Stable'}{' '}
                        ({demandTrend > 0 ? '+' : ''}{demandTrend.toFixed(1)}% year-over-year)
                      </p>
                    )}
                    <div className="chart-wrap">
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={exportDemand}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                          <XAxis dataKey="Year" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                          <Tooltip formatter={(value) => value.toLocaleString('en-IN', {maximumFractionDigits: 0})} />
                          <Line
                            type="monotone"
                            dataKey="Value"
                            stroke="#27ae60"
                            strokeWidth={2}
                            dot={{ fill: '#27ae60', r: 5 }}
                            activeDot={{ r: 7 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Top Exporters */}
                {topExportersChart.length > 0 && (
                  <div className="chart-card card">
                    <h3>🏆 Top Exporting Countries (2024)</h3>
                    <p className="chart-hint">The countries exporting the most of this commodity globally.</p>
                    <div className="chart-wrap">
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={topExportersChart} margin={{ top: 12, right: 24, left: 12, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                          <Tooltip
                            formatter={(value) => value.toLocaleString('en-IN', {maximumFractionDigits: 0})}
                            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                          />
                          <Bar dataKey="value" name="Export Volume" fill="#27ae60" radius={[8, 8, 0, 0]}>
                            {topExportersChart.map((entry, index) => (
                              <Cell
                                key={index}
                                fill={index === 0 ? '#1e8449' : index < 3 ? '#27ae60' : '#58d68d'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Commodity Trend by Country */}
                {commodityTrend.length > 0 && (
                  <div className="chart-card card">
                    <h3>🌎 Export Comparison by Country</h3>
                    <p className="chart-hint">Compare how much each country is exporting this commodity - longer bars mean higher exports.</p>
                    <div className="chart-wrap">
                      <ResponsiveContainer width="100%" height={380}>
                        <BarChart data={commodityTrend} margin={{ top: 12, right: 24, left: 12, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="year" angle={-30} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                          <Tooltip formatter={(value) => value.toLocaleString('en-IN', {maximumFractionDigits: 0})} />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          {commodityTrend[0] && Object.keys(commodityTrend[0]).filter(k => k !== 'year').map((country, idx) => (
                            <Bar
                              key={idx}
                              dataKey={country}
                              fill={['#27ae60', '#3498db', '#e74c3c', '#f39c12', '#9b59b6', '#16a085', '#2980b9', '#c0392b'][idx % 8]}
                              radius={[6, 6, 0, 0]}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {selectedCountry && (
                  <div className="country-header">
                    <h2>🏢 {selectedCountry} — Export Profile</h2>
                  </div>
                )}

                {/* Country's Top Commodities */}
                {countryExportCommodities.length > 0 && (
                  <div className="chart-card card">
                    <h3>📦 Top Export Commodities (2024)</h3>
                    <p className="chart-hint">The most exported products from this country.</p>
                    <div className="chart-wrap">
                      <ResponsiveContainer width="100%" height={380}>
                        <BarChart
                          data={countryExportCommodities.slice(0, 12)}
                          layout="vertical"
                          margin={{ top: 12, right: 24, left: 200, bottom: 12 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                          <YAxis type="category" dataKey="Commodity" width={190} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value) => value.toLocaleString('en-IN', {maximumFractionDigits: 0})} />
                          <Bar dataKey="Value" name="Export Value" fill="#3498db" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Country Export Summary */}
                {countryExports.length > 0 && (
                  <div className="export-summary card">
                    <h3>📊 Export Summary by Year</h3>
                    <div className="export-summary-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Commodity</th>
                            <th>Year</th>
                            <th>Quantity</th>
                            <th>Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {countryExports.slice(0, 10).map((exp, idx) => (
                            <tr key={idx}>
                              <td>{exp.Item}</td>
                              <td>{exp.Year}</td>
                              <td>{Number(exp.Value).toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
                              <td>{exp.Unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="tips-section card">
          <h3>💡 Tips for Farmers</h3>
          <ul className="tips-list">
            <li>Check global demand trends to understand market opportunities for your crops.</li>
            <li>Identify top exporting countries to see where your crop has strong international demand.</li>
            <li>Compare by country to find the best export destinations for different commodities.</li>
            <li>Use forecasts to plan production based on expected global demand.</li>
            <li>Consider both export quantity and value trends when selecting crops to grow.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default GlobalMarketAccess;
