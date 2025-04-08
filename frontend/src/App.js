import React, { useState, useEffect } from 'react';
import './App.css';
import UserSurvey from './components/UserSurvey';
import FeedbackButton from './components/FeedbackButton';
import { fetchArticles } from './api'; // Import the API function

/**
 * Content category definitions for filtering articles
 */
const CONTENT_CATEGORIES = {
  all: 'All Articles',
  climate_primary: 'Climate Primary',
  climate_related: 'Climate Related',
  science_other: 'Other Science News'
};

function App() {
  // State Management with proper initialization
  const [articles, setArticles] = useState([]); // Initialize as empty array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedContentCategory, setSelectedContentCategory] = useState('all');
  const [categoryCounts, setCategoryCounts] = useState({
    climate_primary: 0,
    climate_related: 0,
    science_other: 0
  });

  const getArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the filters from state
      const filters = {
        source: selectedSource,
        category: selectedCategory,
        contentCategory: selectedContentCategory
      };
      
      const responseData = await fetchArticles(filters);
      
      // Data validation
      if (!responseData.success) {
        throw new Error(responseData.error || 'Invalid data format received');
      }

      // Ensure we're setting an array
      const articlesData = Array.isArray(responseData.data) 
        ? responseData.data 
        : responseData.data.all || [];

      setArticles(articlesData);
      
      // Set category counts from the metadata if available
      if (responseData.metadata && responseData.metadata.articlesByCategory) {
        setCategoryCounts(responseData.metadata.articlesByCategory);
      } else {
        // Calculate counts locally if not provided by API
        setCategoryCounts({
          climate_primary: articlesData.filter(a => a.contentCategory === 'climate_primary').length,
          climate_related: articlesData.filter(a => a.contentCategory === 'climate_related').length,
          science_other: articlesData.filter(a => a.contentCategory === 'science_other').length
        });
      }
    } catch (err) {
      setError(`Failed to load articles: ${err.message}`);
      console.error('Error:', err);
      setArticles([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getArticles();
  }, []); // Empty dependency array means this runs once on component mount

  // Safely extract unique values
  const sources = ['all', ...new Set(Array.isArray(articles) 
    ? articles.map(article => article.source)
    : [])];
  
  const categories = ['all', ...new Set(Array.isArray(articles) 
    ? articles.map(article => article.category)
    : [])];

  // Safe filtering with type checking
  const filteredArticles = Array.isArray(articles) 
    ? articles.filter(article => {
        const sourceMatch = selectedSource === 'all' || article.source === selectedSource;
        const categoryMatch = selectedCategory === 'all' || article.category === selectedCategory;
        const contentCategoryMatch = selectedContentCategory === 'all' || 
                                   article.contentCategory === selectedContentCategory;
        return sourceMatch && categoryMatch && contentCategoryMatch;
      })
    : [];

  return (
    <div className="app">
      <UserSurvey onClose={(data) => console.log('Survey completed:', data)} />
      <FeedbackButton />

      <div className="sidebar">
        <header className="header">
          <h1>Climate Change News Tracker</h1>
          <p>Aggregating important climate change articles from trusted sources</p>
        </header>

        <div className="controls">
          <select 
            value={selectedContentCategory}
            onChange={(e) => setSelectedContentCategory(e.target.value)}
            className="select"
          >
            {Object.entries(CONTENT_CATEGORIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select 
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="select"
          >
            {sources.map(source => (
              <option key={source} value={source}>
                {source.charAt(0).toUpperCase() + source.slice(1)}
              </option>
            ))}
          </select>

          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="select"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>

          <div className="category-counts">
            {Object.entries(CONTENT_CATEGORIES).map(([category, label]) => {
              if (category === 'all') return null;
              return (
                <div key={category} className="category-count">
                  <span className="category-label">{label}:</span>
                  <span className="count">{categoryCounts[category] || 0}</span>
                </div>
              );
            })}
          </div>

          <button onClick={getArticles} className="refresh-button">
            Find Info
          </button>
        </div>
      </div>

      <main className="main-content">
        {loading && <div className="loading">Loading articles...</div>}
        
        {error && <div className="error">{error}</div>}
        
        {!loading && !error && filteredArticles.length === 0 && (
          <div className="no-articles">
            No articles found. Try refreshing or changing filters.
          </div>
        )}

        <div className="articles-grid">
          {filteredArticles.map((article, index) => (
            <article 
              key={index} 
              className="article-card"
              data-category={article.contentCategory || 'science_other'}
            >
              <div className="article-header">
                <span className="category">
                  {CONTENT_CATEGORIES[article.contentCategory] || article.category}
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
              
              <p className="summary">{article.summary}</p>
              
              <div className="date">
                {new Date(article.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;