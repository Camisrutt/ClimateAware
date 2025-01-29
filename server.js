const express = require('express');
const cors = require('cors');
const Parser = require('rss-parser');

class FeedMonitor {
    constructor() {
        this.healthMetrics = new Map();
        this.lastCheck = new Map();
        this.successRates = new Map();
    }

    recordAttempt(feedUrl, success, responseTime, articleCount, error = null) {
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

        metrics.averageResponseTime = 
            (metrics.averageResponseTime * (metrics.totalAttempts - 1) + responseTime) / 
            metrics.totalAttempts;

        this.lastCheck.set(feedUrl, new Date().toISOString());
        this.updateSuccessRate(feedUrl);
    }

    updateSuccessRate(feedUrl) {
        const metrics = this.healthMetrics.get(feedUrl);
        if (metrics) {
            const successRate = (metrics.successfulAttempts / metrics.totalAttempts) * 100;
            this.successRates.set(feedUrl, successRate.toFixed(2));
        }
    }

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

const feedMonitor = new FeedMonitor();
const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
});

const app = express();

app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

// Feed URLs organized by source
const NEWS_FEEDS = {
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
    }
};

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
            
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
    }
    throw lastError;
}

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

        // Sort by date (newest first)
        allArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        console.log(`Total articles fetched: ${allArticles.length}`);
        return allArticles;
    } catch (error) {
        console.error('Error in fetchArticles:', error);
        return [];
    }
}

// API Routes
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

app.get('/api/feed-health', (req, res) => {
    const health = feedMonitor.getAllFeedsHealth();
    res.json({
        success: true,
        data: health,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/unhealthy-feeds', (req, res) => {
    const unhealthyFeeds = feedMonitor.getUnhealthyFeeds();
    res.json({
        success: true,
        data: unhealthyFeeds,
        timestamp: new Date().toISOString()
    });
});

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Backend server is running!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});