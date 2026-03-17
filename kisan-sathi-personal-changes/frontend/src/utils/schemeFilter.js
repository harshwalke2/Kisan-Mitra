/**
 * Scheme Filter Engine
 * Provides efficient filtering for government schemes
 * No mutation of original dataset
 */

/**
 * Load schemes from dataset
 * @returns {Array} Array of scheme objects
 */
export const loadSchemes = () => {
  try {
    // This will be imported by React from public or data folder
    // For production, the dataset should be imported as JSON
    return [];
  } catch (error) {
    console.error('Error loading schemes:', error);
    return [];
  }
};

/**
 * Get all unique states from schemes
 * @param {Array} schemes - Array of scheme objects
 * @returns {Array} Sorted array of unique state names
 */
export const getAllStates = (schemes) => {
  const states = new Set();
  
  schemes.forEach((scheme) => {
    if (scheme.type === 'Central') {
      states.add('All');
    } else if (scheme.state && scheme.state !== 'All') {
      states.add(scheme.state);
    }
  });

  return Array.from(states).sort();
};

/**
 * Get all unique categories from schemes
 * @param {Array} schemes - Array of scheme objects
 * @returns {Array} Sorted array of unique categories
 */
export const getAllCategories = (schemes) => {
  const categories = new Set();
  
  schemes.forEach((scheme) => {
    if (scheme.category) {
      categories.add(scheme.category);
    }
  });

  return Array.from(categories).sort();
};

/**
 * Main filter function for schemes
 * 
 * @param {Object} options - Filter options
 * @param {Array} options.schemes - Array of all schemes
 * @param {string} options.selectedState - Selected state (or empty string for no filter)
 * @param {string} options.selectedCategory - Selected category (or empty string for no filter)
 * @param {string} options.searchTerm - Search term for scheme name (case-insensitive)
 * @returns {Array} Filtered schemes array (non-mutating)
 */
export const filterSchemes = ({
  schemes = [],
  selectedState = '',
  selectedCategory = '',
  searchTerm = ''
}) => {
  if (!schemes || schemes.length === 0) return [];

  return schemes.filter((scheme) => {
    // Rule 1: Central schemes show for all states
    // Rule 2: State schemes show only if state matches
    if (selectedState && selectedState !== 'All') {
      if (scheme.type === 'Central') {
        // Central schemes are available for all states
      } else if (scheme.type === 'State' && scheme.state !== selectedState) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory && scheme.category !== selectedCategory) {
      return false;
    }

    // Search filter (case-insensitive)
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const matchesName = scheme.schemeName.toLowerCase().includes(lowerSearchTerm);
      const matchesDescription = scheme.description.toLowerCase().includes(lowerSearchTerm);
      const matchesDepartment = scheme.officialDepartment.toLowerCase().includes(lowerSearchTerm);

      if (!matchesName && !matchesDescription && !matchesDepartment) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Get recommended schemes based on farmer profile
 * 
 * @param {Object} options - Recommendation options
 * @param {Array} options.schemes - Array of all schemes
 * @param {string} options.selectedCrop - Selected crop type
 * @param {string} options.selectedState - Selected state
 * @param {boolean} options.isDroughtProne - Whether state is prone to drought
 * @returns {Array} Top 5 recommended schemes
 */
export const getRecommendedSchemes = ({
  schemes = [],
  selectedCrop = '',
  selectedState = '',
  isDroughtProne = false
}) => {
  if (!schemes || schemes.length === 0) return [];

  const recommended = [];
  const priorityMap = new Map();

  // Filter for the selected state (include central schemes)
  const stateSchemes = schemes.filter((scheme) => {
    return (
      scheme.type === 'Central' ||
      (scheme.type === 'State' && scheme.state === selectedState)
    );
  });

  // Score schemes based on relevance
  stateSchemes.forEach((scheme) => {
    let score = 0;

    // Priority 1: Insurance for crop
    if (scheme.category === 'Insurance' || scheme.category === 'Crop Insurance') {
      score += 50;
    }

    // Priority 2: Machinery subsidy
    if (scheme.category === 'Machinery') {
      score += 40;
    }

    // Priority 3: Irrigation for drought-prone areas
    if (isDroughtProne && scheme.category === 'Irrigation') {
      score += 45;
    }

    // Priority 4: Seed and fertilizer assistance
    if (
      scheme.category === 'Seeds' ||
      scheme.category === 'Fertilizer' ||
      scheme.schemeName.toLowerCase().includes('seed')
    ) {
      score += 30;
    }

    // Priority 5: Subsidy programs
    if (scheme.category === 'Subsidy') {
      score += 25;
    }

    // Boost for central schemes (higher guarantee)
    if (scheme.type === 'Central') {
      score += 10;
    }

    if (score > 0) {
      priorityMap.set(scheme.id, { scheme, score });
    }
  });

  // Sort by score and return top 5
  return Array.from(priorityMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.scheme);
};

/**
 * Get scheme statistics
 * 
 * @param {Array} schemes - Array of schemes
 * @returns {Object} Statistics object
 */
export const getSchemeStats = (schemes = []) => {
  if (!schemes || schemes.length === 0) {
    return {
      totalSchemes: 0,
      centralSchemes: 0,
      stateSchemes: 0,
      averageBenefit: 0,
      categoryCounts: {}
    };
  }

  const stats = {
    totalSchemes: schemes.length,
    centralSchemes: 0,
    stateSchemes: 0,
    averageBenefit: 0,
    categoryCounts: {}
  };

  let totalBenefit = 0;
  let benefitCount = 0;

  schemes.forEach((scheme) => {
    // Count central and state schemes
    if (scheme.type === 'Central') {
      stats.centralSchemes++;
    } else if (scheme.type === 'State') {
      stats.stateSchemes++;
    }

    // Count categories
    if (scheme.category) {
      stats.categoryCounts[scheme.category] =
        (stats.categoryCounts[scheme.category] || 0) + 1;
    }

    // Calculate average benefit
    if (scheme.benefitAmount > 0) {
      totalBenefit += scheme.benefitAmount;
      benefitCount++;
    }
  });

  stats.averageBenefit = benefitCount > 0 ? Math.round(totalBenefit / benefitCount) : 0;

  return stats;
};

/**
 * Memoized filter function for React
 * Returns a function that filters schemes
 * Useful with useMemo in React components
 * 
 * @param {Array} schemes - Array of all schemes
 * @returns {Function} Filter function
 */
export const createMemoizedFilter = (schemes) => {
  const cache = new Map();

  return (selectedState, selectedCategory, searchTerm) => {
    const key = `${selectedState}|${selectedCategory}|${searchTerm}`;

    if (cache.has(key)) {
      return cache.get(key);
    }

    const filtered = filterSchemes({
      schemes,
      selectedState,
      selectedCategory,
      searchTerm
    });

    cache.set(key, filtered);

    // Keep cache size manageable (max 50 combinations)
    if (cache.size > 50) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return filtered;
  };
};

/**
 * Sort schemes by criteria
 * 
 * @param {Array} schemes - Schemes to sort
 * @param {string} sortBy - Sort criteria: 'benefit', 'name', 'date'
 * @param {string} order - Sort order: 'asc' or 'desc'
 * @returns {Array} Sorted schemes
 */
export const sortSchemes = (schemes = [], sortBy = 'name', order = 'asc') => {
  const sorted = [...schemes];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'benefit':
        comparison = a.benefitAmount - b.benefitAmount;
        break;
      case 'name':
        comparison = a.schemeName.localeCompare(b.schemeName);
        break;
      case 'date':
        comparison = new Date(a.lastUpdated) - new Date(b.lastUpdated);
        break;
      default:
        comparison = a.schemeName.localeCompare(b.schemeName);
    }

    return order === 'desc' ? -comparison : comparison;
  });

  return sorted;
};

export default {
  filterSchemes,
  getAllStates,
  getAllCategories,
  getRecommendedSchemes,
  getSchemeStats,
  createMemoizedFilter,
  sortSchemes,
  loadSchemes
};
