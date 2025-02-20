// Import required packages
const express = require('express');  // Web server framework
const cors = require('cors');        // Cross-Origin Resource Sharing middleware
const Parser = require('rss-parser'); // RSS feed parser

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
    }
});

// Initialize Express application
const app = express();

// Configure CORS middleware
app.use(cors({
    origin: 'http://localhost:3000',  // Allow requests from local development
    methods: ['GET', 'POST'],         // Allowed HTTP methods
    allowedHeaders: ['Content-Type'], // Allowed headers
    credentials: true                 // Allow credentials (cookies, etc.)
}));

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
            'https://www.climate.gov/news-features/feed',
            'https://www.noaa.gov/feed/news'
        ],
        categories: ['Weather Patterns', 'Ocean Data', 'Atmospheric Research']
    },
    UN_Climate: {
        urls: [
            'https://unfccc.int/news/feed',
            'https://news.un.org/feed/subscribe/en/news/topic/climate-change/feed/rss.xml'
        ],
        categories: ['Global Policy', 'International Action', 'Climate Agreements']
    },
    
    // Weather Services
    Weather_Gov: {
        urls: [
            'https://www.weather.gov/wrn/xml/rss_alert.xml',   // Weather alerts
            'https://www.weather.gov/hazards/rss',             // Hazard alerts
            'https://www.weather.gov/outlooks/rss'             // Weather outlooks
        ],
        categories: ['Weather Alerts', 'Hazards', 'Forecasts']
    },
    
    AccuWeather: {
        urls: [
            'https://rss.accuweather.com/rss/news/en-us',        // News
            'https://rss.accuweather.com/rss/blog/en-us',        // Blog
            'https://rss.accuweather.com/rss/hurricane/en-us'    // Hurricane news
        ],
        categories: ['Weather News', 'Weather Analysis', 'Extreme Weather']
    },
    
    IPCC: {
        urls: [
            'https://www.ipcc.ch/feed/press-releases',           // Press releases
            'https://www.ipcc.ch/feed/news',                     // News
            'https://www.ipcc.ch/feed/events'                    // Events and reports
        ],
        categories: ['Climate Science', 'Research Reports', 'Climate Policy']
    },
    
    BBC_Climate: {
        urls: [
            'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',  // Science & Environment
            'https://feeds.bbci.co.uk/news/topics/c4y3wxv70g4t/rss.xml',     // Climate Change news
            'https://feeds.bbci.co.uk/news/topics/cez1nz919vxt/rss.xml'      // Environment news
        ],
        categories: ['Climate News', 'Environmental Reports', 'Science Coverage']
    },
    
    // Added: Community and Grassroots Sources
    Community_Climate: {
        urls: [
            'https://350.org/feed/',
            'https://climatejusticealliance.org/feed/',
            'https://www.climateactionnetwork.ca/feed/'
        ],
        categories: ['Community Action', 'Climate Justice', 'Local Initiatives']
    },
    
    // Added: Indigenous Knowledge Sources
    Indigenous_Climate: {
        urls: [
            'https://www.indigenousclimateaction.com/feed',
            'https://www.indianz.com/climate/feed',
            'https://www.indigenousclimateknowledge.org/feed'
        ],
        categories: ['Traditional Knowledge', 'Indigenous Perspectives', 'Land Management']
    },
    
    // Added: Local Impact Sources
    Local_Climate_Impact: {
        urls: [
            'https://www.localclimateimpacts.org/feed',
            'https://climatechangeresponses.org/feed',
            'https://www.climatereporting.org/local/feed'
        ],
        categories: ['Local Impacts', 'Community Response', 'Regional Analysis']
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
            feedMonitor.recordAttempt(url, true, responseTime, feed.items ? feed.items.length : 0);
            return feed;
        } catch (error) {
            lastError = error;
            const responseTime = Date.now() - startTime;
            feedMonitor.recordAttempt(url, false, responseTime, 0, error);
            
            // Wait longer between each retry attempt
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
                        const articles = feed.items.map(item => ({
                            title: item.title || 'No title available',
                            source: source,
                            sourceUrl: feedUrl,
                            category: sourceData.categories[0],
                            date: item.pubDate || new Date().toISOString(),
                            summary: item.contentSnippet || item.content || item.description || 'No summary available',
                            url: item.link || feedUrl,
                            publisher: source
                        }));
                        allArticles = [...allArticles, ...articles];
                        console.log(`Successfully fetched ${articles.length} articles from ${source}`);
                    }
                } catch (error) {
                    console.error(`Error fetching from ${source} - ${feedUrl}:`, error);
                }
            }
        }

        // Sort articles by date, newest first
        allArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        console.log(`Total articles fetched: ${allArticles.length}`);
        return allArticles;
    } catch (error) {
        console.error('Error in fetchArticles:', error);
        return [];
    }
}

// API Routes

// Get all articles with health metrics
app.get('/api/articles', async (req, res) => {
    try {
        const articles = await fetchArticles();
        const healthMetrics = feedMonitor.getAllFeedsHealth();
        
        res.json({
            success: true,
            data: articles,
            metadata: {
                totalArticles: articles.length,
                fetchTime: new Date().toISOString(),
                feedHealth: healthMetrics
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to fetch articles',
            details: error.message
        });
    }
});

// Get health metrics for all feeds
app.get('/api/feed-health', (req, res) => {
    const health = feedMonitor.getAllFeedsHealth();
    res.json({
        success: true,
        data: health,
        timestamp: new Date().toISOString()
    });
});

// Get list of unhealthy feeds
app.get('/api/unhealthy-feeds', (req, res) => {
    const unhealthyFeeds = feedMonitor.getUnhealthyFeeds();
    res.json({
        success: true,
        data: unhealthyFeeds,
        timestamp: new Date().toISOString()
    });
});

// Test route to verify server is running
app.get('/test', (req, res) => {
    res.json({ message: 'Backend server is running!' });
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});