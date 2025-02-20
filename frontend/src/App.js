// Import necessary React hooks and styling
import React, { useState, useEffect } from 'react';
import './App.css';

/**
 * Main Application Component
 * Manages the climate news article display and filtering functionality
 */
function App() {
  // State Management
  const [articles, setArticles] = useState([]); // Stores all fetched articles
  const [loading, setLoading] = useState(true); // Controls loading state
  const [error, setError] = useState(null);     // Stores any error messages
  const [selectedSource, setSelectedSource] = useState('all');     // Currently selected news source
  const [selectedCategory, setSelectedCategory] = useState('all'); // Currently selected category

  /**
   * Fetches articles from the backend server
   * Includes error handling and loading state management
   */
  const fetchArticles = async () => {
    try {
        setLoading(true);
        console.log('Fetching articles...');
        
        // Make API request to backend
        const response = await fetch('http://localhost:3001/api/articles', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        console.log('Response received:', response);
        
        // Check for HTTP errors
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseData = await response.json();
        console.log('Data received:', responseData);
        
        // Validate response data structure
        if (!responseData.success || !Array.isArray(responseData.data)) {
            throw new Error(responseData.error || 'Invalid data format received');
        }

        setArticles(responseData.data);
        setError(null);
    } catch (err) {
        setError(`Failed to load articles: ${err.message}`);
        console.error('Error:', err);
    } finally {
        setLoading(false);
    }
  };

  // Fetch articles when component mounts
  useEffect(() => {
    fetchArticles();
  }, []);

  // Extract unique sources and categories from articles for filters
  const sources = ['all', ...new Set(articles.map(article => article.source))];
  const categories = ['all', ...new Set(articles.map(article => article.category))];

  // Filter articles based on selected source and category
  const filteredArticles = articles.filter(article => 
    (selectedSource === 'all' || article.source === selectedSource) &&
    (selectedCategory === 'all' || article.category === selectedCategory)
  );

  return (
    <div className="app">
        {/* Sidebar with controls */}
        <div className="sidebar">
            <header className="header">
                <h1>Climate Change News Tracker</h1>
                <p>Aggregating important climate change articles from trusted sources</p>
            </header>

            {/* Filter Controls */}
            <div className="controls">
                {/* Source Selection Dropdown */}
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

                {/* Category Selection Dropdown */}
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

                {/* Refresh Button */}
                <button onClick={fetchArticles} className="refresh-button">
                    Find Info
                </button>
            </div>
        </div>

        {/* Main Content Area */}
        <main className="main-content">
            {/* Loading State Display */}
            {loading && <div className="loading">Loading articles...</div>}
            
            {/* Error State Display */}
            {error && <div className="error">{error}</div>}
            
            {/* No Articles Found State */}
            {!loading && !error && filteredArticles.length === 0 && (
                <div className="no-articles">
                    No articles found. Try refreshing or changing filters.
                </div>
            )}

            {/* Articles Grid */}
            <div className="articles-grid">
                {filteredArticles.map((article, index) => (
                    <article key={index} className="article-card">
                        {/* Article Header with Category and Source */}
                        <div className="article-header">
                            <span className="category">{article.category}</span>
                            <a 
                                href={article.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="source"
                            >
                                {article.source}
                            </a>
                        </div>
                        
                        {/* Article Title with Link */}
                        <a 
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="title"
                        >
                            {article.title}
                        </a>
                        
                        {/* Article Summary */}
                        <p className="summary">{article.summary}</p>
                        
                        {/* Formatted Publication Date */}
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