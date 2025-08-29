/**
 * SettingsSidebar Component
 * 
 * A comprehensive settings panel that slides in from the right side of the screen.
 * Provides controls for reading customization including font size, page navigation,
 * theme selection, and future layout options.
 * 
 * Key Features:
 * - Font size control with +/- buttons and range slider
 * - Go-to-page functionality with input validation
 * - Theme selection (light/dark) with visual feedback
 * - Scaffolded layout controls for future implementation
 * - Responsive design that works on various screen sizes
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.isOpen - Whether the sidebar is currently visible
 * @param {number} props.fontSize - Current font size in pixels
 * @param {Function} props.onFontSizeChange - Callback when font size changes
 * @param {string} props.theme - Current theme ('light' or 'dark')
 * @param {Function} props.onThemeChange - Callback when theme changes
 * @param {number} props.currentPage - Current page number (1-based)
 * @param {number} props.totalPages - Total number of pages in book
 * @param {Function} props.onGoToPage - Callback to navigate to specific page
 */

import React, { useState } from 'react';
import { 
  FiMinus, 
  FiPlus, 
  FiSun, 
  FiMoon, 
  FiNavigation,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignJustify
} from 'react-icons/fi';
import './SettingsSidebar.css';

const SettingsSidebar = ({ 
  isOpen, 
  fontSize, 
  onFontSizeChange, 
  theme, 
  onThemeChange,
  currentPage,
  totalPages,
  onGoToPage,
  // Future props for layout controls
  textAlign = 'left',
  onTextAlignChange = () => {},
  margins = 20,
  onMarginsChange = () => {}
}) => {
  // Local state for go-to-page functionality
  const [goToPageInput, setGoToPageInput] = useState('');
  const [showGoToPage, setShowGoToPage] = useState(false);

  /**
   * Handle go-to-page form submission
   * 
   * Validates the input page number and navigates if valid.
   * Closes the form and resets input on successful navigation.
   * 
   * @param {Event} e - Form submit event
   */
  const handleGoToSubmit = (e) => {
    e.preventDefault();
    const pageNum = parseInt(goToPageInput);
    
    // Validate page number is within bounds
    if (pageNum && pageNum >= 1 && pageNum <= totalPages) {
      onGoToPage(pageNum);
      setGoToPageInput('');
      setShowGoToPage(false);
    } else {
      // Could add error feedback here in the future
      console.warn(`Invalid page number: ${pageNum}. Must be between 1 and ${totalPages}`);
    }
  };

  /**
   * Handle font size adjustment with bounds checking
   * 
   * @param {number} newSize - New font size to apply
   */
  const handleFontSizeChange = (newSize) => {
    // Ensure font size stays within reasonable bounds
    const clampedSize = Math.max(12, Math.min(32, newSize));
    onFontSizeChange(clampedSize);
  };

  /**
   * Get progress percentage for visual progress indicator
   * 
   * @returns {number} Progress percentage (0-100)
   */
  const getProgressPercent = () => {
    if (totalPages === 0) return 0;
    return (currentPage / totalPages) * 100;
  };

  return (
    <div className={`settings-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="settings-sidebar-content">
        
        {/* Font Size Controls Section */}
        <div className="settings-section">
          <h3 className="section-title">Font Size</h3>
          <div className="font-size-controls">
            {/* Decrease font size button */}
            <button 
              onClick={() => handleFontSizeChange(fontSize - 2)}
              className="control-btn size-btn"
              disabled={fontSize <= 12}
              title="Decrease font size"
              aria-label="Decrease font size"
            >
              <FiMinus />
            </button>
            
            {/* Font size display and slider */}
            <div className="font-size-display">
              <span className="font-size-value" aria-live="polite">
                {fontSize}px
              </span>
              <input 
                type="range" 
                min="12" 
                max="32" 
                step="2"
                value={fontSize}
                onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                className="font-size-slider"
                aria-label="Font size slider"
              />
            </div>
            
            {/* Increase font size button */}
            <button 
              onClick={() => handleFontSizeChange(fontSize + 2)}
              className="control-btn size-btn"
              disabled={fontSize >= 32}
              title="Increase font size"
              aria-label="Increase font size"
            >
              <FiPlus />
            </button>
          </div>
        </div>

        {/* Page Navigation Section */}
        <div className="settings-section">
          <h3 className="section-title">Navigation</h3>
          <div className="navigation-controls">
            {/* Current page information */}
            <div className="page-info">
              <span className="current-page" aria-live="polite">
                Page {currentPage} of {totalPages}
              </span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${getProgressPercent()}%` }}
                  aria-hidden="true"
                />
              </div>
            </div>
            
            {/* Go to page button */}
            <button 
              className={`go-to-page-btn ${showGoToPage ? 'active' : ''}`}
              onClick={() => setShowGoToPage(!showGoToPage)}
              title="Go to specific page"
              aria-expanded={showGoToPage}
            >
              <FiNavigation />
              Go to Page
            </button>
            
            {/* Go to page input form */}
            {showGoToPage && (
              <form className="go-to-page-form" onSubmit={handleGoToSubmit}>
                <div className="form-group">
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={goToPageInput}
                    onChange={(e) => setGoToPageInput(e.target.value)}
                    placeholder={`1-${totalPages}`}
                    className="page-input"
                    autoFocus
                    aria-label="Page number to navigate to"
                  />
                  <div className="form-buttons">
                    <button 
                      type="submit"
                      className="control-btn primary"
                      disabled={!goToPageInput}
                    >
                      Go
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowGoToPage(false);
                        setGoToPageInput('');
                      }}
                      className="control-btn secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Theme Selection Section */}
        <div className="settings-section">
          <h3 className="section-title">Appearance</h3>
          <div className="theme-controls">
            <button 
              className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => onThemeChange('light')}
              title="Switch to light theme"
              aria-pressed={theme === 'light'}
            >
              <FiSun />
              <span>Light</span>
            </button>
            <button 
              className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => onThemeChange('dark')}
              title="Switch to dark theme"
              aria-pressed={theme === 'dark'}
            >
              <FiMoon />
              <span>Dark</span>
            </button>
          </div>
        </div>

        {/* Future Features - Text Layout Section (Scaffolded) */}
        <div className="settings-section layout-section">
          <h3 className="section-title">Text Layout</h3>
          <div className="layout-controls">
            
            {/* Text Alignment Controls */}
            <div className="control-group">
              <label className="control-label">Text Alignment</label>
              <div className="alignment-buttons">
                <button 
                  className={`alignment-btn ${textAlign === 'left' ? 'active' : ''}`}
                  onClick={() => onTextAlignChange('left')}
                  title="Align text left"
                  aria-pressed={textAlign === 'left'}
                  disabled // Disabled until implementation
                >
                  <FiAlignLeft />
                </button>
                <button 
                  className={`alignment-btn ${textAlign === 'center' ? 'active' : ''}`}
                  onClick={() => onTextAlignChange('center')}
                  title="Center text"
                  aria-pressed={textAlign === 'center'}
                  disabled // Disabled until implementation
                >
                  <FiAlignCenter />
                </button>
                <button 
                  className={`alignment-btn ${textAlign === 'justify' ? 'active' : ''}`}
                  onClick={() => onTextAlignChange('justify')}
                  title="Justify text"
                  aria-pressed={textAlign === 'justify'}
                  disabled // Disabled until implementation
                >
                  <FiAlignJustify />
                </button>
              </div>
            </div>
            
            {/* Page Margins Control */}
            <div className="control-group">
              <label className="control-label">Page Margins</label>
              <div className="margin-control">
                <input 
                  type="range" 
                  min="10" 
                  max="50" 
                  step="5"
                  value={margins}
                  onChange={(e) => onMarginsChange(parseInt(e.target.value))}
                  className="margin-slider"
                  disabled // Disabled until implementation
                  aria-label="Page margin width"
                />
                <span className="margin-value">{margins}px</span>
              </div>
              <p className="control-help">
                Adjust the white space around page content
              </p>
            </div>
            
          </div>
          
          {/* Coming Soon Notice */}
          <div className="coming-soon">
            <p>More layout options coming soon!</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsSidebar;