import React, { useMemo } from 'react';
import '../styles/SchemeCard.css';

/**
 * SchemeCard Component
 * 
 * Displays a single government scheme with details and redirect functionality.
 * Handles secure navigation to official government portals.
 * 
 * @param {Object} scheme - Scheme data object
 * @param {string} scheme.id - Unique scheme identifier
 * @param {string} scheme.schemeName - Name of the scheme
 * @param {string} scheme.description - Brief description
 * @param {string} scheme.type - "Central" or "State"
 * @param {string} scheme.state - State name or "All"
 * @param {string} scheme.category - Scheme category
 * @param {number} scheme.benefitAmount - Benefit amount in rupees
 * @param {string} scheme.eligibility - Eligibility criteria
 * @param {string} scheme.applicationMode - "Online" or "Offline"
 * @param {string} scheme.officialDepartment - Department name
 * @param {string} scheme.officialUrl - Official portal URL
 * @param {string} scheme.lastUpdated - Last updated date
 */
const SchemeCard = ({ scheme }) => {
  /**
   * Safely redirect to official government portal
   * Validates URL and opens in new tab with security headers
   */
  const handleRedirect = (url, schemeName) => {
    if (!url) {
      alert(`Official portal link is not available for this scheme. Please contact your local agriculture department.`);
      return;
    }

    try {
      // Validate URL starts with https for security
      if (!url.startsWith('https://') && !url.startsWith('http://')) {
        console.warn('[SchemeCard] Invalid URL detected:', url);
        alert('Invalid portal URL. Please contact your local agriculture department.');
        return;
      }

      // Open in new tab with security measures
      // noopener: prevents new page from accessing window.opener
      // noreferrer: prevents referrer information from being sent
      window.open(url, '_blank', 'noopener,noreferrer');
      console.log(`[SchemeCard] Opened official portal for: ${schemeName}`);
    } catch (err) {
      console.error('[SchemeCard] Error opening link:', err);
      alert('Unable to open the official portal. Please try again.');
    }
  };

  /**
   * Extract domain name from URL for display
   * Returns hostname without www prefix for cleaner display
   */
  const getDomainFromUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (err) {
      console.warn('[SchemeCard] Invalid URL for domain extraction:', url);
      return 'Official Portal';
    }
  };

  /**
   * Memoized domain extraction to avoid recalculation on every render
   */
  const domain = useMemo(() => {
    return scheme.officialUrl ? getDomainFromUrl(scheme.officialUrl) : null;
  }, [scheme.officialUrl]);

  return (
    <div className="scheme-card">
      {/* Card Header */}
      <div className="scheme-card-header">
        <h3 className="scheme-name">{scheme.schemeName}</h3>
        <div className="scheme-badges">
          <span className={`type-badge ${scheme.type.toLowerCase()}`}>
            {scheme.type}
          </span>
          <span className="category-badge">{scheme.category}</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="scheme-card-body">
        <p className="scheme-description">{scheme.description}</p>

        {/* Key Details Grid */}
        <div className="scheme-details">
          <div className="detail-item">
            <span className="detail-label">Benefit Amount</span>
            <span className="detail-value">
              {scheme.benefitAmount > 0
                ? `₹${scheme.benefitAmount.toLocaleString()}`
                : 'Variable'}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Application</span>
            <span className="detail-value">{scheme.applicationMode}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">State/Region</span>
            <span className="detail-value">
              {scheme.state === 'All' ? 'All India' : scheme.state}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Updated</span>
            <span className="detail-value">
              {new Date(scheme.lastUpdated).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Eligibility */}
        <div className="eligibility-box">
          <strong>Eligibility:</strong>
          <p>{scheme.eligibility}</p>
        </div>

        {/* Department */}
        <div className="department-box">
          <strong>Department:</strong>
          <p>{scheme.officialDepartment}</p>
        </div>
      </div>

      {/* Card Footer - Action Section */}
      <div className="scheme-card-footer">
        {scheme.officialUrl && domain && (
          <div className="portal-info">
            <span className="portal-domain">
              🌐 {domain}
            </span>
          </div>
        )}
        
        <button 
          className="learn-more-btn"
          onClick={() => handleRedirect(scheme.officialUrl, scheme.schemeName)}
          title={scheme.officialUrl ? `Visit official portal: ${domain}` : 'No official portal link available'}
          disabled={!scheme.officialUrl}
        >
          {scheme.officialUrl ? 'Learn More →' : 'No Link Available'}
        </button>

        {!scheme.officialUrl && (
          <p className="no-link-message">
            Contact your local agriculture department for details
          </p>
        )}
      </div>
    </div>
  );
};

export default SchemeCard;
