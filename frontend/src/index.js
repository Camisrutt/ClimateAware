// Import required React libraries and components
import React from 'react';
import ReactDOM from 'react-dom/client';

// Import styling
import './index.css';

// Import main App component
import App from './App';

// Import performance monitoring utility
import reportWebVitals from './reportWebVitals';

export { default as Sidebar } from './components/Sidebar';
export { default as UserSurvey } from './components/UserSurvey';
export { default as FeedbackButton } from './components/FeedbackButton';
export { default as WorkInProgressBanner } from './components/WorkInProgressBanner';
export { default as DataView } from './components/DataView';
export { default as SearchView } from './components/SearchView';
export { ArticleView, MapView, CommunityView } from './components/PlaceholderViews';


/**
 * Create Root Element
 * This is the main entry point for the React application
 * It uses the new React 18 createRoot API for concurrent features
 */
const root = ReactDOM.createRoot(document.getElementById('root'));

/**
 * Render the application
 * StrictMode is enabled for development best practices:
 * - Identifying unsafe lifecycles
 * - Warning about legacy string ref API usage
 * - Warning about deprecated findDOMNode usage
 * - Detecting unexpected side effects
 * - Detecting legacy context API
 */
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/**
 * Web Vitals Reporting
 * Measures and reports core web vitals:
 * - Largest Contentful Paint (LCP)
 * - First Input Delay (FID)
 * - Cumulative Layout Shift (CLS)
 * 
 * To start measuring performance:
 * - Pass a function to log results (e.g., reportWebVitals(console.log))
 * - Or send to an analytics endpoint
 * Learn more at: https://bit.ly/CRA-vitals
 */
reportWebVitals();