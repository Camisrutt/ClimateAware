import React, { useState } from 'react';
import './Feedback.css';

const FeedbackButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('feature');
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Save feedback
    const feedbackData = {
      type: feedbackType,
      message: feedback,
      timestamp: new Date().toISOString(),
    };

    // Get existing feedback
    const existingFeedback = JSON.parse(localStorage.getItem('userFeedback') || '[]');
    localStorage.setItem('userFeedback', JSON.stringify([...existingFeedback, feedbackData]));

    // Show success state
    setSubmitted(true);
    
    // Reset form after 2 seconds
    setTimeout(() => {
      setIsOpen(false);
      setFeedback('');
      setFeedbackType('feature');
      setSubmitted(false);
    }, 2000);
  };

  if (!isOpen) {
    return (
      <button 
        className="feedback-button"
        onClick={() => setIsOpen(true)}
      >
        Send Feedback
      </button>
    );
  }

  return (
    <div className="feedback-overlay">
      <div className="feedback-modal">
        <div className="feedback-header">
          <h2>{submitted ? 'Thank You!' : 'Share Your Feedback'}</h2>
          <button 
            className="close-button"
            onClick={() => setIsOpen(false)}
          >
            ×
          </button>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="feedback-form">
            <div className="form-group">
              <label>What type of feedback do you have?</label>
              <div className="radio-group">
                {[
                  ['feature', 'Feature Request'],
                  ['bug', 'Bug Report'],
                  ['improvement', 'Improvement Suggestion'],
                  ['other', 'Other']
                ].map(([value, label]) => (
                  <label key={value} className="radio-label">
                    <input
                      type="radio"
                      name="feedbackType"
                      value={value}
                      checked={feedbackType === value}
                      onChange={(e) => setFeedbackType(e.target.value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Your Feedback</label>
              <textarea
                className="textarea"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your thoughts..."
              />
            </div>

            <div className="button-group">
              <button 
                type="button" 
                className="button secondary"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="button primary"
                disabled={!feedback.trim()}
              >
                Submit
              </button>
            </div>
          </form>
        ) : (
          <div className="success-message">
            <p>Your feedback has been submitted!</p>
            <p>Thanks for helping us improve.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackButton;