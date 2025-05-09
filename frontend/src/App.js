import React, { useState, useEffect } from 'react';
import './App.css';
import UserSurvey from './components/UserSurvey';
import FeedbackButton from './components/FeedbackButton';
import WorkInProgressBanner from './components/WorkInProgressBanner';
import Sidebar from './components/Sidebar';
import DataView from './components/DataView';
import SearchView from './components/SearchView.js';
import { ArticleView, MapView, CommunityView } from './components/PlaceholderViews';
import { fetchArticles, submitSurvey, submitFeedback, markArticleImportant } from './api';

// View types for navigation
const VIEWS = {
  ARTICLE: 'article',
  CATEGORY: 'category', // Original view with article grid
  MAP: 'map',
  DATA: 'data',
  COMMUNITY: 'community',
  SEARCH: 'search',
};

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminApiKey, setAdminApiKey] = useState('');
  const [articles, setArticles] = useState([]);
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
  
  // New state for navigation
  const [currentView, setCurrentView] = useState(VIEWS.CATEGORY); // Default to category view (original)
  const [currentSubView, setCurrentSubView] = useState(null);

  const getArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the filters from state
      const filters = {
        source: selectedSource,
        contentCategory: selectedContentCategory
      };
      
      console.log("Sending filters to API:", filters);
      
      const responseData = await fetchArticles(filters);
      console.log("API response:", responseData);
      
      // Data validation
      if (!responseData.success) {
        throw new Error(responseData.error || 'Invalid data format received');
      }
  
      // Ensure we're setting an array
      const articlesData = Array.isArray(responseData.data) 
        ? responseData.data 
        : responseData.data.all || [];
  
      console.log("Articles data:", articlesData);
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

  useEffect(() => {
    // When the user changes the content category, fetch new articles
    getArticles();
  }, [selectedContentCategory]); // This will run whenever selectedContentCategory changes

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
      // Source filtering
      const sourceMatch = selectedSource === 'all' || article.source === selectedSource;
      
      // Category filtering (more flexible)
      const categoryMatch = selectedCategory === 'all' || 
                          (article.category && article.category.toLowerCase() === selectedCategory.toLowerCase());
      
      // Content category filtering - FIXED
      // There's a property naming mismatch between API response and frontend
      // Database uses content_category but frontend might be looking for contentCategory
      
      // Extract the content category value using multiple possible property names
      const articleContentCategory = article.content_category || article.contentCategory;
      
      // Match the selected content category with the article's content category
      const contentCategoryMatch = selectedContentCategory === 'all' || 
                               (articleContentCategory && 
                                articleContentCategory.toLowerCase() === selectedContentCategory.toLowerCase());
      
      // Debug logging - uncomment for troubleshooting
      // console.log(`Article: ${article.title}`);
      // console.log(`- Content Category: ${articleContentCategory}`);
      // console.log(`- Selected Category: ${selectedContentCategory}`);
      // console.log(`- Match: ${contentCategoryMatch}`);
      
      return sourceMatch && categoryMatch && contentCategoryMatch;
    })
  : [];

  const handleMarkImportant = async (articleId, isImportant) => {
    try {
      if (!adminApiKey) {
        const key = prompt('Enter admin API key to mark articles as important:');
        if (!key) return;
        setAdminApiKey(key);
      }
      
      await markArticleImportant(articleId, isImportant, adminApiKey);
      
      // Refresh articles to update the view
      getArticles();
      
      // Set admin state if not already set
      if (!isAdmin) {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Error marking article as important:', error);
      alert('Failed to mark article as important. Check your API key and try again.');
      setAdminApiKey(''); // Reset API key on error
    }
  };

  // Render the appropriate view based on currentView state
  const renderCurrentView = () => {
    switch(currentView) {
      case VIEWS.ARTICLE:
        return <ArticleView />;
      
      case VIEWS.MAP:
        return <MapView />;
      
      case VIEWS.DATA:
        return <DataView currentSubView={currentSubView} />;
      
      case VIEWS.COMMUNITY:
        return <CommunityView />;
      
      case VIEWS.SEARCH:
        return <SearchView />;
      
      case VIEWS.CATEGORY:
      default:
        return (
          <>
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
                className={`article-card ${article.is_important ? 'important' : ''}`}
                data-category={article.contentCategory || 'science_other'}
              >
                {article.is_important && <span className="important-badge">Important</span>}
                
                {/* For admin users, add ability to mark as important */}
                {isAdmin && (
                  <button 
                    className={`mark-important-button ${article.is_important ? 'active' : ''}`}
                    onClick={() => handleMarkImportant(article.id, !article.is_important)}
                    title={article.is_important ? "Unmark as important" : "Mark as important"}
                  >
                    ★
                  </button>
                )}
                
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
                  {new Date(article.date || article.publication_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </article>
              ))}
            </div>
          </>
        );
    }
  };

  // THIS RETURN STATEMENT WAS MISSING!
  return (
    <div className="app">
      <UserSurvey onClose={(data) => console.log('Survey completed:', data)} />
      <WorkInProgressBanner /> 
      <FeedbackButton />

      <Sidebar 
        selectedContentCategory={selectedContentCategory}
        setSelectedContentCategory={setSelectedContentCategory}
        selectedSource={selectedSource}
        setSelectedSource={setSelectedSource}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        sources={sources}
        categories={categories}
        categoryCounts={categoryCounts}
        CONTENT_CATEGORIES={CONTENT_CATEGORIES}
        getArticles={getArticles}
        // New props for navigation
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentSubView={currentSubView}
        setCurrentSubView={setCurrentSubView}
      />

      <main className="main-content">
        {renderCurrentView()}
      </main>
    </div>
  );
}

export default App;