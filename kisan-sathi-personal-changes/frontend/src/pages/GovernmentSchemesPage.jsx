import React, { useState, useEffect } from 'react';
import SchemeSection from '../components/SchemeSection';
import { loadSchemesData } from '../utils/schemeDataLoader';

const GovernmentSchemesPage = ({ farmerProfile = {} }) => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSchemes();
  }, []);

  const loadSchemes = async () => {
    try {
      console.log('[GovernmentSchemesPage] Starting to load schemes...');
      setLoading(true);
      const schemesData = await loadSchemesData();
      console.log('[GovernmentSchemesPage] Loaded:', schemesData ? schemesData.length : 0, 'schemes');
      if (schemesData && schemesData.length > 0) {
        console.log('[GovernmentSchemesPage] Setting schemes. First:', schemesData[0]?.schemeName);
        setSchemes(schemesData);
        setError(null);
      } else {
        throw new Error('No schemes data available');
      }
    } catch (err) {
      console.error('[GovernmentSchemesPage] Error:', err);
      setError('Failed to load government schemes. Please ensure the data file is available.');
      setSchemes([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading government schemes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2>⚠️ Error Loading Schemes</h2>
        <p>{error}</p>
        <button style={styles.retryBtn} onClick={loadSchemes}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <SchemeSection allSchemes={schemes} farmerProfile={farmerProfile} />
  );
};

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(102, 126, 234, 0.2)',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '20px',
    fontSize: '1.1em',
    color: '#666',
    fontWeight: 500,
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    textAlign: 'center',
    color: '#333',
  },
  retryBtn: {
    marginTop: '20px',
    padding: '12px 30px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1em',
    fontWeight: 600,
  },
};

// Add CSS animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(styleSheet);
}

export default GovernmentSchemesPage;
