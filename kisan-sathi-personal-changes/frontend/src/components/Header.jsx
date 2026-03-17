import React from 'react';
import { Leaf, Sprout, TrendingUp, AlertCircle } from 'lucide-react';
import '../styles/Header.css';

function Header() {
  return (
    <header className="hero-header">
      <div className="container">
        <div className="hero-content fade-in">
          <div className="hero-icon">
            <Leaf size={64} color="#2ecc71" />
          </div>
          <h1>🌾 KISAN</h1>
          <p className="hero-subtitle">
            Intelligent Crop Recommendation & Decision Support System
          </p>
          <p className="hero-description">
            Help Indian farmers maximize yield and profits through data-driven crop selection
          </p>
        </div>
      </div>
    </header>
  );
}

export default Header;
