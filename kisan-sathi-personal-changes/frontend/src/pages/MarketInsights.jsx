import { Calendar, Info, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import '../styles/MarketInsights.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
const API_BASE = `${API_BASE_URL}/api`;

function MarketInsights({ crops = [] }) {
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [chartData, setChartData] = useState({ time_series: [], by_mandi: [], latest_date: null });
  const [liveRecords, setLiveRecords] = useState([]);
  const [liveSource, setLiveSource] = useState(false);
  const [aajKaBhavState, setAajKaBhavState] = useState({ value: null, date: null, available: false, message: null });
  const [aajKaBhavLoading, setAajKaBhavLoading] = useState(false);
  const [cedaCommodities, setCedaCommodities] = useState([]);
  const [cedaLoading, setCedaLoading] = useState(false);
  const [commodityFilter, setCommodityFilter] = useState("");
  const [loadingCharts, setLoadingCharts] = useState(false);

  useEffect(() => {
    fetchCedaCommodities();
  }, []);

  const fetchCedaCommodities = async () => {
    setCedaLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ceda/commodities`);
      const data = await res.json().catch(() => ({}));
      if (data.status === "success" && data.commodities?.length) {
        // Sort commodities - priority crops (Wheat, Tomato, Onion, Potato) on top
        const priorityCrops = ['wheat', 'tomato', 'onion', 'potato'];
        const sortedCommodities = data.commodities.sort((a, b) => {
          const aName = (a?.name || a)?.toLowerCase();
          const bName = (b?.name || b)?.toLowerCase();
          const aPriority = priorityCrops.indexOf(aName);
          const bPriority = priorityCrops.indexOf(bName);
          
          // Both in priority list
          if (aPriority !== -1 && bPriority !== -1) {
            return aPriority - bPriority;
          }
          // Only a in priority list
          if (aPriority !== -1) return -1;
          // Only b in priority list
          if (bPriority !== -1) return 1;
          // Neither in priority list - keep original order
          return 0;
        });
        
        setCedaCommodities(sortedCommodities);
        const first = sortedCommodities[0];
        const firstName = first?.name || first;
        setSelectedCrop(firstName);
        await fetchMarketInsights(firstName);
        await fetchChartAndLiveData(firstName);
      } else if (data.status === "success" && Array.isArray(data.commodities)) {
        setCedaCommodities(data.commodities);
        setSelectedCrop(null);
        setMarketData(null);
        setChartData({ time_series: [], by_mandi: [], latest_date: null });
      } else {
        setCedaCommodities([]);
        setSelectedCrop(null);
        setMarketData(null);
        setChartData({ time_series: [], by_mandi: [], latest_date: null });
      }
    } catch (err) {
      console.error("Error fetching CEDA commodities:", err);
      setCedaCommodities([]);
    } finally {
      setCedaLoading(false);
    }
  };

  const fetchMarketInsights = async (crop) => {
    try {
      const response = await fetch(
    `${API_BASE}/market-insights/${encodeURIComponent(crop)}?season=`
      );
      const data = await response.json();
      if (data.status === 'success') {
        setMarketData(data);
      }
    } catch (error) {
      console.error('Error fetching market insights:', error);
    }
  };

  const fetchChartAndLiveData = async (crop) => {
    if (!crop) return;
    try {
      // Fetch only historical data for the chart (from local dataset)
      const historyRes = await fetch(`${API_BASE}/agmarket/history?commodity=${encodeURIComponent(crop)}&days=90`);
      const historyJson = await historyRes.json();

      // Use ONLY historical data for chart
      setChartData({
        time_series: historyJson.time_series || [],
        by_mandi: historyJson.by_mandi || [],
        latest_date: historyJson.latest_date || null,
      });

      // Fetch live data for Aaj Ka Bhav (API-only, no local fallback)
      try {
        setAajKaBhavLoading(true);
        const liveRes = await fetch(`${API_BASE}/agmarket/live?commodity=${encodeURIComponent(crop)}&source=api`);
        const liveJson = await liveRes.json();
        
        const liveApiRecords = Array.isArray(liveJson.records) ? liveJson.records : [];
        const isLive = liveJson.live === true;
        
        setLiveRecords(liveApiRecords);
        setLiveSource(isLive);

        // Aaj Ka Bhav: Only display if live API returned data
        if (isLive && liveApiRecords.length) {
          const dates = [...new Set(liveApiRecords.map((r) => r.date).filter(Boolean))].sort();
          const latestDate = dates[dates.length - 1];
          const latestRecs = latestDate ? liveApiRecords.filter((r) => r.date === latestDate) : liveApiRecords;
          if (latestRecs.length) {
            const avgPrice = latestRecs.reduce((s, r) => s + (r.modal_price || 0), 0) / latestRecs.length;
            setAajKaBhavState({ 
              value: Math.round(avgPrice * 100) / 100, 
              date: latestDate || null, 
              available: true, 
              message: '✓ Live from API',
              isLive: true
            });
          } else {
            setAajKaBhavState({ value: null, date: null, available: false, message: liveJson.message || 'Live prices not available', isLive: false });
          }
        } else {
          // Live API unavailable or returned no data
          const message = liveJson.message || 'Live prices not available - API not configured';
          setAajKaBhavState({ 
            value: null, 
            date: null, 
            available: false, 
            message: message,
            isLive: false
          });
        }
      } catch (liveError) {
        console.error("Error fetching live data for Aaj Ka Bhav:", liveError);
        setAajKaBhavState({ 
          value: null, 
          date: null, 
          available: false, 
          message: 'Could not connect to live price API',
          isLive: false
        });
      } finally {
        setAajKaBhavLoading(false);
      }
    } catch (error) {
      console.error("Error fetching chart data:", error);
      setChartData({ time_series: [], by_mandi: [], latest_date: null });
      setLiveRecords([]);
      setLiveSource(false);
      setAajKaBhavState({ value: null, date: null, available: false, message: 'Error fetching data' });
    }
  };

  const handleCropSelect = (crop) => {
    if (crop === selectedCrop) return;
    setSelectedCrop(crop);
    setLoadingCharts(true);
    Promise.all([
      fetchMarketInsights(crop),
      fetchChartAndLiveData(crop),
    ]).finally(() => setLoadingCharts(false));
  };

  const mandiChartSource = useMemo(() => {
    if (liveSource && liveRecords.length) {
      return liveRecords
        .slice(0, 12)
        .map((r) => ({
          name: r.market || r.district || 'Mandi',
          price: r.modal_price,
          min: r.min_price,
          max: r.max_price,
          fullLabel: [r.market, r.district, r.state].filter(Boolean).join(', '),
        }))
        .sort((a, b) => b.price - a.price);
    }
    return (chartData.by_mandi || []).map((m) => ({
      name: m.market?.length > 12 ? m.market.slice(0, 11) + '…' : m.market,
      price: m.modal_price,
      min: m.min_price,
      max: m.max_price,
      fullLabel: [m.market, m.district, m.state].filter(Boolean).join(', '),
    }));
  }, [liveSource, liveRecords, chartData.by_mandi]);

  // Aaj Ka Bhav is provided from `aajKaBhavState` (set when live API responds)

  // Calculate price trend from local chart data
  const priceTrend = useMemo(() => {
    if (!chartData?.time_series || chartData.time_series.length < 2) return null;
    const firstPrice = chartData.time_series[0]?.modal_price;
    const lastPrice = chartData.time_series[chartData.time_series.length - 1]?.modal_price;
    if (firstPrice && lastPrice) {
      const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;
      return Math.round(percentChange * 100) / 100;
    }
    return null;
  }, [chartData.time_series]);

  const forecastAvg = marketData?.market_data?.forecast_30d?.avg;

  const filteredCropList = useMemo(() => {
    const q = commodityFilter.trim().toLowerCase();
    if (!q) return cedaCommodities;
    return cedaCommodities.filter((c) => (c?.name || "").toLowerCase().includes(q));
  }, [cedaCommodities, commodityFilter]);

  const cropDisplayName = (c) => (typeof c === "string" ? c : c?.name || "");

  return (
    <div className="market-insights-page section">
      <div className="container">
        <div className="page-header insights-hero">
          <div className="hero-badge-row">
            <div className="hero-badge">
              {cedaCommodities.length > 0 ? (
                <span className="live-badge">
                  <span className="pulse" /> Live data · {cedaCommodities.length}+ commodities
                </span>
              ) : cedaLoading ? (
                <span className="data-badge api-mode">Loading…</span>
              ) : (
                <span className="data-badge api-mode">Live from data.gov.in</span>
              )}
            </div>
          </div>
          <h1>Mandi Bhav & Market Insights</h1>
          <p className="hero-sub">
            See today's crop prices (₹/quintal), compare mandis, and plan when to sell — simple and clear for farmers.
          </p>
        </div>

        <div className="insights-main-grid">
          <div className="seasonal-crops card">
            <h3>Commodities</h3>
            {cedaCommodities.length > 0 && (
              <input
                type="text"
                className="commodity-search"
                placeholder="Search commodity…"
                value={commodityFilter}
                onChange={(e) => setCommodityFilter(e.target.value)}
              />
            )}
            {cedaLoading ? (
              <div className="loading-spinner">
                <div className="spinner" />
              </div>
            ) : (
              <div className="crops-list ceda-list">
                {filteredCropList.length > 0 ? (
                  filteredCropList.map((crop, idx) => {
                    const name = cropDisplayName(crop);
                    const cropKey = typeof crop === "string" ? crop : crop?.id ?? idx;
                    return (
                      <button
                        key={cropKey}
                        className={`crop-item ${selectedCrop === name ? "active" : ""}`}
                        onClick={() => handleCropSelect(name)}
                      >
                        <span className="crop-name">{name}</span>
                        <span className="crop-arrow">→</span>
                      </button>
                    );
                  })
                ) : (
                  <p className="no-data">
                    {commodityFilter ? "No match for your search" : "Could not load commodities"}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="market-details-wrapper">
            {selectedCrop && (
              <div className="selected-crop-title">
                <span className="crop-emoji">🌾</span> {selectedCrop}
              </div>
            )}

            {loadingCharts && (
              <div className="commodity-loading-overlay" aria-hidden="false">
                <div className="commodity-loading-spinner" />
                <p className="commodity-loading-text">Loading {selectedCrop}…</p>
              </div>
            )}

            <div className={`market-details-content ${loadingCharts ? 'content-dimmed' : ''}`}>
              {selectedCrop && (
                <div className="summary-cards aaj-ka-bhav-section">
                  <div className="summary-card price-card aaj-ka-bhav-card">
                    <span className="summary-label">
                      Aaj ka bhav (₹/quintal)
                      {aajKaBhavState?.isLive && (
                        <span className="live-dot" title="Live from API" />
                      )}
                    </span>
                    <span className="summary-value">
                      {aajKaBhavLoading
                        ? <span className="fetching-text">Fetching live prices...</span>
                        : aajKaBhavState?.available && aajKaBhavState?.value != null
                        ? `₹ ${Number(aajKaBhavState.value).toLocaleString("en-IN")}`
                        : aajKaBhavState?.message || "Live prices not available"}
                    </span>
                    {aajKaBhavState?.isLive && aajKaBhavState?.date && (
                      <span className="summary-meta">{aajKaBhavState.date}</span>
                    )}
                  </div>
                </div>
              )}

              {marketData?.has_market_data && marketData?.market_data && (
                <>
                  <div className="predicting-banner">
                    <span className="predicting-icon">📊</span>
                    <div>
                      <span className="predicting-title">We are predicting</span>
                      <span className="predicting-sub">Based on historical data and market trends</span>
                    </div>
                  </div>
                  <div className="summary-cards">
                    <div className="summary-card trend-card">
                      <span className="summary-label">Trend (last 90 days)</span>
                      <span className={`summary-value trend-${priceTrend > 0 ? 'up' : priceTrend < 0 ? 'down' : 'flat'}`}>
                        {priceTrend != null ? (
                          <>
                            {priceTrend > 0 ? <TrendingUp size={20} /> : priceTrend < 0 ? <TrendingDown size={20} /> : null}
                            {priceTrend > 0 ? '+' : ''}{priceTrend}%
                          </>
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>
                    {forecastAvg != null && (
                      <div className="summary-card forecast-card">
                        <span className="summary-label">30-day expected avg</span>
                        <span className="summary-value">₹ {Number(forecastAvg).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {chartData.time_series?.length > 0 && (
                <div className="chart-card card">
                  <h3>📈 Price trend (last 90 days) — ₹ per quintal</h3>
                  <p className="chart-hint">Use this to decide when to sell: sell when the line is higher.</p>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={chartData.time_series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#27ae60" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#27ae60" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v?.slice(5) || v} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip
                          formatter={(value) => [`₹ ${Number(value).toLocaleString('en-IN')}`, 'Modal price']}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="modal_price"
                          stroke="#27ae60"
                          strokeWidth={2}
                          fill="url(#priceGradient)"
                          name="Price"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {chartData.time_series?.length === 0 && selectedCrop && (
                <div className="chart-card card error-card">
                  <div className="error-message-container">
                    <span className="blinking-error">⚠️ Unable to fetch data</span>
                  </div>
                </div>
              )}

              {mandiChartSource.length > 0 && (
                <div className="chart-card card better-price-chart">
                  <h3 className="better-price-title">🏪 Global Market Access (Better price by mandi)</h3>
                  <p className="chart-hint better-price-hint">Jo bar lambi hai, us mandi ka rate zyada hai — wahi becho. (Longer bar = better price — sell there.)</p>
                  <div className="chart-wrap bar-chart-wrap better-price-chart-wrap">
                    <ResponsiveContainer width="100%" height={440}>
                      <BarChart
                        data={mandiChartSource}
                        layout="vertical"
                        margin={{ top: 12, right: 24, left: 140, bottom: 12 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis type="number" tick={{ fontSize: 14 }} tickFormatter={(v) => `₹ ${Number(v).toLocaleString('en-IN')}`} />
                        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 14 }} />
                        <Tooltip
                          formatter={(value) => [`₹ ${Number(value).toLocaleString('en-IN')} / quintal`, 'Rate']}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel || ''}
                          contentStyle={{ fontSize: '14px' }}
                        />
                        <Bar dataKey="price" name="Rate (₹/quintal)" radius={[0, 6, 6, 0]} fill="#27ae60" barSize={28}>
                          {mandiChartSource.map((entry, index) => (
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

              {marketData && (
                <div className="market-details">
                  <div className="card market-trends">
                    <h3>📊 Market summary</h3>
                    <div className="trend-items">
                      <div className="trend-item">
                        <span className="trend-icon">📈</span>
                        <div className="trend-content">
                          <span className="trend-label">Demand</span>
                          <span className="trend-value">{marketData.market_data?.demand_trend ?? '—'}</span>
                        </div>
                      </div>
                      <div className="trend-item">
                        <span className="trend-icon">💹</span>
                        <div className="trend-content">
                          <span className="trend-label">Price stability</span>
                          <span className="trend-value">{marketData.market_data?.price_stability ?? '—'}</span>
                        </div>
                      </div>
                      {marketData.market_data?.recommendation && (
                        <div className="trend-item recommendation-box">
                          <Info className="trend-icon" size={18} />
                          <div className="trend-content">
                            <span className="trend-label">In short</span>
                            <span className="trend-value">{marketData.market_data.recommendation}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {marketData?.risk_assessment ? (
                    <div className="card risk-opportunities">
                      <h3>⚠️ Risk</h3>
                      <div className="risk-grid">
                        <div className="risk-item">
                          <span className="risk-type">Weather</span>
                          <span className={`risk-pill risk-${(marketData.risk_assessment?.weather_risk || '').toLowerCase()}`}>
                            {marketData.risk_assessment?.weather_risk || '—'}
                          </span>
                        </div>
                        <div className="risk-item">
                          <span className="risk-type">Market</span>
                          <span className={`risk-pill risk-${(marketData.risk_assessment?.market_risk || '').toLowerCase()}`}>
                            {marketData.risk_assessment?.market_risk || '—'}
                          </span>
                        </div>
                        <div className="risk-item">
                          <span className="risk-type">Disease</span>
                          <span className={`risk-pill risk-${(marketData.risk_assessment?.disease_risk || '').toLowerCase()}`}>
                            {marketData.risk_assessment?.disease_risk || '—'}
                          </span>
                        </div>
                        <div className="risk-item highlight">
                          <span className="risk-type">Overall</span>
                          <span className={`risk-pill risk-${(marketData.risk_assessment?.overall_risk || '').toLowerCase()}`}>
                            {marketData.risk_assessment?.overall_risk || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : selectedCrop ? (
                    <div className="card card error-card">
                      <div className="error-message-container">
                        <span className="blinking-error">⚠️ Unable to fetch risk assessment data</span>
                      </div>
                    </div>
                  ) : null}

                  <div className="card optimal-conditions">
                    <h3>🌱 Good conditions for this crop</h3>
                    <div className="conditions-cards">
                      <div className="condition-box">
                        <span className="condition-name">Temperature</span>
                        <span className="condition-range">{marketData.optimal_conditions?.temperature_range || '—'}</span>
                      </div>
                      <div className="condition-box">
                        <span className="condition-name">Humidity</span>
                        <span className="condition-range">{marketData.optimal_conditions?.humidity_range || '—'}</span>
                      </div>
                      <div className="condition-box">
                        <span className="condition-name">Soil pH</span>
                        <span className="condition-range">{marketData.optimal_conditions?.ph_range || '—'}</span>
                      </div>
                      <div className="condition-box">
                        <span className="condition-name">Rainfall</span>
                        <span className="condition-range">{marketData.optimal_conditions?.rainfall_range || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card seasonal-timeline">
                    <h3>📅 Growing timeline</h3>
                    <div className="timeline-items">
                      <div className="timeline-item">
                        <Calendar className="timeline-icon" size={18} />
                        <div className="timeline-content">
                          <span className="timeline-label">Best season</span>
                          <span className="timeline-value">{marketData.seasonal_info?.best_season || '—'}</span>
                        </div>
                      </div>
                      <div className="timeline-item">
                        <span className="timeline-icon">⏱️</span>
                        <div className="timeline-content">
                          <span className="timeline-label">Growing period</span>
                          <span className="timeline-value">{marketData.seasonal_info?.growing_period || '—'}</span>
                        </div>
                      </div>
                      <div className="timeline-item">
                        <span className="timeline-icon">🌾</span>
                        <div className="timeline-content">
                          <span className="timeline-label">Harvest</span>
                          <span className="timeline-value">{marketData.seasonal_info?.harvest_time || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="tips-section card">
          <h3>💡 Tips for farmers</h3>
          <ul className="tips-list">
            <li>Check mandi prices regularly — sell when the trend is up.</li>
            <li>Compare nearby mandis and choose the one with better price (see chart above).</li>
            <li>Plan harvest and sale based on weather and market trend.</li>
            <li>Diversify crops to reduce risk.</li>
            <li>Follow government advisories for pests and MSP.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default MarketInsights;
