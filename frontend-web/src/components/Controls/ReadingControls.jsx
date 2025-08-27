// frontend-web/src/components/Controls/ReadingControls.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft,
  FiMenu,
  FiMinus, 
  FiPlus,
  FiSun,
  FiMoon,
  FiType
} from 'react-icons/fi';
import './Controls.css';

const ReadingControls = ({
  currentChapter,
  totalChapters,
  fontSize,
  onFontSizeChange,
  theme,
  onThemeChange,
  cssEnabled,
  onCssToggle,
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
        
        <span className="chapter-indicator">
          Page <span>{currentChapter + 1}</span> of {totalChapters}
        </span>
      </div>
      
      <div className="controls-center">
        <div className="keyboard-hint">
          Use ← → arrows or Space to navigate
        </div>
      </div>
      
      <div className="controls-right">
        <div className="font-controls">
          <button 
            onClick={() => onFontSizeChange(Math.max(12, fontSize - 2))}
            className="control-btn"
            title="Decrease Font Size"
          >
            <FiMinus />
          </button>
          <span className="font-size">{fontSize}px</span>
          <button 
            onClick={() => onFontSizeChange(Math.min(32, fontSize + 2))}
            className="control-btn"
            title="Increase Font Size"
          >
            <FiPlus />
          </button>
        </div>
        
        <button
          onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
          className="control-btn theme-toggle"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? <FiMoon /> : <FiSun />}
        </button>
        
        <button
          onClick={onCssToggle}
          className={`control-btn css-toggle ${cssEnabled ? 'active' : ''}`}
          title={`${cssEnabled ? 'Disable' : 'Enable'} EPUB Styles`}
        >
          <FiType />
        </button>
      </div>
    </div>
  );
};

export default ReadingControls;