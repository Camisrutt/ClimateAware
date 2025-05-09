// Import required packages
const express = require('express');  // Web server framework
const cors = require('cors');        // Cross-Origin Resource Sharing middleware
const Parser = require('rss-parser'); // RSS feed parser

require('dotenv').config();
const db = require('./db'); // Use the db.js file from the second artifact

// Test database connection on startup
(async function() {
  const connected = await db.testConnection();
  if (!connected) {
    console.error("Could not connect to database. Check your credentials.");
    // Decide whether to exit or continue without DB
  }
})();
/**
 * FeedMonitor Class
 * Tracks the health and performance of RSS feeds
 * Maintains metrics like success rates, response times, and error history
 */
class FeedMonitor {
    constructor() {
        // Initialize tracking maps for various metrics
        this.healthMetrics = new Map();  // Stores detailed health data for each feed
        this.lastCheck = new Map();      // Tracks when each feed was last checked
        this.successRates = new Map();   // Maintains success percentage for each feed
    }

    /**
     * Records the results of an attempt to fetch a feed
     * @param {string} feedUrl - The URL of the RSS feed
     * @param {boolean} success - Whether the fetch was successful
     * @param {number} responseTime - How long the request took
     * @param {number} articleCount - Number of articles fetched
     * @param {Error} error - Error object if fetch failed
     */
    recordAttempt(feedUrl, success, responseTime, articleCount, error = null) {
        // Initialize metrics for new feeds
        if (!this.healthMetrics.has(feedUrl)) {
            this.healthMetrics.set(feedUrl, {
                totalAttempts: 0,
                successfulAttempts: 0,
                failedAttempts: 0,
                lastSuccessful: null,
                averageResponseTime: 0,
                errors: [],
                articleCounts: []
            });
        }

        const metrics = this.healthMetrics.get(feedUrl);
        metrics.totalAttempts++;
        
        // Update success/failure metrics
        if (success) {
            metrics.successfulAttempts++;
            metrics.lastSuccessful = new Date().toISOString();
            metrics.articleCounts.push(articleCount);
        } else {
            metrics.failedAttempts++;
            if (error) {
                metrics.errors.push({
                    timestamp: new Date().toISOString(),
                    error: error.message || String(error)
                });
            }
        }

        // Calculate running average of response time
        metrics.averageResponseTime = 
            (metrics.averageResponseTime * (metrics.totalAttempts - 1) + responseTime) / 
            metrics.totalAttempts;

        this.lastCheck.set(feedUrl, new Date().toISOString());
        this.updateSuccessRate(feedUrl);
    }

    // Update success rate percentage for a feed
    updateSuccessRate(feedUrl) {
        const metrics = this.healthMetrics.get(feedUrl);
        if (metrics) {
            const successRate = (metrics.successfulAttempts / metrics.totalAttempts) * 100;
            this.successRates.set(feedUrl, successRate.toFixed(2));
        }
    }

    // Get health metrics for all feeds
    getAllFeedsHealth() {
        const health = {};
        this.healthMetrics.forEach((metrics, feedUrl) => {
            health[feedUrl] = {
                successRate: this.successRates.get(feedUrl),
                lastSuccessful: metrics.lastSuccessful,
                lastCheck: this.lastCheck.get(feedUrl),
                averageResponseTime: Math.round(metrics.averageResponseTime),
                totalAttempts: metrics.totalAttempts,
                recentErrors: metrics.errors.slice(-3)
            };
        });
        return health;
    }

    // Get feeds with success rate below 70%
    getUnhealthyFeeds() {
        const unhealthy = [];
        this.healthMetrics.forEach((metrics, feedUrl) => {
            const successRate = parseFloat(this.successRates.get(feedUrl));
            if (successRate < 70) {
                unhealthy.push({
                    url: feedUrl,
                    health: {
                        successRate,
                        lastSuccessful: metrics.lastSuccessful,
                        recentErrors: metrics.errors.slice(-3)
                    }
                });
            }
        });
        return unhealthy;
    }
}

// Initialize our monitoring and parsing tools
const feedMonitor = new FeedMonitor();
const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    timeout: 10000 // Added timeout for better handling on cloud platforms
});

// Initialize Express application
const app = express();

// Configure CORS middleware - UPDATED FOR DIGITAL OCEAN
const allowedOrigins = [
  'http://localhost:3000',  // Local development
  'https://ccarticle.org',   // Production frontend URL || Main frontend URL
  'https://frontend-app-gcowc.ondigitalocean.app/', // Digital Ocean App Platform frontend URL (set this in environment variables)
  process.env.FRONTEND_URL, // Digital Ocean App Platform frontend URL (set this in environment variables)
  /\.ondigitalocean\.app$/, // Allow all DigitalOcean App Platform URLs
];

app.use(cors({
  // origin: '*',
  origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin is allowed
      const isAllowed = allowedOrigins.some(allowedOrigin => {
          if (allowedOrigin instanceof RegExp) {
              return allowedOrigin.test(origin);
          }
          return allowedOrigin === origin;
      });
      
      if (isAllowed) {
          return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true
}));

// Add JSON body parser
app.use(express.json());

// Constants for content categories and keywords
const CONTENT_CATEGORIES = {
  CLIMATE_PRIMARY: 'climate_primary',      // Directly about climate change
  CLIMATE_RELATED: 'climate_related',      // Environmental/weather/related topics
  SCIENCE_OTHER: 'science_other',          // Other science news
  UNCATEGORIZED: 'uncategorized'
};

//Filter Functionality & Classification and Duplicate
function classifyArticle(article) {
  const contentToCheck = `${article.title} ${article.summary}`.toLowerCase();
  
  // Check for primary climate keywords
  if (CLIMATE_KEYWORDS.primary.some(keyword => contentToCheck.includes(keyword))) {
    return CONTENT_CATEGORIES.CLIMATE_PRIMARY;
  }
  
  // Check for related topics
  if (CLIMATE_KEYWORDS.related.some(keyword => contentToCheck.includes(keyword))) {
    return CONTENT_CATEGORIES.CLIMATE_RELATED;
  }
  
  // If from specific climate-focused sources, mark as related
  if (['IPCC', 'UN_Climate'].includes(article.source)) {
    return CONTENT_CATEGORIES.CLIMATE_RELATED;
  }
  
  return CONTENT_CATEGORIES.SCIENCE_OTHER;
}

function isDuplicate(article, existingArticles) {
  return existingArticles.some(existing => {
    // Check for title similarity
    const titleSimilarity = stringSimilarity(article.title, existing.title);
    
    // Check for close publication dates (within 24 hours)
    const dateClose = Math.abs(new Date(article.date) - new Date(existing.date)) < 86400000;
    
    return titleSimilarity > 0.8 && dateClose;
  });
}

function stringSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  return s1 === s2 ? 1 : 0;  // Simple exact match for now
}

const CLIMATE_KEYWORDS = {
  primary: [
    'climate change', 'global warming', 'greenhouse gas', 'carbon emissions',
    'sea level rise', 'climate crisis', 'climate action', 'paris agreement',
    'carbon footprint', 'climate science'
  ],
  related: [
    'weather pattern', 'extreme weather', 'drought', 'flood', 'wildfire',
    'hurricane', 'environmental', 'renewable energy', 'sustainability',
    'biodiversity', 'ecosystem', 'conservation'
  ]
};

// Define our news feed sources
const NEWS_FEEDS = {
    // Institutional Sources & Weather Services
    NASA: {
        urls: [
            'https://www.nasa.gov/rss/dyn/breaking_news.rss',
            'https://science.nasa.gov/climate-change/stories/',
            'https://www.nasa.gov/news-release/feed/',
            'https://earthobservatory.nasa.gov/feeds/natural-hazards.rss'
        ],
        categories: ['Satellite Data', 'Climate Research', 'Environmental Monitoring']
    },
    NOAA: {
        urls: [
            'https://www.ncei.noaa.gov/access/monitoring/monthly-report/rss.xml'
        ],
        categories: ['Weather Patterns', 'Ocean Data', 'Atmospheric Research']
    },
    ClimateWeatherGov: {
        urls: [
            'https://www.climate.gov/feeds/news-features/climatetech.rss',
            'https://www.climate.gov/feeds/news-features/climateand.rss',
            'https://www.climate.gov/feeds/news-features/understandingclimate.rss',
            'https://www.climate.gov/feeds/news-features/casestudies.rss',
            'https://www.weather.gov/wrn/xml/rss_alert.xml'
        ],
        categories: ['Weather Patterns', 'Ocean Data', 'Atmospheric Research']
    },
    UN_Climate: {
        urls: [
            'https://news.un.org/feed/subscribe/en/news/topic/migrants-and-refugees/feed/rss.xml',
            'https://news.un.org/feed/subscribe/en/news/topic/climate-change/feed/rss.xml'
        ],
        categories: ['Global Policy', 'International Action', 'Climate Agreements']
    },
    BBC_Climate: {
        urls: [
            'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'  // Science & Environment  
        ],
        categories: ['Climate News', 'Environmental Reports', 'Science Coverage']
    },
    // Added: Community and Grassroots Sources
    Community_Climate: {
        urls: [
            'https://350.org/feed/',
            'https://climatejusticealliance.org/feed/',
            'https://feeds.feedburner.com/ConservationInternationalBlog'
        ],
        categories: ['Community Action', 'Climate Justice', 'Local Initiatives']
    },
    // Added: Indigenous Knowledge Sources
    Indigenous_Climate: {
        urls: [
            // Indigenous Climate Action
            'https://indianz.com/rss/news.xml'
        ],
        categories: ['Traditional Knowledge', 'Indigenous Perspectives', 'Land Management']
    }
};

/**
 * Fetches a feed with retry capability
 * @param {string} url - The URL to fetch
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise} - The parsed feed data
 */
async function fetchFeedWithRetry(url, maxRetries = 2) {
    const startTime = Date.now();
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const feed = await parser.parseURL(url);
            const responseTime = Date.now() - startTime;
            
            // Update local monitor
            feedMonitor.recordAttempt(url, true, responseTime, feed.items ? feed.items.length : 0);
            
            // Update database 
            await db.recordFeedAttempt(url, true, responseTime, feed.items ? feed.items.length : 0);
            
            return feed;
        } catch (error) {
            lastError = error;
            const responseTime = Date.now() - startTime;
            
            // Update local monitor
            feedMonitor.recordAttempt(url, false, responseTime, 0, error);
            
            // Update database
            await db.recordFeedAttempt(url, false, responseTime, 0, error);
            
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
    }
    throw lastError;
}

/**
 * Main function to fetch articles from all feeds
 * Processes and normalizes the data from different sources
 */
async function fetchArticles() {
  try {
      console.log('Attempting to fetch feeds...');
      let allArticles = [];

      for (const [source, sourceData] of Object.entries(NEWS_FEEDS)) {
          for (const feedUrl of sourceData.urls) {
              try {
                  console.log(`Trying feed from ${source}: ${feedUrl}`);
                  const feed = await fetchFeedWithRetry(feedUrl);
                  
                  if (feed && feed.items) {
                      const articles = feed.items.map(item => {
                          const article = {
                              title: item.title || 'No title available',
                              source: source,
                              sourceUrl: feedUrl,
                              category: sourceData.categories[0],
                              date: item.pubDate || new Date().toISOString(),
                              summary: item.contentSnippet || item.content || item.description || 'No summary available',
                              url: item.link || feedUrl,
                              publisher: source
                          };
                          
                          // Add content category
                          article.contentCategory = classifyArticle(article);
                          return article;
                      });

                      // Add non-duplicate articles
                      for (const article of articles) {
                          if (!isDuplicate(article, allArticles)) {
                              allArticles.push(article);
                          }
                      }
                      console.log(`Successfully fetched ${articles.length} articles from ${source}`);
                  }
              } catch (error) {
                  console.error(`Error fetching from ${source} - ${feedUrl}:`, error);
              }
          }
          // Add at the end of your fetchArticles function
// After processing articles
for (const article of allArticles) {
    await db.insertArticle(article);
}
      }

      // Sort articles by date (newest first)
      allArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Group by category
      const groupedArticles = {
          climate_primary: allArticles.filter(a => a.contentCategory === CONTENT_CATEGORIES.CLIMATE_PRIMARY),
          climate_related: allArticles.filter(a => a.contentCategory === CONTENT_CATEGORIES.CLIMATE_RELATED),
          science_other: allArticles.filter(a => a.contentCategory === CONTENT_CATEGORIES.SCIENCE_OTHER),
          all: allArticles
      };
      
      console.log(`Total articles fetched: ${allArticles.length}`);
      return groupedArticles;
  } catch (error) {
      console.error('Error in fetchArticles:', error);
      return {
          climate_primary: [],
          climate_related: [],
          science_other: [],
          all: []
      };
  }
}

// New health check endpoint for DigitalOcean App Platform
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Climate Feed API is running',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes

// Get all articles with health metrics
app.get('/api/articles', async (req, res) => {
    try {
        // Get filters from query parameters
        const filters = {
            contentCategory: req.query.contentCategory,
            source: req.query.source,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            limit: req.query.limit || 100
        };
        console.log("Received filter request:", filters);
        
        // Get articles from database
        const articles = await db.getArticles(filters);
        console.log(`Found ${articles.length} articles with filters:`, filters);
        
        // Get health metrics and counts
        const healthMetrics = await db.getAllFeedsHealth();
        const counts = await db.getArticleCountsByCategory();
        
        res.json({
            success: true,
            data: articles,
            metadata: {
                totalArticles: articles.length,
                articlesByCategory: counts,
                fetchTime: new Date().toISOString(),
                feedHealth: healthMetrics
            }
        });
    } catch (error) {
        console.error('Error in /api/articles:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch articles',
            details: error.message || 'Unknown error'
        });
    }
});

// Get health metrics for all feeds
app.get('/api/feed-health', (req, res) => {
    try {
        const health = feedMonitor.getAllFeedsHealth();
        res.json({
            success: true,
            data: health,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in /api/feed-health:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get feed health',
            details: error.message || 'Unknown error'
        });
    }
});

// Get list of unhealthy feeds
app.get('/api/unhealthy-feeds', (req, res) => {
    try {
        const unhealthyFeeds = feedMonitor.getUnhealthyFeeds();
        res.json({
            success: true,
            data: unhealthyFeeds,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in /api/unhealthy-feeds:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get unhealthy feeds',
            details: error.message || 'Unknown error'
        });
    }
});

// Test route to verify server is running - also useful for health checks
app.get('/test', (req, res) => {
    res.json({ message: 'Backend server is running!' });
});

app.get('/api/debug', async (req, res) => {
  try {
    // Test database connection
    const connected = await db.testConnection();
    
    // Get article counts
    const counts = await db.getArticleCountsByCategory();
    
    // Get a sample of articles
    const sampleArticles = await db.getArticles({ limit: 5 });
    
    res.json({
      success: true,
      dbConnected: connected,
      articleCounts: counts,
      sampleArticles,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT || 8080
      }
    });
  } catch (error) {
    console.error('Debug route error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
});

// Submit user survey
// Replace these survey/feedback endpoints in server.js
app.post('/api/survey', async (req, res) => {
  try {
    const { background, otherBackground, interest, affiliation } = req.body;
    
    // Basic validation
    if (!background) {
      return res.status(400).json({
        success: false,
        error: 'Background is required'
      });
    }
    
    // Get IP and user agent for analytics - with better error handling
    const ip_address = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const user_agent = req.headers['user-agent'] || '';
    
    console.log('Survey data:', { background, otherBackground, interest, affiliation, ip_address, user_agent });
    
    // Use db module to insert
    const result = await db.submitSurvey({
      background,
      otherBackground: otherBackground || null,
      interest: interest || '',
      affiliation: affiliation || '',
      ip_address,
      user_agent
    });
    
    res.json({
      success: true,
      message: 'Survey submitted successfully',
      id: result.id
    });
  } catch (error) {
    console.error('Error submitting survey:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit survey',
      details: error.message || 'Unknown error'
    });
  }
});

// Submit user feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const { type, message } = req.body;
    
    // Basic validation
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Feedback message is required'
      });
    }
    
    // Get IP and user agent for analytics
    const ip_address = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const user_agent = req.headers['user-agent'] || '';
    
// Use db module to insert
const result = await db.submitFeedback({
  type,
  message,
  ip_address,
  user_agent
});

res.json({
  success: true,
  message: 'Feedback submitted successfully',
  id: result.id
});
} catch (error) {
console.error('Error submitting feedback:', error);
res.status(500).json({
  success: false,
  error: 'Failed to submit feedback',
  details: process.env.NODE_ENV === 'production' ? 'Server error' : error.message
});
}
});

// Get survey statistics - FIXED VERSION
app.get('/api/survey-stats', async (req, res) => {
try {
// Check for authentication
const apiKey = req.headers['x-api-key'];
if (apiKey !== process.env.ADMIN_API_KEY) {
  return res.status(401).json({
    success: false,
    error: 'Unauthorized'
  });
}

const stats = await db.getSurveyStats();

res.json({
  success: true,
  data: stats
});
} catch (error) {
console.error('Error getting survey stats:', error);
res.status(500).json({
  success: false,
  error: 'Failed to get survey statistics'
});
}
});

/**
 * Search articles endpoint
 * This allows searching across all articles with various filters
 */
app.get('/api/search', async (req, res) => {
  try {
    const searchTerm = req.query.q || '';
    const source = req.query.source;
    const contentCategory = req.query.contentCategory;
    const titleOnly = req.query.titleOnly === 'true';
    const recentOnly = req.query.recentOnly === 'true';
    const limit = parseInt(req.query.limit || '50');
    
    console.log('Search request:', {
      searchTerm,
      source,
      contentCategory,
      titleOnly,
      recentOnly,
      limit
    });
    
    // Build the base SQL query
    let query = `
      SELECT * FROM articles 
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Add search term filter - basic LIKE search
    if (searchTerm) {
      if (titleOnly) {
        query += ` AND title LIKE ?`;
        queryParams.push(`%${searchTerm}%`);
      } else {
        query += ` AND (title LIKE ? OR summary LIKE ?)`;
        queryParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
      }
    }
    
    // Add source filter if provided
    if (source && source !== 'all') {
      query += ` AND source = ?`;
      queryParams.push(source);
    }
    
    // Add content category filter if provided
    if (contentCategory && contentCategory !== 'all') {
      query += ` AND content_category = ?`;
      queryParams.push(contentCategory);
    }
    
    // Add recent only filter (last 3 months)
    if (recentOnly) {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      query += ` AND publication_date >= ?`;
      queryParams.push(threeMonthsAgo.toISOString());
    }
    
    // Add sorting and limit
    query += ` ORDER BY publication_date DESC LIMIT ${parseInt(limit)}`;
    
    console.log('SQL Query:', query);
    console.log('Query Params:', queryParams);
    
    // Execute the query
    const [rows] = await pool.execute(query, queryParams);
    
    // Get total count for pagination
    let totalCount = rows.length;
    if (rows.length === limit) {
      // Only do a COUNT query if we might have more results
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total').split('ORDER BY')[0];
      const [countResult] = await pool.execute(countQuery, queryParams);
      totalCount = countResult[0].total;
    }
    
    console.log(`Found ${rows.length} search results out of ${totalCount} total matches`);
    
    res.json({
      success: true,
      data: rows,
      metadata: {
        totalResults: totalCount,
        searchTerm,
        filters: {
          source,
          contentCategory,
          titleOnly,
          recentOnly
        }
      }
    });
  } catch (error) {
    console.error('Error in search:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search articles',
      details: error.message || 'Unknown error'
    });
  }
});

// Get all important articles
app.get('/api/important-articles', async (req, res) => {
  try {
    const articles = await db.getImportantArticles();
    
    res.json({
      success: true,
      data: articles,
      metadata: {
        totalImportant: articles.length
      }
    });
  } catch (error) {
    console.error('Error in /api/important-articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch important articles',
      details: error.message || 'Unknown error'
    });
  }
});

// Mark an article as important (admin only)
app.post('/api/mark-important', async (req, res) => {
  try {
    // Check for authentication
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    const { articleId, isImportant } = req.body;
    
    if (!articleId) {
      return res.status(400).json({
        success: false,
        error: 'Article ID is required'
      });
    }
    
    const result = await db.markArticleImportant(
      articleId, 
      isImportant !== false // Default to true if not specified
    );
    
    if (result) {
      res.json({
        success: true,
        message: `Article ${articleId} has been ${isImportant !== false ? 'marked' : 'unmarked'} as important`
      });
    } else {
      throw new Error('Failed to update article importance status');
    }
  } catch (error) {
    console.error('Error in /api/mark-important:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update article importance status',
      details: error.message || 'Unknown error'
    });
  }
});

// Get feedback statistics - FIXED VERSION
app.get('/api/feedback-stats', async (req, res) => {
try {
// Check for authentication
const apiKey = req.headers['x-api-key'];
if (apiKey !== process.env.ADMIN_API_KEY) {
  return res.status(401).json({
    success: false,
    error: 'Unauthorized'
  });
}

const stats = await db.getFeedbackStats();

res.json({
  success: true,
  data: stats
});
} catch (error) {
console.error('Error getting feedback stats:', error);
res.status(500).json({
  success: false,
  error: 'Failed to get feedback statistics'
});
}
});


// Error handler middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Server error AHHHH',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});

// Handle 404s
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found AHHHH',
        message: `Route ${req.path} not found`
    });
});

console.log('Registered Routes:');
app._router.stack.forEach(r => {
  if (r.route && r.route.path) {
    console.log(`${Object.keys(r.route.methods).join(',')} ${r.route.path}`);
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});

// Handle process termination gracefully
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});


// Telling Server to fetch articles!!!

// Fetch articles on startup and every 3 hours
(async function() {
  try {
    console.log('Initial article fetch on startup...');
    await fetchArticles();
    console.log('Initial article fetch completed.');
  } catch (error) {
    console.error('Error during initial article fetch:', error);
  }
  
  // Schedule periodic fetching
  setInterval(async () => {
    try {
      console.log('Scheduled article fetch starting...');
      await fetchArticles();
      console.log('Scheduled article fetch completed.');
    } catch (error) {
      console.error('Error during scheduled article fetch:', error);
    }
  }, 6 * 60 * 60 * 1000); // 6 hours in milliseconds
})();