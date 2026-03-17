import React, { useState, useMemo, useEffect } from 'react';
import {
  filterSchemes,
  getAllStates,
  getAllCategories,
  getRecommendedSchemes,
  sortSchemes,
  getSchemeStats
} from '../utils/schemeFilter';
import SchemeCard from './SchemeCard';
import '../styles/SchemeSection.css';

const SchemeSection = ({ allSchemes = [], farmerProfile = {} }) => {
  const [selectedState, setSelectedState] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('name');
  const [showRecommended, setShowRecommended] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // Memoize states and categories
  const states = useMemo(() => getAllStates(allSchemes), [allSchemes]);
  const categories = useMemo(() => getAllCategories(allSchemes), [allSchemes]);

  // Memoize filtered schemes
  const filteredSchemes = useMemo(() => {
    const filtered = filterSchemes({
      schemes: allSchemes,
      selectedState,
      selectedCategory,
      searchTerm
    });

    return sortSchemes(filtered, sortBy, 'asc');
  }, [allSchemes, selectedState, selectedCategory, searchTerm, sortBy]);

  // Get recommended schemes
  const recommendedSchemes = useMemo(() => {
    if (!farmerProfile.state || !showRecommended) return [];

    return getRecommendedSchemes({
      schemes: allSchemes,
      selectedCrop: farmerProfile.crop || '',
      selectedState: farmerProfile.state,
      isDroughtProne: farmerProfile.isDroughtProne || false
    });
  }, [allSchemes, farmerProfile, showRecommended]);

  // Get stats
  const stats = useMemo(() => getSchemeStats(filteredSchemes), [filteredSchemes]);

  // Pagination
  const totalPages = Math.ceil(filteredSchemes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedSchemes = filteredSchemes.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedState, selectedCategory, searchTerm, sortBy]);

  // Determine which schemes to display
  const displaySchemes = showRecommended ? recommendedSchemes : paginatedSchemes;
  const displayStats = showRecommended ? getSchemeStats(recommendedSchemes) : stats;

  const handleStateChange = (e) => {
    setSelectedState(e.target.value);
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleClearFilters = () => {
    setSelectedState('');
    setSelectedCategory('');
    setSearchTerm('');
    setSortBy('name');
    setCurrentPage(1);
    setShowRecommended(false);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleShowRecommended = () => {
    setShowRecommended(!showRecommended);
  };

  return (
    <div className="scheme-section-container">
      {/* Header */}
      <div className="scheme-header">
        <h1>Government Agricultural Schemes</h1>
        <p className="scheme-subtitle">Explore central and state schemes to support your farming</p>
      </div>

      {/* Recommended Schemes Alert */}
      {farmerProfile.state && (
        <div className="recommended-banner">
          <div className="recommendation-content">
            <span className="recommendation-text">
              Personalized schemes recommended for {farmerProfile.state}
            </span>
            <button
              className={`recommendation-toggle-btn ${showRecommended ? 'active' : ''}`}
              onClick={handleShowRecommended}
            >
              {showRecommended ? 'Show All' : 'View Recommended'}
            </button>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="filters-container">
        {/* Search Bar */}
        <div className="search-bar-wrapper">
          <input
            type="text"
            placeholder="Search schemes by name, department..."
            className="search-input"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <span className="search-icon">🔍</span>
        </div>

        {/* Filter Dropdowns */}
        <div className="filters-grid">
          {/* State Filter */}
          <div className="filter-column">
            <label htmlFor="state-filter" className="filter-label">
              State
            </label>
            <select
              id="state-filter"
              className="filter-select"
              value={selectedState}
              onChange={handleStateChange}
            >
              <option value="">All States</option>
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="filter-column">
            <label htmlFor="category-filter" className="filter-label">
              Category
            </label>
            <select
              id="category-filter"
              className="filter-select"
              value={selectedCategory}
              onChange={handleCategoryChange}
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Options */}
          <div className="filter-column">
            <label htmlFor="sort-filter" className="filter-label">
              Sort By
            </label>
            <select
              id="sort-filter"
              className="filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name">Scheme Name</option>
              <option value="benefit">Benefit Amount</option>
              <option value="date">Last Updated</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(selectedState || selectedCategory || searchTerm) && (
          <button className="clear-filters-btn" onClick={handleClearFilters}>
            Clear All Filters
          </button>
        )}
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-label">Total Schemes</span>
          <span className="stat-value">{displayStats.totalSchemes}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Central Schemes</span>
          <span className="stat-value">{displayStats.centralSchemes}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">State Schemes</span>
          <span className="stat-value">{displayStats.stateSchemes}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Avg. Benefit</span>
          <span className="stat-value">₹{displayStats.averageBenefit.toLocaleString()}</span>
        </div>
      </div>

      {/* Schemes Grid */}
      <div className="schemes-grid-container">
        {displaySchemes.length > 0 ? (
          <>
            <div className="schemes-grid">
              {displaySchemes.map((scheme) => (
                <SchemeCard key={scheme.id} scheme={scheme} />
              ))}
            </div>

            {/* Pagination */}
            {!showRecommended && totalPages > 1 && (
              <div className="pagination-container">
                <button
                  className="pagination-btn"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>

                <div className="pagination-info">
                  Page <span className="current-page">{currentPage}</span> of{' '}
                  <span className="total-pages">{totalPages}</span>
                </div>

                <button
                  className="pagination-btn"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="no-schemes-message">
            <div className="empty-state">
              <span className="empty-icon">🔍</span>
              <h3>No Schemes Found</h3>
              <p>
                {showRecommended
                  ? 'No recommended schemes available for your profile.'
                  : 'Try adjusting your filters or search term.'}
              </p>
              <button className="reset-btn" onClick={handleClearFilters}>
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="scheme-footer">
        <p className="footer-text">
          💡 <strong>Tip:</strong> Visit official government agriculture portals for detailed
          application procedures and documentation requirements.
        </p>
      </div>
    </div>
  );
};

export default SchemeSection;
