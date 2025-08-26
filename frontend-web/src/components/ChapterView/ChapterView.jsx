/**
 * ChapterView Component
 * 
 * Displays the content of an EPUB chapter with proper styling and formatting.
 * Handles EPUB CSS application, font sizing, and content presentation.
 * 
 * Key Features:
 * - Renders chapter HTML content safely
 * - Applies EPUB's original CSS (when enabled)
 * - Scopes CSS to prevent global style conflicts
 * - Adjustable font size
 * - Loading and error states
 * - Auto-scroll to top on chapter change
 * 
 * Props:
 * - content: Chapter object with HTML content and CSS
 * - loading: Loading state from useEPUB
 * - error: Error message to display
 * - fontSize: Font size in pixels for content
 * - cssEnabled: Whether to apply EPUB's original CSS
 */

import React, { useEffect, useRef } from 'react';
import './ChapterView.css';

const ChapterView = ({ content, loading, error, fontSize, cssEnabled }) => {
  // Refs for DOM manipulation
  const contentRef = useRef(null);  // Main content container for scrolling
  const styleRef = useRef(null);    // Style element for dynamic CSS injection

  /**
   * Effect to handle EPUB CSS styling
   * 
   * Processes and applies the EPUB's original CSS when enabled.
   * Scopes CSS selectors to prevent conflicts with app styles.
   * 
   * CSS Scoping Process:
   * 1. Take EPUB's combined CSS
   * 2. Prefix selectors with .chapter-content
   * 3. Inject into style element
   * 4. Clear styles when CSS is disabled
   */
  useEffect(() => {
    if (content && cssEnabled && styleRef.current) {
      // Process EPUB CSS and scope it to the chapter content area
      const scopedCSS = content.combinedCSS
        ? content.combinedCSS
            .split('\n')
            .map(line => {
              // Add .chapter-content prefix to CSS selectors
              // Skip @-rules (like @media, @font-face) which don't need scoping
              if (line.includes('{') && !line.trim().startsWith('@')) {
                return `.chapter-content ${line}`;
              }
              return line;
            })
            .join('\n')
        : '';
      
      // Inject the scoped CSS into the style element
      styleRef.current.textContent = scopedCSS;
    } else if (styleRef.current) {
      // Clear styles when CSS is disabled or no content
      styleRef.current.textContent = '';
    }
  }, [content, cssEnabled]);

  /**
   * Effect to handle chapter transitions
   * 
   * Automatically scrolls to the top when a new chapter loads.
   * This ensures users always start reading from the beginning of each chapter.
   */
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [content]); // Run when chapter content changes

  // Loading state: Show spinner while chapter is being loaded
  if (loading) {
    return (
      <div className="chapter-view loading">
        <div className="spinner"></div>
        <p>Loading chapter...</p>
      </div>
    );
  }

  // Error state: Display error message
  if (error) {
    return (
      <div className="chapter-view error">
        <p>❌ {error}</p>
      </div>
    );
  }

  // Empty state: No content available
  if (!content) {
    return (
      <div className="chapter-view empty">
        <p>No content to display</p>
      </div>
    );
  }

  // Main content display
  return (
    <div className="chapter-view" ref={contentRef}>
      {/* Dynamic CSS injection for EPUB styles */}
      <style ref={styleRef}></style>
      
      {/* Chapter content with user font size */}
      <article
        className="chapter-content"
        style={{ fontSize: `${fontSize}px` }}
        dangerouslySetInnerHTML={{ __html: content.content }}
        aria-label="Chapter content"
      />
    </div>
  );
};

export default ChapterView;

/**
 * Security Note:
 * This component uses dangerouslySetInnerHTML to render EPUB content.
 * This is necessary because EPUB chapters contain rich HTML formatting.
 * The content comes from trusted EPUB files parsed by our EPUBParser,
 * which sanitizes and processes the HTML appropriately.
 */