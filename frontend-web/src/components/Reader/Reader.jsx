/**
 * Reader Component
 * 
 * The main reading interface that orchestrates all reading-related functionality.
 * This component combines the sidebar, chapter view, and reading controls into
 * a cohesive reading experience.
 * 
 * Key responsibilities:
 * 1. Manage EPUB state using the useEPUB hook
 * 2. Handle book loading and chapter navigation
 * 3. Coordinate between sidebar, content, and controls
 * 4. Manage UI state (theme, font size, sidebar visibility)
 * 5. Track and report reading progress
 * 
 * Props:
 * - bookData: Combined book metadata and parsed EPUB data
 * - onProgressUpdate: Callback to report reading progress changes
 * - onBack: Callback to navigate back to library
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useEPUB } from '../../../../shared/hooks/useEPUB';
import Sidebar from '../Sidebar/Sidebar';
import ChapterView from '../ChapterView/ChapterView';
import ReadingControls from '../Controls/ReadingControls';
import './Reader.css';

const Reader = ({bookData, onProgressUpdate, onBack}) => {
  // Get EPUB management functions and state from the useEPUB hook
  const {
    book,                    // Parsed book object with metadata and structure
    currentChapter,          // Current chapter index (0-based)
    chapterContent,          // Current chapter's HTML content and CSS
    loading,                 // Loading state for async operations
    error,                   // Error messages from EPUB operations
    cssEnabled,              // Whether to apply EPUB's original CSS styling
    setCssEnabled,           // Toggle function for CSS styling
    loadEPUB,               // Function to load EPUB from file (unused - kept for future features)
    loadParsedBook,         // Function to load pre-parsed book data
    loadChapter,            // Function to load specific chapter by index
    loadChapterByHref,      // Function to load chapter by href (for navigation)
    nextChapter,            // Function to navigate to next chapter
    prevChapter,            // Function to navigate to previous chapter
    totalChapters           // Total number of chapters in the book
  } = useEPUB();

  // UI state management for reader interface
  const [sidebarOpen, setSidebarOpen] = useState(true);    // Sidebar visibility
  const [fontSize, setFontSize] = useState(16);            // Text size in pixels
  const [theme, setTheme] = useState('light');             // Color theme (light/dark)

  // Extract stable book ID for useEffect dependency
  const bookId = bookData?.id;

  /**
   * Effect to load book data when bookData prop changes
   * 
   * This runs when:
   * - New book is selected (bookId changes)
   * - Component mounts with bookData
   * 
   * Process:
   * 1. Load the parsed book data into useEPUB hook
   * 2. Restore user's last reading position if available
   * 
   * Dependencies: Only [bookId] to avoid infinite loops
   * (loadParsedBook and loadChapter are intentionally excluded)
   */
  useEffect(() => {
    if (bookData && bookData.parsedData && bookId) {
      // Load the parsed book data into the EPUB hook
      loadParsedBook(bookId, bookData.parsedData).then(() => {
        // After book is loaded, restore reading position if user was partway through
        if (bookData.currentChapter) {
            loadChapter(bookData.currentChapter);
        }
      });
    }
  }, [bookId]); // Only depend on bookId to prevent infinite re-renders

  /**
   * Effect to track and report reading progress
   * 
   * Calculates progress as percentage and reports to parent component
   * Progress = (current chapter + 1) / total chapters * 100
   * 
   * Dependencies: [currentChapter, totalChapters]
   * (onProgressUpdate intentionally excluded to prevent re-renders)
   */
  useEffect(() => {
    if (book && currentChapter !== undefined && onProgressUpdate) {
      // Calculate reading progress as percentage
      const progress = ((currentChapter + 1) / totalChapters) * 100;
      
      // Report progress to parent (ReaderPage) for storage
      onProgressUpdate(currentChapter, progress);
    }
  }, [currentChapter, totalChapters]); // Exclude onProgressUpdate to prevent re-renders

  /**
   * Keyboard navigation handler
   * 
   * Implements Kindle-style keyboard navigation:
   * - Left arrow: Previous chapter
   * - Right arrow: Next chapter
   * - Space: Next chapter
   * - Shift+Space: Previous chapter
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          prevChapter();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextChapter();
          break;
        case ' ': // Spacebar
          e.preventDefault();
          if (e.shiftKey) {
            prevChapter();
          } else {
            nextChapter();
          }
          break;
        default:
          break;
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [nextChapter, prevChapter]);

  // Show loading state if book data hasn't been loaded yet
  if (!book) {
    return (
      <div className="reader-container">
        <div className="reader-loading">
          <p>Preparing book...</p>
        </div>
      </div>
    );
  }

  // Main reader interface with all components
  return (
    <div className={`reader-container theme-${theme}`}>
      {/* Sidebar - Table of contents and navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        book={book}                                     // Book structure for TOC
        currentChapter={currentChapter}                 // Highlight current chapter
        onNavigate={loadChapterByHref}                 // Handle TOC link clicks
        onChapterSelect={loadChapter}                   // Handle direct chapter selection
      />
      
      {/* Main reading area */}
      <div className="reader-main">
        {/* Reading controls - navigation, settings, theme */}
        <ReadingControls
          currentChapter={currentChapter}               // Current position
          totalChapters={totalChapters}                 // Total for progress indicator
          fontSize={fontSize}                           // Current font size
          onFontSizeChange={setFontSize}               // Font size adjustment
          theme={theme}                                 // Current theme
          onThemeChange={setTheme}                     // Theme switching
          cssEnabled={cssEnabled}                       // EPUB CSS toggle state
          onCssToggle={() => setCssEnabled(!cssEnabled)} // Toggle EPUB styling
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} // Toggle sidebar
          sidebarOpen={sidebarOpen}                     // Sidebar state
        />
        
        {/* Chapter content display */}
        <ChapterView
          content={chapterContent}                      // Chapter HTML content
          loading={loading}                            // Loading state from useEPUB
          error={error}                                // Error messages
          fontSize={fontSize}                          // Applied font size
          cssEnabled={cssEnabled}                      // Whether to apply EPUB CSS
        />
      </div>
    </div>
  );
};

export default Reader;