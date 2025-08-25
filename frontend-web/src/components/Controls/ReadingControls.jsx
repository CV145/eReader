// frontend-web/src/components/Controls/ReadingControls.jsx
import React from 'react';
import { 
  FiChevronLeft, 
  FiChevronRight, 
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
  onPrevious,
  onNext,
  fontSize,
  onFontSizeChange,
  theme,
  onThemeChange,
  cssEnabled,
  onCssToggle
}) => {
  return (
    <div className="reading-controls">
      <div className="controls-left">
        <button 
          onClick={onPrevious}
          disabled={currentChapter === 0}
          className="control-btn"
          title="Previous Chapter"
        >
          <FiChevronLeft />
        </button>
        
        <span className="chapter-indicator">
          Chapter {currentChapter + 1} of {totalChapters}
        </span>
        
        <button 
          onClick={onNext}
          disabled={currentChapter === totalChapters - 1}
          className="control-btn"
          title="Next Chapter"
        >
          <FiChevronRight />
        </button>
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