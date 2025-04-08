import React, { useState, useEffect } from 'react';
import { submitSurvey } from '../api'; // Import from api.js
import './Survey.css';

const UserSurvey = ({ onClose }) => {
  const [showSurvey, setShowSurvey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [formData, setFormData] = useState({
    background: '',
    otherBackground: '',
    interest: '',
    affiliation: '',
  });

  useEffect(() => {
    // Check if user has completed survey before
    const hasCompletedSurvey = localStorage.getItem('surveyCompleted');
    if (!hasCompletedSurvey) {
      // Show survey after 5 seconds
      const timer = setTimeout(() => setShowSurvey(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Submit to backend API
      const result = await submitSurvey({
        ...formData,
        // Don't include otherBackground if background is not 'other'
        otherBackground: formData.background === 'other' ? formData.otherBackground : undefined
      });
      
      // Mark as completed in localStorage to prevent showing again
      localStorage.setItem('surveyCompleted', 'true');
      
      // Close survey
      setShowSurvey(false);
      if (onClose) onClose(formData);
    } catch (error) {
      setSubmitError('Failed to submit survey. Please try again.');
      console.error('Survey submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showSurvey) return null;

  return (
    <div className="survey-overlay">
      <div className="survey-modal">
        <div className="survey-header">
          <h2>Help Us Improve</h2>
          <button 
            className="close-button"
            onClick={() => setShowSurvey(false)}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="survey-form">
          {submitError && <div className="error-message">{submitError}</div>}
          
          <div className="form-group">
            <label>What best describes your background?</label>
            <div className="radio-group">
              {['Higher Education', 'College Student', 'Faculty', 'Researcher', 'Other'].map((option) => (
                <label key={option} className="radio-label">
                  <input
                    type="radio"
                    name="background"
                    value={option.toLowerCase().replace(' ', '-')}
                    checked={formData.background === option.toLowerCase().replace(' ', '-')}
                    onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                    required
                  />
                  {option}
                </label>
              ))}
            </div>

            {formData.background === 'other' && (
              <input
                type="text"
                className="text-input"
                placeholder="Please specify"
                value={formData.otherBackground}
                onChange={(e) => setFormData({ ...formData, otherBackground: e.target.value })}
                required={formData.background === 'other'}
              />
            )}
          </div>

          <div className="form-group">
            <label>Why are you interested in accessing this website?</label>
            <textarea
              className="textarea"
              value={formData.interest}
              onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Are you from a college news outlet or independent researcher?</label>
            <div className="radio-group">
              {['College News', 'Independent', 'Neither'].map((option) => (
                <label key={option} className="radio-label">
                  <input
                    type="radio"
                    name="affiliation"
                    value={option.toLowerCase().replace(' ', '-')}
                    checked={formData.affiliation === option.toLowerCase().replace(' ', '-')}
                    onChange={(e) => setFormData({ ...formData, affiliation: e.target.value })}
                    required
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>

          <div className="button-group">
            <button 
              type="button" 
              className="button secondary"
              onClick={() => setShowSurvey(false)}
            >
              Skip
            </button>
            <button 
              type="submit" 
              className="button primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserSurvey;