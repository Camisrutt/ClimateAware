// db.js - Database connection and query functions
const mysql = require('mysql2/promise');

// Database connection configuration
const dbConfig = {
  host: 'db-mysql-camisrutt-main-do-user-18546521-0.l.db.ondigitalocean.com',
  port: 25060,
  user: 'doadmin',
  password: process.env.DB_PASSWORD,
  database: 'climate_feed_monitor',
  ssl: {
    required: true,
    rejectUnauthorized: false  // Add this line to accept self-signed certificates
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
// In db.js - modify the getArticles function
async function getArticles(filters = {}) {
  try {
    let query = `
      SELECT * FROM articles 
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Debug incoming filters
    console.log('Article filters:', JSON.stringify(filters));

    // Add filters if provided
    if (filters.contentCategory && filters.contentCategory !== 'all') {
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
    
    // Add sorting
    query += ` ORDER BY publication_date DESC`;
    
    // CHANGE THIS SECTION - Use direct integer instead of parameter for LIMIT
    if (filters.limit) {
      // Use direct value instead of parameter
      query += ` LIMIT ${parseInt(filters.limit)}`;
    }
    
    console.log('SQL Query:', query);
    console.log('Query Params:', queryParams);
    
    // Now execute without the limit as a parameter
    const [rows] = await pool.execute(query, queryParams);
    console.log(`Found ${rows.length} articles`);
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

// Submit survey
async function submitSurvey(data) {
  try {
    const [result] = await pool.execute(
      'INSERT INTO user_surveys (background, other_background, interest, affiliation, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
      [data.background, data.otherBackground, data.interest, data.affiliation, data.ip_address, data.user_agent]
    );
    return { success: true, id: result.insertId };
  } catch (err) {
    console.error('Error submitting survey:', err);
    throw err;
  }
}

// Submit feedback
async function submitFeedback(data) {
  try {
    const [result] = await pool.execute(
      'INSERT INTO user_feedback (feedback_type, message, ip_address, user_agent) VALUES (?, ?, ?, ?)',
      [data.type, data.message, data.ip_address, data.user_agent]
    );
    return { success: true, id: result.insertId };
  } catch (err) {
    console.error('Error submitting feedback:', err);
    throw err;
  }
}

// Get survey statistics
async function getSurveyStats() {
  try {
    const [backgroundStats] = await pool.execute(
      'SELECT background, COUNT(*) as count FROM user_surveys GROUP BY background ORDER BY count DESC'
    );
    
    const [affiliationStats] = await pool.execute(
      'SELECT affiliation, COUNT(*) as count FROM user_surveys GROUP BY affiliation ORDER BY count DESC'
    );
    
    return {
      backgroundStats,
      affiliationStats,
      totalResponses: backgroundStats.reduce((acc, stat) => acc + stat.count, 0)
    };
  } catch (err) {
    console.error('Error getting survey stats:', err);
    throw err;
  }
}

// Get feedback statistics
async function getFeedbackStats() {
  try {
    const [typeStats] = await pool.execute(
      'SELECT feedback_type, COUNT(*) as count FROM user_feedback GROUP BY feedback_type ORDER BY count DESC'
    );
    
    const [recentFeedback] = await pool.execute(
      'SELECT * FROM user_feedback ORDER BY created_at DESC LIMIT 50'
    );
    
    return {
      typeStats,
      recentFeedback,
      totalFeedback: typeStats.reduce((acc, stat) => acc + stat.count, 0)
    };
  } catch (err) {
    console.error('Error getting feedback stats:', err);
    throw err;
  }
}

// Update module exports
module.exports = {
  testConnection,
  recordFeedAttempt,
  insertArticle,
  getAllFeedsHealth,
  getUnhealthyFeeds,
  getArticles,
  getArticleCountsByCategory,
  fetchAndStoreArticles,
  submitSurvey,           // New export
  submitFeedback,         // New export 
  getSurveyStats,         // New export
  getFeedbackStats        // New export
};
