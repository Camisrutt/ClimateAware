import React from 'react';
import './WorkInProgressBanner.css';

const WorkInProgressBanner = () => {
  return (
    <div className="wip-banner">
      <div className="wip-content">
        <span className="wip-text">Work in Progress - Please bear with any bugs and report them or any suggestions below. Thank you!</span>
      </div>
    </div>
  );
};

export default WorkInProgressBanner;