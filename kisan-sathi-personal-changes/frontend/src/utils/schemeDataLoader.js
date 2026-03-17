/**
 * Scheme Data Loader
 * Handles loading government schemes dataset for the frontend
 */

let cachedSchemes = null;

/**
 * Load schemes from local dataset
 * Uses caching to avoid repeated loads
 * 
 * @returns {Promise<Array>} Array of scheme objects
 */
export const loadSchemesData = async () => {
  try {
    // Return cached data if available
    if (cachedSchemes && cachedSchemes.length > 0) {
      return cachedSchemes;
    }

    // Try multiple load methods
    let schemes = await tryLoadFromPublic();
    
    if (!schemes || schemes.length === 0) {
      schemes = await tryLoadFromData();
    }

    if (schemes && schemes.length > 0) {
      // Cache the schemes
      cachedSchemes = schemes;
      console.log(`Loaded ${schemes.length} schemes and cached`);
      return schemes;
    }

    throw new Error('No schemes loaded from any source');
  } catch (error) {
    console.error('Error loading schemes:', error);
    return [];
  }
};

/**
 * Try to load schemes from public folder
 */
const tryLoadFromPublic = async () => {
  try {
    console.log('Trying to load from /governmentSchemes.json');
    const response = await fetch('/governmentSchemes.json');
    if (!response.ok) {
      console.debug('Response not ok:', response.status);
      return null;
    }
    const data = await response.json();
    console.log('Loaded from public:', data.schemes ? data.schemes.length : 0, 'schemes');
    return data.schemes || [];
  } catch (err) {
    console.debug('Failed to load from /public:', err.message);
  }
  return null;
};

/**
 * Try to load schemes from data folder
 */
const tryLoadFromData = async () => {
  try {
    console.log('Trying to load from /data/governmentSchemes.json');
    const response = await fetch('/data/governmentSchemes.json');
    if (!response.ok) {
      console.debug('Response not ok:', response.status);
      return null;
    }
    const data = await response.json();
    console.log('Loaded from data:', data.schemes ? data.schemes.length : 0, 'schemes');
    return data.schemes || [];
  } catch (err) {
    console.debug('Failed to load from /data:', err.message);
  }
  return null;
};

/**
 * Clear cached schemes
 * Useful for forcing a fresh load
 */
export const clearSchemesCache = () => {
  cachedSchemes = null;
};

/**
 * Get scheme by ID
 * 
 * @param {string} schemeId - Scheme ID
 * @returns {Promise<Object|null>} Scheme object or null
 */
export const getSchemeById = async (schemeId) => {
  const schemes = await loadSchemesData();
  return schemes.find((scheme) => scheme.id === schemeId) || null;
};

/**
 * Search schemes by multiple criteria
 * 
 * @param {Object} criteria - Search criteria
 * @param {string} criteria.name - Scheme name
 * @param {string} criteria.state - State
 * @param {string} criteria.category - Category
 * @returns {Promise<Array>} Matching schemes
 */
export const searchSchemes = async (criteria = {}) => {
  const schemes = await loadSchemesData();
  
  return schemes.filter((scheme) => {
    if (criteria.name && !scheme.schemeName.toLowerCase().includes(criteria.name.toLowerCase())) {
      return false;
    }
    if (criteria.state && scheme.state !== criteria.state) {
      return false;
    }
    if (criteria.category && scheme.category !== criteria.category) {
      return false;
    }
    return true;
  });
};

export default {
  loadSchemesData,
  clearSchemesCache,
  getSchemeById,
  searchSchemes
};
