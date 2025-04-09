# ClimateAware: Technical Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Database Design](#database-design)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Data Collection & Processing](#data-collection--processing)
7. [SQL Queries for Data Analysis](#sql-queries-for-data-analysis)
8. [Security Considerations](#security-considerations)
9. [Future Enhancements](#future-enhancements)

## Project Overview

ClimateAware is a web application designed to aggregate climate change data and articles from various sources, providing users with easy access to information about how climate change is currently affecting our environment. The system fetches data from multiple RSS feeds, categorizes articles based on their relevance to climate change, and stores this information in a structured database for easy retrieval and analysis.

**Key Features:**
- Automated collection of climate-related news from multiple sources
- Content categorization using keyword analysis
- User feedback and survey collection for research purposes
- Feed health monitoring for reliability assessment
- Responsive frontend interface for viewing categorized articles

## System Architecture

ClimateAware follows a classic client-server architecture with separate frontend and backend components:

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│             │     │              │     │               │
│  React.js   │◄───►│  Express.js  │◄───►│    MySQL      │
│  Frontend   │     │   Backend    │     │   Database    │
│             │     │              │     │               │
└─────────────┘     └──────────────┘     └───────────────┘
                           ▲
                           │
                           ▼
                    ┌──────────────┐
                    │              │
                    │   RSS Feed   │
                    │   Sources    │
                    │              │
                    └──────────────┘
```

### Key Components:

1. **Frontend**: Built with React.js, providing a responsive user interface.
2. **Backend**: Node.js with Express.js framework, handling API endpoints, data processing, and feed fetching.
3. **Database**: MySQL database for storing articles, feed statistics, user surveys, and feedback.
4. **External Sources**: Multiple RSS feeds from climate-related organizations (NASA, NOAA, UN, etc.).

## Database Design

The database schema consists of several interconnected tables designed to store articles, track feed health, and collect user feedback.

### Core Tables:

#### 1. `feed_sources`
Stores information about each RSS feed source being monitored.

```sql
CREATE TABLE feed_sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL,
    feed_url VARCHAR(255) NOT NULL UNIQUE,
    source_category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_feed_url (feed_url)
);
```

#### 2. `feed_health`
Tracks the reliability and performance of each feed source.

```sql
CREATE TABLE feed_health (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feed_url VARCHAR(255) NOT NULL,
    total_attempts INT DEFAULT 0,
    successful_attempts INT DEFAULT 0,
    failed_attempts INT DEFAULT 0,
    last_successful TIMESTAMP NULL,
    average_response_time FLOAT DEFAULT 0,
    success_rate FLOAT DEFAULT 0,
    last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feed_url) REFERENCES feed_sources(feed_url) ON DELETE CASCADE,
    INDEX idx_feed_url (feed_url)
);
```

#### 3. `articles`
Stores the actual content fetched from the feeds.

```sql
CREATE TABLE articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    source VARCHAR(100) NOT NULL,
    source_url VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    content_category ENUM('climate_primary', 'climate_related', 'science_other', 'uncategorized') DEFAULT 'uncategorized',
    publication_date TIMESTAMP,
    summary TEXT,
    url VARCHAR(255) NOT NULL,
    publisher VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_url) REFERENCES feed_sources(feed_url) ON DELETE CASCADE,
    UNIQUE INDEX idx_article_url (url),
    INDEX idx_content_category (content_category),
    INDEX idx_publication_date (publication_date)
);
```

#### 4. `error_logs`
Records errors encountered when fetching feeds.

```sql
CREATE TABLE error_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feed_url VARCHAR(255) NOT NULL,
    error_message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feed_url) REFERENCES feed_sources(feed_url) ON DELETE CASCADE,
    INDEX idx_feed_url (feed_url),
    INDEX idx_timestamp (timestamp)
);
```

#### 5. `user_surveys` and `user_feedback`
Collects research data from users.

```sql
CREATE TABLE user_surveys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    background VARCHAR(50) NOT NULL,
    other_background VARCHAR(255),
    interest TEXT,
    affiliation VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feedback_type ENUM('feature', 'bug', 'improvement', 'other') NOT NULL,
    message TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Database Views and Functions:

The system includes a view to easily identify problematic feeds:

```sql
CREATE OR REPLACE VIEW unhealthy_feeds AS
SELECT 
    fs.source_name,
    fh.feed_url,
    fh.success_rate,
    fh.last_successful,
    fh.last_check,
    fh.total_attempts
FROM feed_health fh
JOIN feed_sources fs ON fh.feed_url = fs.feed_url
WHERE fh.success_rate < 70.0
ORDER BY fh.success_rate ASC;
```

And a function to retrieve recent errors:

```sql
CREATE FUNCTION get_recent_errors(p_feed_url VARCHAR(255), p_count INT) 
RETURNS TEXT
READS SQL DATA
BEGIN
    DECLARE result TEXT DEFAULT '';
    DECLARE error_entry TEXT;
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur CURSOR FOR 
        SELECT CONCAT(timestamp, ': ', error_message) 
        FROM error_logs 
        WHERE feed_url = p_feed_url 
        ORDER BY timestamp DESC 
        LIMIT p_count;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO error_entry;
        IF done THEN
            LEAVE read_loop;
        END IF;
        SET result = CONCAT(result, error_entry, '\n');
    END LOOP;
    
    CLOSE cur;
    RETURN result;
END;
```

## Backend Implementation

The backend is built on Node.js with Express.js, organized as follows:

### Key Files:
- `server.js`: Main application entry point
- `db.js`: Database connection and query functions
- `.env`: Environment variables (not checked into version control)

### Main Components:

#### FeedMonitor Class
A core component that tracks the health and performance of RSS feeds, recording metrics like success rates, response times, and error history.

```javascript
class FeedMonitor {
    constructor() {
        this.healthMetrics = new Map();
        this.lastCheck = new Map();
        this.successRates = new Map();
    }
    
    recordAttempt(feedUrl, success, responseTime, articleCount, error = null) {
        // Implementation details...
    }
    
    getAllFeedsHealth() {
        // Implementation details...
    }
    
    getUnhealthyFeeds() {
        // Implementation details...
    }
}
```

#### Article Classification
Automatic classification of articles based on content relevance to climate change:

```javascript
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
```

#### Feed Fetching Logic
Robust fetching with retry mechanism:

```javascript
async function fetchFeedWithRetry(url, maxRetries = 2) {
    const startTime = Date.now();
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const feed = await parser.parseURL(url);
            const responseTime = Date.now() - startTime;
            
            // Record successful attempt
            feedMonitor.recordAttempt(url, true, responseTime, feed.items.length);
            await db.recordFeedAttempt(url, true, responseTime, feed.items.length);
            
            return feed;
        } catch (error) {
            // Record failed attempt
            lastError = error;
            const responseTime = Date.now() - startTime;
            feedMonitor.recordAttempt(url, false, responseTime, 0, error);
            await db.recordFeedAttempt(url, false, responseTime, 0, error);
            
            // Wait before retry
            if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
    }
    throw lastError;
}
```

### API Endpoints:

The backend provides several API endpoints:

- `GET /api/articles`: Retrieve articles with optional filtering
- `GET /api/feed-health`: Get health metrics for all feeds
- `GET /api/unhealthy-feeds`: Get information about problematic feeds
- `POST /api/survey`: Submit user survey responses
- `POST /api/feedback`: Submit user feedback
- `GET /api/survey-stats`: Get survey statistics (admin only)
- `GET /api/feedback-stats`: Get feedback statistics (admin only)

## Frontend Implementation

The frontend is built with React.js, following a component-based architecture:

### Key Components:

- `App.js`: Main application component
- `UserSurvey.js`: Component for collecting user survey data
- `FeedbackButton.js`: Component for collecting user feedback

### State Management:

The application uses React's useState and useEffect hooks for state management:

```javascript
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
```

### API Integration:

The frontend integrates with the backend API through service functions:

```javascript
export const fetchArticles = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') queryParams.append(key, value);
    });
    
    const response = await fetch(`${API_URL}/api/articles?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching articles:', error);
    throw error;
  }
};
```

## Data Collection & Processing

The data collection process is central to the ClimateAware system:

### Sources:

The system collects data from various climate-related RSS feeds:

```javascript
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
    // Additional sources...
};
```

### Collection Process:

1. RSS feeds are fetched at regular intervals (every 6 hours)
2. Articles are parsed and normalized into a standard format
3. Content is classified based on climate relevance
4. Duplicates are detected and filtered out
5. Articles are stored in the database

### Classification Keywords:

Articles are classified using sets of keywords:

```javascript
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
```

## SQL Queries for Data Analysis

Below are examples of SQL queries that can be used to analyze the collected data:

### 1. Article Distribution by Category

```sql
SELECT 
    content_category, 
    COUNT(*) as article_count,
    COUNT(*) * 100.0 / (SELECT COUNT(*) FROM articles) as percentage
FROM articles
GROUP BY content_category
ORDER BY article_count DESC;
```

### 2. Articles Over Time (Monthly Trend)

```sql
SELECT 
    DATE_FORMAT(publication_date, '%Y-%m') as month,
    COUNT(*) as article_count,
    SUM(CASE WHEN content_category = 'climate_primary' THEN 1 ELSE 0 END) as primary_count,
    SUM(CASE WHEN content_category = 'climate_related' THEN 1 ELSE 0 END) as related_count,
    SUM(CASE WHEN content_category = 'science_other' THEN 1 ELSE 0 END) as other_count
FROM articles
WHERE publication_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
GROUP BY DATE_FORMAT(publication_date, '%Y-%m')
ORDER BY month;
```

### 3. Top Sources by Article Volume

```sql
SELECT 
    source, 
    COUNT(*) as article_count,
    SUM(CASE WHEN content_category = 'climate_primary' THEN 1 ELSE 0 END) as primary_count,
    SUM(CASE WHEN content_category = 'climate_related' THEN 1 ELSE 0 END) as related_count
FROM articles
GROUP BY source
ORDER BY article_count DESC
LIMIT 10;
```

### 4. Feed Health Analysis

```sql
SELECT 
    fs.source_name,
    fh.feed_url,
    fh.success_rate,
    fh.average_response_time,
    fh.total_attempts,
    fh.last_successful,
    COUNT(a.id) as articles_fetched
FROM feed_health fh
JOIN feed_sources fs ON fh.feed_url = fs.feed_url
LEFT JOIN articles a ON a.source_url = fh.feed_url
GROUP BY fs.source_name, fh.feed_url
ORDER BY fh.success_rate DESC;
```

### 5. User Survey Analysis

```sql
SELECT 
    background, 
    COUNT(*) as count,
    COUNT(*) * 100.0 / (SELECT COUNT(*) FROM user_surveys) as percentage
FROM user_surveys
GROUP BY background
ORDER BY count DESC;
```

### 6. User Feedback by Type

```sql
SELECT 
    feedback_type, 
    COUNT(*) as count,
    COUNT(*) * 100.0 / (SELECT COUNT(*) FROM user_feedback) as percentage
FROM user_feedback
GROUP BY feedback_type
ORDER BY count DESC;
```

### 7. Recent Error Analysis

```sql
SELECT 
    fs.source_name,
    el.feed_url,
    el.error_message,
    COUNT(*) as error_count,
    MAX(el.timestamp) as most_recent_occurrence
FROM error_logs el
JOIN feed_sources fs ON el.feed_url = fs.feed_url
WHERE el.timestamp > DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY fs.source_name, el.feed_url, el.error_message
ORDER BY error_count DESC, most_recent_occurrence DESC;
```

### 8. Find Keywords in Articles

```sql
SELECT 
    title,
    publication_date,
    source,
    url
FROM articles
WHERE 
    title LIKE '%climate%crisis%' OR
    summary LIKE '%climate%crisis%'
ORDER BY publication_date DESC
LIMIT 20;
```

## Security Considerations

The ClimateAware system implements several security measures:

1. **Environment Variables**: Sensitive information like database credentials is stored in environment variables (.env file) rather than in the code.

2. **CORS Configuration**: The API implements Cross-Origin Resource Sharing (CORS) protection to control which domains can access the API.

3. **API Key Authentication**: Administrative endpoints require API key authentication:

   ```javascript
   const apiKey = req.headers['x-api-key'];
   if (apiKey !== process.env.ADMIN_API_KEY) {
     return res.status(401).json({
       success: false,
       error: 'Unauthorized'
     });
   }
   ```

4. **SSL Database Connection**: The database connection uses SSL for secure data transmission.

   ```javascript
   const dbConfig = {
     // ...other settings
     ssl: {
       required: true,
       rejectUnauthorized: false  // For self-signed certificates
     }
   };
   ```

5. **Input Validation**: The system validates user inputs before processing.

6. **Error Handling**: Sensitive error details are hidden in production mode.

## Future Enhancements

Potential areas for enhancement include:

1. **Advanced Classification**: Implement machine learning for better article classification.

2. **Geographic Tagging**: Add region markers to help categorize content by geographical area.

3. **Interactive Visualizations**: Add data visualizations to show climate trends.

4. **Enhanced Filtering**: Improve filter options for more targeted article retrieval.

5. **RSS Feed Auto-Discovery**: Automatically discover new RSS feeds from known climate sources.

6. **User Authentication**: Add user accounts for personalized experiences.

7. **Article Recommendation Engine**: Suggest related articles based on reading history.

8. **Mobile Application**: Develop a native mobile app for improved mobile experience.

9. **API Documentation**: Create comprehensive API documentation for potential integrations.

10. **Elasticsearch Integration**: Implement advanced search capabilities with Elasticsearch.
