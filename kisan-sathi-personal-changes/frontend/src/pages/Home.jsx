import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, TrendingUp, AlertCircle, Globe, Zap, BarChart3 } from 'lucide-react';
import '../styles/Home.css';

function Home() {
  const features = [
    {
      icon: <Sprout size={40} />,
      title: "Smart Crop Selection",
      description: "Get AI-powered crop recommendations based on your soil conditions and climate"
    },
    {
      icon: <TrendingUp size={40} />,
      title: "Yield Prediction",
      description: "Estimate expected yields before planting to maximize profits"
    },
    {
      icon: <Globe size={40} />,
      title: "Market Insights",
      description: "Stay updated with local demand, pricing trends, and global demand patterns"
    },
    {
      icon: <AlertCircle size={40} />,
      title: "Risk Assessment",
      description: "Understand weather, market, and disease risks for each crop"
    },
    {
      icon: <Zap size={40} />,
      title: "Seasonal Guidance",
      description: "Get recommendations tailored to the current season in your region"
    },
    {
      icon: <BarChart3 size={40} />,
      title: "Data Analytics",
      description: "View detailed charts and insights about crop performance and trends"
    }
  ];

  return (
    <div className="home-page">
      {/* Features Section */}
      <section className="features-section section">
        <div className="container">
          <h2 className="text-center">Why Choose KISAN?</h2>
          <p className="section-subtitle text-center">
            Empowering Indian farmers with intelligent agricultural decision support
          </p>
          
          <div className="grid grid-3">
            {features.map((feature, index) => (
              <div key={index} className="card feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Optimize Your Farming?</h2>
            <p>
              Get personalized crop recommendations based on your soil conditions, 
              climate, and market demand. Start making data-driven decisions today!
            </p>
            <div className="cta-buttons">
              <Link to="/recommend" className="btn btn-primary btn-lg">
                Get Crop Recommendations
              </Link>
              <Link to="/market-insights" className="btn btn-secondary btn-lg">
                View Market Insights
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works section">
        <div className="container">
          <h2 className="text-center">How It Works</h2>
          
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Enter Your Conditions</h3>
              <p>Provide details about your soil (N, P, K), weather, and location</p>
            </div>
            
            <div className="step-arrow">→</div>
            
            <div className="step">
              <div className="step-number">2</div>
              <h3>AI Analysis</h3>
              <p>Our ML models analyze your conditions against millions of data points</p>
            </div>
            
            <div className="step-arrow">→</div>
            
            <div className="step">
              <div className="step-number">3</div>
              <h3>Get Recommendations</h3>
              <p>Receive personalized crop suggestions with yield predictions</p>
            </div>
            
            <div className="step-arrow">→</div>
            
            <div className="step">
              <div className="step-number">4</div>
              <h3>Maximize Profits</h3>
              <p>Plant wisely and access market information for better returns</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">22+</div>
              <div className="stat-label">Crops Supported</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">99%</div>
              <div className="stat-label">Accuracy Rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">95%</div>
              <div className="stat-label">Yield Prediction R²</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">1000+</div>
              <div className="stat-label">Data Points</div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Crops */}
      <section className="crops-section section">
        <div className="container">
          <h2 className="text-center">Supported Crops</h2>
          <p className="section-subtitle text-center">
            KISAN provides recommendations for 22 major Indian crops
          </p>
          
          <div className="crops-grid">
            {/* Add crops display here */}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>&copy; 2024 KISAN - Crop Recommendation System. All rights reserved.</p>
          <p>Making agriculture smarter, one decision at a time.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
