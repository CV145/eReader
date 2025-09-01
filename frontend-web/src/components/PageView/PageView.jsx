/**
 * PageView Component - Pure Content Display Only
 * 
 * SINGLE RESPONSIBILITY: Display exactly one page of content without scrolling.
 * 
 * This component does ONE job and ONE job only:
 * - Display page content in a fixed-height container with no scrolling
 * 
 * What this component does NOT do:
 * - No page numbers (ReadingControls handles this)
 * - No go-to-page controls (SettingsSidebar handles this) 
 * - No font size controls (SettingsSidebar handles this)
 * - No progress indicators (SettingsSidebar handles this)
 * - No user interaction whatsoever
 * - No headers, footers, or UI chrome
 * 
 * @param {Object} props - Component properties
 * @param {Object} props.pageContent - Page content object from usePagination
 * @param {string} props.pageContent.content - HTML content for current page
 * @param {string} props.pageContent.combinedCSS - CSS styles for content
 * @param {boolean} props.calculating - Whether pagination is being calculated
 * @param {string} props.error - Error message to display
 */

import React, { useMemo, useRef } from 'react';
import { FiLoader } from 'react-icons/fi';
import './PageView.css';

const PageView = ({ 
  pageContent,
  calculating = false,
  error
}) => {
  const styleRef = useRef(null);

  /**
   * Calculate available reading height
   * Must match PaginationEngine calculation exactly
   */
  const pageHeight = useMemo(() => {
    const controlsHeight = 60;  // ReadingControls height only
    return window.innerHeight - controlsHeight;
  }, []);

  // Handle calculating state
  if (calculating) {
    return (
      <div className="page-view calculating">
        <div 
          className="page-content-container calculating"
          style={{ height: `${pageHeight}px` }}
        >
          <div className="calculating-message">
            <FiLoader className="spinner" />
            <p>Calculating pages...</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="page-view error">
        <div 
          className="page-content-container error"
          style={{ height: `${pageHeight}px` }}
        >
          <div className="error-message">
            <p>L {error}</p>
          </div>
        </div>
      </div>
    );
  }

  // DEBUG: Log what PageView is receiving (temporarily disabled to see other logs)
  // if (pageContent) {
  //   console.log('🎨 PageView RECEIVING:', {
  //     contentType: typeof pageContent.content,
  //     contentLength: pageContent.content?.length || 0,
  //     hasClipperDiv: pageContent.content?.includes('content-clipper-debug') || false,
  //     contentPreview: pageContent.content?.substring(0, 150) + '...'
  //   });
  // }

  // Handle empty content state
  if (!pageContent || !pageContent.content) {
    return (
      <div className="page-view empty">
        <div 
          className="page-content-container empty"
          style={{ height: `${pageHeight}px` }}
        >
          <div className="empty-message">
            <p>No content available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-view">
      {/* EPUB CSS injection - scoped to page content only */}
      {pageContent.combinedCSS && (
        <style ref={styleRef}>
          {pageContent.combinedCSS
            .split('\n')
            .map(line => {
              // Scope CSS selectors to prevent conflicts
              if (line.includes('{') && !line.trim().startsWith('@')) {
                return `.page-content ${line}`;
              }
              return line;
            })
            .join('\n')}
        </style>
      )}
      
      {/* 
        CRITICAL: Fixed-height content container with NO SCROLLING
        This is the ONLY job of this component
      */}
      <div 
        className="page-content-container"
        style={{ 
          height: `${pageHeight}px`,
          overflow: 'hidden'  // NEVER allow scrolling within a page
        }}
      >
        <article
          className="page-content"
          dangerouslySetInnerHTML={{ __html: pageContent.content }}
          aria-label="Page content"
        />
      </div>
    </div>
  );
};

export default PageView;