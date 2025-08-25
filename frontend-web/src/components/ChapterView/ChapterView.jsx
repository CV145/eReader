// frontend-web/src/components/ChapterView/ChapterView.jsx
import React, { useEffect, useRef } from 'react';
import './ChapterView.css';

const ChapterView = ({ content, loading, error, fontSize, cssEnabled }) => {
  const contentRef = useRef(null);
  const styleRef = useRef(null);

  useEffect(() => {
    if (content && cssEnabled && styleRef.current) {
      // Apply EPUB styles, scoped to the content area
      const scopedCSS = content.combinedCSS
        ? content.combinedCSS
            .split('\n')
            .map(line => {
              // Basic CSS scoping
              if (line.includes('{') && !line.trim().startsWith('@')) {
                return `.chapter-content ${line}`;
              }
              return line;
            })
            .join('\n')
        : '';
      
      styleRef.current.textContent = scopedCSS;
    } else if (styleRef.current) {
      styleRef.current.textContent = '';
    }
  }, [content, cssEnabled]);

  useEffect(() => {
    // Scroll to top when chapter changes
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [content]);

  if (loading) {
    return (
      <div className="chapter-view loading">
        <div className="spinner"></div>
        <p>Loading chapter...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chapter-view error">
        <p>❌ {error}</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="chapter-view empty">
        <p>No content to display</p>
      </div>
    );
  }

  return (
    <div className="chapter-view" ref={contentRef}>
      <style ref={styleRef}></style>
      <article
        className="chapter-content"
        style={{ fontSize: `${fontSize}px` }}
        dangerouslySetInnerHTML={{ __html: content.content }}
      />
    </div>
  );
};

export default ChapterView;