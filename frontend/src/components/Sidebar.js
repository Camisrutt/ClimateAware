import React, { useState } from 'react';
import './Sidebar.css';
import GlobeLogo from '../components/Images/Globev1.png';

// View definitions for navigation
const VIEWS = {
  ARTICLE: 'article',
  CATEGORY: 'category',
  MAP: 'map',
  DATA: 'data',
  COMMUNITY: 'community',
  SEARCH: 'search',
};

// Sub-views for DATA view
const DATA_SUBVIEWS = {
  ARTICLE_STATS: 'article_stats',
  FEEDBACK_STATS: 'feedback_stats',
  SURVEY_STATS: 'survey_stats',
  ADMIN: 'admin'
};

const Sidebar = ({ 
  selectedContentCategory, 
  setSelectedContentCategory,
  selectedSource,
  setSelectedSource,
  selectedCategory,
  setSelectedCategory, 
  sources, 
  categories, 
  categoryCounts, 
  CONTENT_CATEGORIES,
  getArticles,
  // New props for view handling
  currentView,
  setCurrentView,
  currentSubView,
  setCurrentSubView
}) => {
  // State for tracking expanded sections
  const [expandedSection, setExpandedSection] = useState(null);

  // Toggle section expansion
  const toggleSection = (section) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  // Handle view selection
  const handleViewChange = (view) => {
    setCurrentView(view);
    // Reset subview when changing main view
    setCurrentSubView(null);
    // Only expand Data when selecting it
    if (view === VIEWS.DATA) {
      setExpandedSection(VIEWS.DATA);
    } else {
      setExpandedSection(null);
    }
  };

  return (
    <div className="sidebar">
      <div className="globe-container">
        <img src={GlobeLogo} alt="Globe" className="globe-image" />
      </div>
      
      <header className="header">
        <h1>Climate Change News Tracker</h1>
        <p>Aggregating important climate change articles from trusted sources</p>
      </header>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          <li className={`nav-item ${currentView === VIEWS.ARTICLE ? 'active' : ''}`}>
            <button onClick={() => handleViewChange(VIEWS.ARTICLE)}>
              Article View
            </button>
          </li>
          
          <li className={`nav-item ${currentView === VIEWS.CATEGORY ? 'active' : ''}`}>
            <button onClick={() => handleViewChange(VIEWS.CATEGORY)}>
              Category View
            </button>
          </li>
          
          <li className={`nav-item ${currentView === VIEWS.MAP ? 'active' : ''}`}>
            <button onClick={() => handleViewChange(VIEWS.MAP)}>
              Map View
            </button>
          </li>
          
          <li className={`nav-item ${currentView === VIEWS.DATA ? 'active' : ''}`}>
            <button 
              onClick={() => toggleSection(VIEWS.DATA)}
              className="dropdown-toggle"
            >
              Data View {expandedSection === VIEWS.DATA ? '▼' : '►'}
            </button>
            
            {expandedSection === VIEWS.DATA && (
              <ul className="subnav-list">
                <li 
                  className={`subnav-item ${currentSubView === DATA_SUBVIEWS.ARTICLE_STATS ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentView(VIEWS.DATA);
                    setCurrentSubView(DATA_SUBVIEWS.ARTICLE_STATS);
                  }}
                >
                  Article Statistics
                </li>
                <li 
                  className={`subnav-item ${currentSubView === DATA_SUBVIEWS.FEEDBACK_STATS ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentView(VIEWS.DATA);
                    setCurrentSubView(DATA_SUBVIEWS.FEEDBACK_STATS);
                  }}
                >
                  Feedback Analytics
                </li>
                <li 
                  className={`subnav-item ${currentSubView === DATA_SUBVIEWS.SURVEY_STATS ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentView(VIEWS.DATA);
                    setCurrentSubView(DATA_SUBVIEWS.SURVEY_STATS);
                  }}
                >
                  Survey Reports
                </li>
                <li 
                  className={`subnav-item ${currentSubView === DATA_SUBVIEWS.ADMIN ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentView(VIEWS.DATA);
                    setCurrentSubView(DATA_SUBVIEWS.ADMIN);
                  }}
                >
                  Dev/Administrator View
                </li>
              </ul>
            )}
          </li>
          
          <li className={`nav-item ${currentView === VIEWS.COMMUNITY ? 'active' : ''}`}>
            <button onClick={() => handleViewChange(VIEWS.COMMUNITY)}>
              Community View
            </button>
          </li>
          
          <li className={`nav-item ${currentView === VIEWS.SEARCH ? 'active' : ''}`}>
            <button onClick={() => handleViewChange(VIEWS.SEARCH)}>
              Search View
            </button>
          </li>
        </ul>
      </nav>

      {/* Only show controls when in Category View (original functionality) */}
      {currentView === VIEWS.CATEGORY && (
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
                {source === 'all' ? 'All Sources' : source.replace(/_/g, ' ')}
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
                {category === 'all' ? 'All Categories' : category.replace(/_/g, ' ')}
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
      )}
    </div>
  );
};

export default Sidebar;