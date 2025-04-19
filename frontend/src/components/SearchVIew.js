import React, { useState, useEffect } from 'react';
import './PlaceholderViews.css';
import '../App.css';

export const SearchView = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    titleOnly: false,
    recentOnly: true,
    sourceFilter: 'all'
  });
  const [sources, setSources] = useState([]);
  const [resultsFound, setResultsFound] = useState(false);

  // Fetch available sources when component mounts
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const API_URL = (process.env.REACT_APP_API_URL || 'https://geog-web-app-fiddr.ondigitalocean.app').replace(/\/$/, '');
        const response = await fetch(`${API_URL}/api/articles?limit=1`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Extract unique sources from the articles
        if (data.metadata && data.data) {
          const uniqueSources = [...new Set(data.data.map(article => article.source))];
          setSources(['all', ...uniqueSources]);
        }
      } catch (err) {
        console.error('Error fetching sources:', err);
      }
    };
    
    fetchSources();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    setSearchResults([]);
    
    try {
      const API_URL = (process.env.REACT_APP_API_URL || 'https://geog-web-app-fiddr.ondigitalocean.app').replace(/\/$/, '');
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Add search query
      queryParams.append('q', searchQuery);
      
      // Add filters
      if (filters.sourceFilter !== 'all') {
        queryParams.append('source', filters.sourceFilter);
      }
      
      queryParams.append('titleOnly', filters.titleOnly.toString());
      queryParams.append('recentOnly', filters.recentOnly.toString());
      
      // Try to use the dedicated search endpoint
      // Fall back to filtering regular articles if search endpoint isn't available
      let response;
      try {
        response = await fetch(`${API_URL}/api/search?${queryParams}`);
        
        if (!response.ok) {
          throw new Error(`Search endpoint unavailable: ${response.status}`);
        }
      } catch (searchError) {
        console.warn('Search endpoint unavailable, falling back to client-side filtering:', searchError);
        
        // Fall back to regular articles endpoint
        response = await fetch(`${API_URL}/api/articles?${queryParams}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
      }
      
      const data = await response.json();
      
      // Check if we're using the dedicated search endpoint or need client-side filtering
      let filteredResults;
      
      if (response.url.includes('/api/search')) {
        // Using dedicated search endpoint - results are already filtered
        filteredResults = data.data || [];
      } else {
        // Filter results client-side based on search query and filters
        filteredResults = data.data || [];
        
        // Filter by search term
        filteredResults = filteredResults.filter(article => {
          const titleMatch = article.title.toLowerCase().includes(searchQuery.toLowerCase());
          const summaryMatch = article.summary && article.summary.toLowerCase().includes(searchQuery.toLowerCase());
          
          if (filters.titleOnly) {
            return titleMatch;
          }
          return titleMatch || summaryMatch;
        });
      }
      
      setSearchResults(filteredResults);
      setResultsFound(filteredResults.length > 0);
    } catch (err) {
      console.error('Error searching articles:', err);
      setError('Failed to search articles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [filterName]: value
    }));
  };

  return (
    <div className="placeholder-view">
      <h2>Article Search</h2>
      <p className="placeholder-description">
        Search across all articles for specific climate information using keywords,
        sources, and other filters.
      </p>
      
      <div className="search-preview">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles for keywords..."
            className="search-input"
          />
          <button type="submit" className="search-button" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
        
        <div className="search-options">
          <div className="search-option">
            <input 
              type="checkbox" 
              id="title-only"
              checked={filters.titleOnly}
              onChange={(e) => handleFilterChange('titleOnly', e.target.checked)}
            />
            <label htmlFor="title-only">Title only</label>
          </div>
          
          <div className="search-option">
            <input 
              type="checkbox" 
              id="recent-only"
              checked={filters.recentOnly}
              onChange={(e) => handleFilterChange('recentOnly', e.target.checked)}
            />
            <label htmlFor="recent-only">Last 3 months</label>
          </div>
          
          <div className="search-option">
            <label htmlFor="source-filter">Source:</label>
            <select 
              id="source-filter"
              value={filters.sourceFilter}
              onChange={(e) => handleFilterChange('sourceFilter', e.target.value)}
              className="source-select"
            >
              {sources.map(source => (
                <option key={source} value={source}>
                  {source === 'all' ? 'All Sources' : source}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {error && <div className="error">{error}</div>}
      
      {loading && <div className="loading">Searching articles...</div>}
      
      {!loading && searchResults.length > 0 && (
        <div className="search-results">
          <h3>Search Results</h3>
          <div className="articles-grid">
            {searchResults.map((article, index) => (
              <article 
                key={index} 
                className="article-card"
                data-category={article.contentCategory || 'science_other'}
              >
                <div className="article-header">
                  <span className="category">
                    {article.contentCategory 
                      ? article.contentCategory.replace(/_/g, ' ') 
                      : article.category}
                  </span>
                  <a 
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source"
                  >
                    {article.source}
                  </a>
                </div>
                
                <a 
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="title"
                >
                  {article.title}
                </a>
                
                {/* Highlight search term in summary */}
                <p className="summary">
                  {article.summary ? (
                    article.summary
                  ) : (
                    'No summary available'
                  )}
                </p>
                
                <div className="date">
                  {new Date(article.date || article.publication_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
      
      {!loading && searchQuery && resultsFound === false && (
        <div className="no-results">
          <p>No results found for "{searchQuery}". Try different keywords or filters.</p>
        </div>
      )}
      
      <div className="implementation-notes">
        <h3>Implementation Details</h3>
        <ul>
          <li>Search is currently implemented as a client-side filter of existing articles</li>
          <li>Full backend search functionality will be added in a future update</li>
          <li>When complete, search will include full-text search across article content</li>
          <li>Advanced features will include semantic search and topic-based filtering</li>
        </ul>
      </div>
    </div>
  );
};

export default SearchView;