const API_URL = (process.env.REACT_APP_API_URL || 'https://geog-web-app-fiddr.ondigitalocean.app').replace(/\/$/, '');

// Fetch articles with optional filters
export const fetchArticles = async (filters = {}) => {
  try {
    // Convert filters object to URL query parameters
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') queryParams.append(key, value);
    });
    
    console.log(`Requesting articles from ${API_URL}/api/articles?${queryParams}`);
    
    const response = await fetch(`${API_URL}/api/articles?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("API returned:", {
      success: data.success,
      articleCount: data.data?.length || 0,
      metadata: data.metadata
    });
    
    return data;
  } catch (error) {
    console.error('Error fetching articles:', error);
    throw error;
  }
};

// Submit user survey
export const submitSurvey = async (surveyData) => {
  try {
    const response = await fetch(`${API_URL}/api/survey`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(surveyData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error submitting survey:', error);
    throw error;
  }
};

// Submit user feedback
export const submitFeedback = async (feedbackData) => {
  try {
    const response = await fetch(`${API_URL}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feedbackData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error submitting feedback:', error);
    throw error;
  }
};

export const markArticleImportant = async (articleId, isImportant, apiKey) => {
  try {
    const response = await fetch(`${API_URL}/api/mark-important`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ articleId, isImportant })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error marking article as important:', error);
    throw error;
  }
};