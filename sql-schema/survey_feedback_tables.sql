-- Table for user survey responses
CREATE TABLE IF NOT EXISTS user_surveys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    background VARCHAR(50) NOT NULL,
    other_background VARCHAR(255),
    interest TEXT,
    affiliation VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for user feedback
CREATE TABLE IF NOT EXISTS user_feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feedback_type ENUM('feature', 'bug', 'improvement', 'other') NOT NULL,
    message TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);