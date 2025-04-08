import React, { useState } from 'react';
import { submitFeedback } from '../api'; // Import from api.js
import './Feedback.css';

const FeedbackButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('feature');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Submit to backend API
      await submitFeedback({
        type: feedbackType,
        message: feedback
      });
      
      // Show success state
      setSubmitted(true);
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setIsOpen(false);
        setFeedback('');
        setFeedbackType('feature');
        setSubmitted(false);
      }, 2000);
    } catch (error) {
      setSubmitError('Failed to submit feedback. Please try again.');
      console.error('Feedback submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
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
        
        {submitError && <div className="error-message">{submitError}</div>}
        
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
                required
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
                disabled={isSubmitting || !feedback.trim()}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
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