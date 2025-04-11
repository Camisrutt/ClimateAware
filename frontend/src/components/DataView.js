import React, { useState, useEffect } from 'react';
import './DataView.css';

// Constants for subviews
const DATA_SUBVIEWS = {
  ARTICLE_STATS: 'article_stats',
  FEEDBACK_STATS: 'feedback_stats',
  SURVEY_STATS: 'survey_stats',
  ADMIN: 'admin'
};

const DataView = ({ currentSubView }) => {
  const [articleStats, setArticleStats] = useState(null);
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [surveyStats, setSurveyStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [adminApiKey, setAdminApiKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Fetch article statistics
  const fetchArticleStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use existing endpoint to get article counts
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://geog-web-app-fiddr.ondigitalocean.app'}/api/articles?limit=1`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract relevant stats
      setArticleStats({
        counts: data.metadata?.articlesByCategory || {},
        totalArticles: data.metadata?.totalArticles || 0,
        fetchTime: data.metadata?.fetchTime || new Date().toISOString(),
        feedHealth: data.metadata?.feedHealth || {}
      });
    } catch (error) {
      console.error('Error fetching article stats:', error);
      setError('Failed to load article statistics');
    } finally {
      setLoading(false);
    }
  };

  // Fetch feedback statistics (requires admin API key)
  const fetchFeedbackStats = async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://geog-web-app-fiddr.ondigitalocean.app'}/api/feedback-stats`, {
        headers: {
          'x-api-key': adminApiKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      setFeedbackStats(data.data);
    } catch (error) {
      console.error('Error fetching feedback stats:', error);
      setError('Failed to load feedback statistics. Authentication may be required.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch survey statistics (requires admin API key)
  const fetchSurveyStats = async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://geog-web-app-fiddr.ondigitalocean.app'}/api/survey-stats`, {
        headers: {
          'x-api-key': adminApiKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      setSurveyStats(data.data);
    } catch (error) {
      console.error('Error fetching survey stats:', error);
      setError('Failed to load survey statistics. Authentication may be required.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch admin statistics
  const fetchAdminStats = async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://geog-web-app-fiddr.ondigitalocean.app'}/api/debug`, {
        headers: {
          'x-api-key': adminApiKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      setAdminStats(data);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      setError('Failed to load administrator data. Authentication may be required.');
    } finally {
      setLoading(false);
    }
  };

  // Handle API key submission
  const handleApiKeySubmit = (e) => {
    e.preventDefault();
    if (adminApiKey.trim() !== '') {
      setIsAuthenticated(true);
      // Fetch protected data
      if (currentSubView === DATA_SUBVIEWS.FEEDBACK_STATS) {
        fetchFeedbackStats();
      } else if (currentSubView === DATA_SUBVIEWS.SURVEY_STATS) {
        fetchSurveyStats();
      } else if (currentSubView === DATA_SUBVIEWS.ADMIN) {
        fetchAdminStats();
      }
    }
  };

  // Fetch data based on current subview
  useEffect(() => {
    if (currentSubView === DATA_SUBVIEWS.ARTICLE_STATS) {
      fetchArticleStats();
    } else if (currentSubView === DATA_SUBVIEWS.FEEDBACK_STATS && isAuthenticated) {
      fetchFeedbackStats();
    } else if (currentSubView === DATA_SUBVIEWS.SURVEY_STATS && isAuthenticated) {
      fetchSurveyStats();
    } else if (currentSubView === DATA_SUBVIEWS.ADMIN && isAuthenticated) {
      fetchAdminStats();
    }
  }, [currentSubView, isAuthenticated]);

  // Render authentication form for protected views
  const renderAuthForm = () => (
    <div className="auth-container">
      <h3>Admin Authentication Required</h3>
      <p>Please enter your API key to access this data.</p>
      <form onSubmit={handleApiKeySubmit} className="auth-form">
        <input
          type="password"
          value={adminApiKey}
          onChange={(e) => setAdminApiKey(e.target.value)}
          placeholder="Enter API Key"
          required
        />
        <button type="submit">Authenticate</button>
      </form>
    </div>
  );

  // Render Article Statistics
  const renderArticleStats = () => {
    if (!articleStats) return <div>No article data available</div>;
    
    return (
      <div className="article-stats">
        <div className="stats-card">
          <h3>Article Counts by Category</h3>
          <div className="stats-grid">
            {Object.entries(articleStats.counts).map(([category, count]) => (
              <div key={category} className="stat-item">
                <div className="stat-label">{category.replace(/_/g, ' ')}</div>
                <div className="stat-value">{count}</div>
              </div>
            ))}
            <div className="stat-item highlight">
              <div className="stat-label">Total Articles</div>
              <div className="stat-value">{articleStats.totalArticles}</div>
            </div>
          </div>
        </div>
        
        <div className="stats-card">
          <h3>Feed Health</h3>
          <div className="feed-health-grid">
            {Object.entries(articleStats.feedHealth).map(([feedUrl, health]) => {
              // Extract domain from URL for cleaner display
              const domain = new URL(feedUrl).hostname;
              
              return (
                <div key={feedUrl} className="feed-health-item">
                  <div className="feed-domain">{domain}</div>
                  <div className="feed-metrics">
                    <div className={`success-rate ${parseFloat(health.successRate) < 70 ? 'warning' : ''}`}>
                      {health.successRate}% success
                    </div>
                    <div className="response-time">
                      Avg: {health.averageResponseTime}ms
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Render Feedback Statistics
  const renderFeedbackStats = () => {
    if (!isAuthenticated) return renderAuthForm();
    if (!feedbackStats) return <div>No feedback data available</div>;
    
    return (
      <div className="feedback-stats">
        <div className="stats-card">
          <h3>Feedback by Type</h3>
          <div className="stats-grid">
            {feedbackStats.typeStats.map(stat => (
              <div key={stat.feedback_type} className="stat-item">
                <div className="stat-label">{stat.feedback_type}</div>
                <div className="stat-value">{stat.count}</div>
              </div>
            ))}
            <div className="stat-item highlight">
              <div className="stat-label">Total Feedback</div>
              <div className="stat-value">{feedbackStats.totalFeedback}</div>
            </div>
          </div>
        </div>
        
        <div className="stats-card">
          <h3>Recent Feedback</h3>
          <div className="feedback-list">
            {feedbackStats.recentFeedback.map(feedback => (
              <div key={feedback.id} className="feedback-item">
                <div className="feedback-header">
                  <span className="feedback-type">{feedback.feedback_type}</span>
                  <span className="feedback-date">
                    {new Date(feedback.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="feedback-message">{feedback.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render Survey Statistics
  const renderSurveyStats = () => {
    if (!isAuthenticated) return renderAuthForm();
    if (!surveyStats) return <div>No survey data available</div>;
    
    return (
      <div className="survey-stats">
        <div className="stats-card">
          <h3>Respondent Backgrounds</h3>
          <div className="stats-grid">
            {surveyStats.backgroundStats.map(stat => (
              <div key={stat.background} className="stat-item">
                <div className="stat-label">{stat.background.replace(/-/g, ' ')}</div>
                <div className="stat-value">{stat.count}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="stats-card">
          <h3>Respondent Affiliations</h3>
          <div className="stats-grid">
            {surveyStats.affiliationStats.map(stat => (
              <div key={stat.affiliation} className="stat-item">
                <div className="stat-label">{stat.affiliation.replace(/-/g, ' ')}</div>
                <div className="stat-value">{stat.count}</div>
              </div>
            ))}
            <div className="stat-item highlight">
              <div className="stat-label">Total Responses</div>
              <div className="stat-value">{surveyStats.totalResponses}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Admin Statistics
  const renderAdminStats = () => {
    if (!isAuthenticated) return renderAuthForm();
    if (!adminStats) return <div>No administrator data available</div>;
    
    return (
      <div className="admin-stats">
        <div className="stats-card">
          <h3>System Status</h3>
          <div className="admin-grid">
            <div className="admin-item">
              <div className="admin-label">Database Connection</div>
              <div className={`admin-value ${adminStats.dbConnected ? 'success' : 'error'}`}>
                {adminStats.dbConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
            <div className="admin-item">
              <div className="admin-label">Environment</div>
              <div className="admin-value">{adminStats.environment.nodeEnv || 'Not set'}</div>
            </div>
            <div className="admin-item">
              <div className="admin-label">Server Port</div>
              <div className="admin-value">{adminStats.environment.port}</div>
            </div>
          </div>
        </div>
        
        <div className="stats-card">
          <h3>Sample Articles</h3>
          <div className="sample-articles">
            {adminStats.sampleArticles && adminStats.sampleArticles.map((article, index) => (
              <div key={index} className="sample-article">
                <div className="article-title">{article.title}</div>
                <div className="article-meta">
                  <span className="article-source">{article.source}</span>
                  <span className="article-date">
                    {new Date(article.publication_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Main render function
  return (
    <div className="data-view-container">
      <h2 className="view-title">
        {currentSubView === DATA_SUBVIEWS.ARTICLE_STATS && 'Article Statistics'}
        {currentSubView === DATA_SUBVIEWS.FEEDBACK_STATS && 'Feedback Analytics'}
        {currentSubView === DATA_SUBVIEWS.SURVEY_STATS && 'Survey Reports'}
        {currentSubView === DATA_SUBVIEWS.ADMIN && 'Developer Administration'}
        {!currentSubView && 'Data Visualization'}
      </h2>
      
      {loading && <div className="loading">Loading data...</div>}
      
      {error && <div className="error">{error}</div>}
      
      {!loading && !error && (
        <>
          {!currentSubView && (
            <div className="select-subview-message">
              Please select a data category from the sidebar to view statistics
            </div>
          )}
          
          {currentSubView === DATA_SUBVIEWS.ARTICLE_STATS && renderArticleStats()}
          {currentSubView === DATA_SUBVIEWS.FEEDBACK_STATS && renderFeedbackStats()}
          {currentSubView === DATA_SUBVIEWS.SURVEY_STATS && renderSurveyStats()}
          {currentSubView === DATA_SUBVIEWS.ADMIN && renderAdminStats()}
        </>
      )}
    </div>
  );
};

export default DataView;