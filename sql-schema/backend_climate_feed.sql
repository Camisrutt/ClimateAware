-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS climate_feed_monitor;

-- Use the database
USE climate_feed_monitor;

-- Table for news feed sources
CREATE TABLE IF NOT EXISTS feed_sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL,
    feed_url VARCHAR(255) NOT NULL UNIQUE,
    source_category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_feed_url (feed_url)
);

-- Table for feed health metrics
CREATE TABLE IF NOT EXISTS feed_health (
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

-- Table for error logs
CREATE TABLE IF NOT EXISTS error_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feed_url VARCHAR(255) NOT NULL,
    error_message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feed_url) REFERENCES feed_sources(feed_url) ON DELETE CASCADE,
    INDEX idx_feed_url (feed_url),
    INDEX idx_timestamp (timestamp)
);

-- Table for articles
CREATE TABLE IF NOT EXISTS articles (
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

-- Pre-populate feed sources table with sources from your code
INSERT INTO feed_sources (source_name, feed_url, source_category) VALUES
-- NASA
('NASA', 'https://www.nasa.gov/rss/dyn/breaking_news.rss', 'Satellite Data'),
('NASA', 'https://science.nasa.gov/climate-change/stories/', 'Climate Research'),
('NASA', 'https://www.nasa.gov/news-release/feed/', 'Environmental Monitoring'),
('NASA', 'https://earthobservatory.nasa.gov/feeds/natural-hazards.rss', 'Environmental Monitoring'),

-- NOAA
('NOAA', 'https://www.ncei.noaa.gov/access/monitoring/monthly-report/rss.xml', 'Weather Patterns'),

-- Climate & Weather Gov
('ClimateWeatherGov', 'https://www.climate.gov/feeds/news-features/climatetech.rss', 'Weather Patterns'),
('ClimateWeatherGov', 'https://www.climate.gov/feeds/news-features/climateand.rss', 'Weather Patterns'),
('ClimateWeatherGov', 'https://www.climate.gov/feeds/news-features/understandingclimate.rss', 'Atmospheric Research'),
('ClimateWeatherGov', 'https://www.climate.gov/feeds/news-features/casestudies.rss', 'Atmospheric Research'),
('ClimateWeatherGov', 'https://www.weather.gov/wrn/xml/rss_alert.xml', 'Weather Patterns'),

-- UN Climate
('UN_Climate', 'https://news.un.org/feed/subscribe/en/news/topic/migrants-and-refugees/feed/rss.xml', 'Global Policy'),
('UN_Climate', 'https://news.un.org/feed/subscribe/en/news/topic/climate-change/feed/rss.xml', 'Climate Agreements'),

-- BBC Climate
('BBC_Climate', 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', 'Science Coverage'),

-- Community Climate
('Community_Climate', 'https://350.org/feed/', 'Community Action'),
('Community_Climate', 'https://climatejusticealliance.org/feed/', 'Climate Justice'),
('Community_Climate', 'https://feeds.feedburner.com/ConservationInternationalBlog', 'Local Initiatives'),

-- Indigenous Climate
('Indigenous_Climate', 'https://indianz.com/rss/news.xml', 'Traditional Knowledge')
ON DUPLICATE KEY UPDATE source_category = VALUES(source_category);

-- Create stored procedure to record feed health attempt
DELIMITER //
CREATE PROCEDURE record_feed_attempt(
    IN p_feed_url VARCHAR(255),
    IN p_success BOOLEAN,
    IN p_response_time FLOAT,
    IN p_article_count INT,
    IN p_error_message TEXT
)
BEGIN
    DECLARE current_total INT;
    DECLARE current_avg FLOAT;
    
    -- Get current metrics
    SELECT total_attempts, average_response_time INTO current_total, current_avg
    FROM feed_health
    WHERE feed_url = p_feed_url;
    
    -- If no existing record, insert new one
    IF current_total IS NULL THEN
        INSERT INTO feed_health (feed_url, total_attempts, successful_attempts, failed_attempts, 
                               average_response_time, last_check, success_rate)
        VALUES (p_feed_url, 1, 
                IF(p_success, 1, 0), 
                IF(p_success, 0, 1), 
                p_response_time, 
                NOW(),
                IF(p_success, 100.0, 0.0));
                
        -- Update last_successful if successful
        IF p_success THEN
            UPDATE feed_health 
            SET last_successful = NOW()
            WHERE feed_url = p_feed_url;
        END IF;
    ELSE
        -- Update existing record
        UPDATE feed_health 
        SET total_attempts = total_attempts + 1,
            successful_attempts = successful_attempts + IF(p_success, 1, 0),
            failed_attempts = failed_attempts + IF(p_success, 0, 1),
            last_successful = IF(p_success, NOW(), last_successful),
            average_response_time = ((average_response_time * total_attempts) + p_response_time) / (total_attempts + 1),
            last_check = NOW(),
            success_rate = (successful_attempts + IF(p_success, 1, 0)) * 100.0 / (total_attempts + 1)
        WHERE feed_url = p_feed_url;
    END IF;
    
    -- Log error if failed
    IF NOT p_success AND p_error_message IS NOT NULL THEN
        INSERT INTO error_logs (feed_url, error_message)
        VALUES (p_feed_url, p_error_message);
    END IF;
END //
DELIMITER ;

-- Create stored procedure to insert article with duplicate check
DELIMITER //
CREATE PROCEDURE insert_article_if_not_exists(
    IN p_title VARCHAR(255),
    IN p_source VARCHAR(100),
    IN p_source_url VARCHAR(255),
    IN p_category VARCHAR(100),
    IN p_content_category VARCHAR(20),
    IN p_publication_date TIMESTAMP,
    IN p_summary TEXT,
    IN p_url VARCHAR(255),
    IN p_publisher VARCHAR(100)
)
BEGIN
    -- Check if article already exists by URL
    IF NOT EXISTS (SELECT 1 FROM articles WHERE url = p_url) THEN
        -- Check for similar title within 24 hours (basic duplicate detection)
        IF NOT EXISTS (
            SELECT 1 FROM articles 
            WHERE title = p_title 
            AND ABS(TIMESTAMPDIFF(HOUR, publication_date, p_publication_date)) < 24
        ) THEN
            -- Insert the article
            INSERT INTO articles (
                title, source, source_url, category, content_category, 
                publication_date, summary, url, publisher
            ) VALUES (
                p_title, p_source, p_source_url, p_category, p_content_category,
                p_publication_date, p_summary, p_url, p_publisher
            );
        END IF;
    END IF;
END //
DELIMITER ;

-- Create a view for unhealthy feeds (success rate < 70%)
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

-- Create a function to get recent errors for a feed
DELIMITER //
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
END //
DELIMITER ;
