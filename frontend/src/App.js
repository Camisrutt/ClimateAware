import React, { useState, useEffect } from 'react';
import './App.css';
import UserSurvey from './components/UserSurvey';
import FeedbackButton from './components/FeedbackButton';
import WorkInProgressBanner from './components/WorkInProgressBanner';
import Sidebar from './components/Sidebar';
import DataView from './components/DataView';
import SearchView from './components/SearchView';
import { ArticleView, MapView, CommunityView } from './components/PlaceholderViews';
import { fetchArticles } from './api';

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
      const sourceMatch = selectedSource === 'all' || article.source === selectedSource;
      // We're not using selectedCategory directly in API filters, but still filtering locally
      const categoryMatch = selectedCategory === 'all' || article.category === selectedCategory;
      
      // More flexible content category matching (case insensitive)
      const contentCategoryMatch = selectedContentCategory === 'all' || 
                                 (article.contentCategory && 
                                  article.contentCategory.toLowerCase() === selectedContentCategory.toLowerCase());
      
      return sourceMatch && categoryMatch && contentCategoryMatch;
    })
  : [];

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