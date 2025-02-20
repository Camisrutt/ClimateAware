import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const fetchArticles = async () => {
    try {
        setLoading(true);
        console.log('Fetching articles...');
        
        const response = await fetch('http://localhost:3001/api/articles', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        console.log('Response received:', response);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseData = await response.json();
        console.log('Data received:', responseData);
        
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

  useEffect(() => {
    fetchArticles();
  }, []);

  const sources = ['all', ...new Set(articles.map(article => article.source))];
  const categories = ['all', ...new Set(articles.map(article => article.category))];

  const filteredArticles = articles.filter(article => 
    (selectedSource === 'all' || article.source === selectedSource) &&
    (selectedCategory === 'all' || article.category === selectedCategory)
  );

  return (
    <div className="app">
        <div className="sidebar">
            <header className="header">
                <h1>Climate Change News Tracker</h1>
                <p>Aggregating important climate change articles from trusted sources</p>
            </header>

            <div className="controls">
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

                <button onClick={fetchArticles} className="refresh-button">
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
                    <article key={index} className="article-card">
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