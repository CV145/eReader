/**
 * PageView Component
 * 
 * Renders a single page of content with proper pagination
 * Handles page rendering, transitions, and touch/click navigation
 */

import React, { useRef, useEffect, useState } from 'react';
import './PageView.css';

const PageView = ({
  content,
  pageInfo,
  fontSize,
  lineHeight,
  cssEnabled,
  onNextPage,
  onPrevPage,
  theme
}) => {
  const pageRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const [clickZones, setClickZones] = useState({ left: 0, right: 0 });

  /**
   * Set up click zones for page navigation
   * Left 30% - previous page, Right 30% - next page
   */
  useEffect(() => {
    if (pageRef.current) {
      const width = pageRef.current.offsetWidth;
      setClickZones({
        left: width * 0.3,
        right: width * 0.7
      });
    }
  }, []);

  /**
   * Handle click navigation
   */
  const handleClick = (e) => {
    const x = e.clientX - pageRef.current.getBoundingClientRect().left;
    
    if (x < clickZones.left) {
      onPrevPage();
    } else if (x > clickZones.right) {
      onNextPage();
    }
  };

  /**
   * Handle touch start for swipe navigation
   */
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  /**
   * Handle touch end for swipe navigation
   */
  const handleTouchEnd = (e) => {
    if (!touchStart) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    // Swipe threshold of 50px
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swiped left - next page
        onNextPage();
      } else {
        // Swiped right - previous page
        onPrevPage();
      }
    }
    
    setTouchStart(null);
  };

  /**
   * Apply custom styles based on settings
   */
  const pageStyles = {
    fontSize: `${fontSize}px`,
    lineHeight: lineHeight,
    fontFamily: cssEnabled ? 'inherit' : 'Merriweather, Georgia, serif'
  };

  if (!content || !pageInfo) {
    console.log('PageView: Missing content or pageInfo', { content: !!content, pageInfo: !!pageInfo });
    return (
      <div className="page-view empty">
        <p>No content available</p>
      </div>
    );
  }
  
  console.log('PageView rendering:', { 
    pageNumber: pageInfo.current, 
    totalPages: pageInfo.total, 
    contentLength: content.content?.length 
  });

  return (
    <div 
      ref={pageRef}
      className={`page-view theme-${theme}`}
      style={pageStyles}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Page header with chapter info */}
      <div className="page-header">
        <span className="chapter-title">{content.chapterTitle}</span>
        <span className="page-number">
          {pageInfo.current} of {pageInfo.total}
        </span>
      </div>

      {/* Page content */}
      <div className="page-content">
        {/* Render actual HTML content from EPUB */}
        <div 
          className="page-text"
          dangerouslySetInnerHTML={{ __html: content.content }}
        />
      </div>

      {/* Page footer with progress */}
      <div className="page-footer">
        <div className="reading-progress">
          <div 
            className="progress-bar" 
            style={{ width: `${(pageInfo.current / pageInfo.total) * 100}%` }}
          />
        </div>
        <div className="page-info">
          Page {pageInfo.current} • {Math.round((pageInfo.current / pageInfo.total) * 100)}%
        </div>
      </div>

      {/* Navigation hints */}
      <div className="nav-zones">
        <div className="nav-zone prev" title="Previous page" />
        <div className="nav-zone next" title="Next page" />
      </div>
    </div>
  );
};

export default PageView;