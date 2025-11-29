import React from 'react';
import './HomeBar.css';

const HomeBar = () => {
  return (
    <div className="homebar">
      {/* Left: App Title */}
      <div className="homebar-left">
        <h1 className="app-title">Deepnest React</h1>
      </div>

      {/* Right: Optional actions could go here */}
      <div className="homebar-right">
        {/* Future: Settings, help, etc. */}
      </div>
    </div>
  );
};

export default HomeBar;
