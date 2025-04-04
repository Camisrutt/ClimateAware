// db.js - Database connection and query functions
const mysql = require('mysql2/promise');

// Database connection configuration
const dbConfig = {
  host: 'db-mysql-camisrutt-main-do-user-18546521-0.l.db.ondigitalocean.com',
  port: 25060,
  user: 'doadmin',
  password: process.env.DB_PASSWORD, // Set this in your environment variables
  database: 'climate_feed_monitor',
  ssl: {
    required: true
  }
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

// Test the connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database successfully!');
    connection.release();
    return true;
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    return false;
  }
}

// Record a feed fetch attempt
async function recordFeedAttempt(feedUrl, success, responseTime, articleCount, error = null) {
  try {
    await pool.execute(
      'CALL record_feed_attempt(?, ?, ?, ?, ?)',
      [feedUrl, success, responseTime, articleCount, error ? error.message || String(error) : null]
    );
    return true;
  } catch (err) {
    console.error(`Error recording feed attempt for ${feedUrl}:`, err);
    return false;
  }
}

// Insert an article if it doesn't exist
async function insertArticle(article) {
  try {
    const {
      title,
      source,
      sourceUrl,
      category,
      contentCategory,
      date,
      summary,
      url,
      publisher
    } = article;
    
    await pool.execute(
      'CALL insert_article_if_not_exists(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        title,
        source,
        sourceUrl,
        category,
        contentCategory,
        new Date(date), // Convert to proper date format
        summary,
        url,
        publisher
      ]
    );
    return true;
  } catch (err) {
    console.error(`Error inserting article ${article.title}:`, err);
    return false;
  }
}

// Get all feed health metrics
async function getAllFeedsHealth() {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        fs.source_name,
        fh.feed_url,
        fh.success_rate,
        fh.last_successful,
        fh.last_check,
        fh.average_response_time,
        fh.total_attempts,
        get_recent_errors(fh.feed_url, 3) as recent_errors
      FROM feed_health fh
      JOIN feed_sources fs ON fh.feed_url = fs.feed_url
    `);
    
    // Format the data to match your current structure
    const healthData = {};
    rows.forEach(row => {
      healthData[row.feed_url] = {
        successRate: row.success_rate,
        lastSuccessful: row.last_successful,
        lastCheck: row.last_check,
        averageResponseTime: Math.round(row.average_response_time),
        totalAttempts: row.total_attempts,
        recentErrors: row.recent_errors ? row.recent_errors.split('\n').filter(e => e.trim() !== '') : []
      };
    });
    
    return healthData;
  } catch (err) {
    console.error('Error getting feed health metrics:', err);
    return {};
  }
}

// Get unhealthy feeds
async function getUnhealthyFeeds() {
  try {
    const [rows] = await pool.execute(`
      SELECT * FROM unhealthy_feeds
    `);
    
    return rows.map(row => ({
      url: row.feed_url,
      health: {
        successRate: parseFloat(row.success_rate),
        lastSuccessful: row.last_successful,
        recentErrors: row.get_recent_errors ? row.get_recent_errors.split('\n').filter(e => e.trim() !== '') : []
      }
    }));
  } catch (err) {
    console.error('Error getting unhealthy feeds:', err);
    return [];
  }
}

// Get articles with optional filters
async function getArticles(filters = {}) {
  try {
    let query = `
      SELECT * FROM articles 
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Add filters if provided
    if (filters.contentCategory) {
      query += ` AND content_category = ?`;
      queryParams.push(filters.contentCategory);
    }
    
    if (filters.source) {
      query += ` AND source = ?`;
      queryParams.push(filters.source);
    }
    
    // Add date range if provided
    if (filters.startDate) {
      query += ` AND publication_date >= ?`;
      queryParams.push(new Date(filters.startDate));
    }
    
    if (filters.endDate) {
      query += ` AND publication_date <= ?`;
      queryParams.push(new Date(filters.endDate));
    }
    
    // Add sorting and limit
    query += ` ORDER BY publication_date DESC`;
    
    if (filters.limit) {
      query += ` LIMIT ?`;
      queryParams.push(parseInt(filters.limit));
    }
    
    const [rows] = await pool.execute(query, queryParams);
    return rows;
  } catch (err) {
    console.error('Error getting articles:', err);
    return [];
  }
}

// Get article counts by category
async function getArticleCountsByCategory() {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        content_category,
        COUNT(*) as count
      FROM articles
      GROUP BY content_category
    `);
    
    const counts = {
      climate_primary: 0,
      climate_related: 0,
      science_other: 0,
      uncategorized: 0
    };
    
    rows.forEach(row => {
      counts[row.content_category] = row.count;
    });
    
    return counts;
  } catch (err) {
    console.error('Error getting article counts:', err);
    return {
      climate_primary: 0,
      climate_related: 0,
      science_other: 0,
      uncategorized: 0
    };
  }
}

// Modified fetchArticles function to store in database
async function fetchAndStoreArticles() {
  try {
    console.log('Fetching and storing articles...');
    const articles = await fetchArticles(); // Your existing function
    
    // Store articles in database
    let stored = 0;
    for (const article of articles.all) {
      const success = await insertArticle(article);
      if (success) stored++;
    }
    
    console.log(`Stored ${stored} new articles in database`);
    
    // Get article counts by category
    const counts = await getArticleCountsByCategory();
    
    return {
      success: true,
      totalStored: stored,
      articlesByCategory: counts
    };
  } catch (error) {
    console.error('Error in fetchAndStoreArticles:', error);
    return {
      success: false,
      error: 'Failed to fetch and store articles',
      details: error.message || 'Unknown error'
    };
  }
}

module.exports = {
  testConnection,
  recordFeedAttempt,
  insertArticle,
  getAllFeedsHealth,
  getUnhealthyFeeds,
  getArticles,
  getArticleCountsByCategory,
  fetchAndStoreArticles
};
