// frontend-web/src/components/Controls/ReadingControls.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft,
  FiMenu,
  FiChevronLeft,
  FiChevronRight,
  FiSettings
} from 'react-icons/fi';
import './Controls.css';

const ReadingControls = ({
  // Page-based navigation props (replaces chapter-based)
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  // Settings sidebar props
  settingsSidebarOpen,
  onToggleSettingsSidebar,
  // Left sidebar props (unchanged)
  onToggleSidebar,
  sidebarOpen
}) => {
  const navigate = useNavigate();
  
  return (
    <div className="reading-controls">
      <div className="controls-left">
        <button 
          onClick={() => navigate('/library')}
          className="control-btn back-btn"
          title="Back to Library"
        >
          <FiArrowLeft />
          <span>Back</span>
        </button>
        
        <button 
          onClick={onToggleSidebar}
          className="control-btn sidebar-toggle-btn"
          title="Toggle Sidebar"
        >
          <FiMenu />
        </button>
        
        <button 
          onClick={onPrevious}
          disabled={currentPage === 1}
          className="control-btn"
          title="Previous Page"
        >
          <FiChevronLeft />
        </button>
        
        <span className="page-indicator">
          Page <span>{currentPage}</span> of {totalPages}
        </span>
        
        <button 
          onClick={onNext}
          disabled={currentPage === totalPages}
          className="control-btn"
          title="Next Page"
        >
          <FiChevronRight />
        </button>
      </div>
      
      <div className="controls-center">
        <div className="keyboard-hint">
          Use ← → arrows or Space to navigate pages
        </div>
      </div>
      
      <div className="controls-right">
        {/* Replace individual controls with single Settings button */}
        <button 
          onClick={onToggleSettingsSidebar}
          className={`control-btn settings-toggle ${settingsSidebarOpen ? 'active' : ''}`}
          title="Reading Settings"
        >
          <FiSettings />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};

export default ReadingControls;