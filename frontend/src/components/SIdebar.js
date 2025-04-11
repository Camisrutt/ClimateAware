import React from 'react';
import './Sidebar.css';
import GlobeLogo from '../components/Images/Globev1.png'; // Adjust path as needed
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
  getArticles 
}) => {
  return (
    <div className="sidebar">
      <div className="globe-container">
        <img src={GlobeLogo} alt="Globe" className="globe-image" />
      </div>
      
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
  );
};

export default Sidebar;