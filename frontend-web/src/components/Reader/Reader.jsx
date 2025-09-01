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

import React, { useState, useEffect, useMemo } from 'react';
import { useEPUB } from '../../../../shared/hooks/useEPUB';
import { usePagination } from '../../../../shared/hooks/usePagination';
import Sidebar from '../Sidebar/Sidebar';
import PageView from '../PageView/PageView';
import ReadingControls from '../Controls/ReadingControls';
import SettingsSidebar from '../SettingsSidebar/SettingsSidebar';
import './Reader.css';

const Reader = ({bookData, onProgressUpdate}) => {
  // Get EPUB management functions and state from the useEPUB hook
  const {
    book,                    // Parsed book object with metadata and structure
    loading: epubLoading,    // Loading state for EPUB operations
    error,                   // Error messages from EPUB operations
    cssEnabled,              // Whether to apply EPUB's original CSS styling
    setCssEnabled,           // Toggle function for CSS styling
    loadParsedBook,         // Function to load pre-parsed book data
    loadChapterByHref,      // Function to load chapter by href (for TOC navigation)
  } = useEPUB();

  // UI state management for reader interface
  const [sidebarOpen, setSidebarOpen] = useState(true);      // Left sidebar visibility
  const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(false); // Settings sidebar
  const [fontSize, setFontSize] = useState(16);              // Text size in pixels
  const [theme, setTheme] = useState('light');               // Color theme (light/dark)
  const [viewport, setViewport] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });

  // Create render settings object for pagination
  const renderSettings = useMemo(() => ({
    fontSize,
    cssEnabled,
    viewport
  }), [fontSize, cssEnabled, viewport]);

  // Initialize pagination hook
  const {
    currentPage,
    totalPages,
    pageContent,
    calculating,
    calculatePages,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev
  } = usePagination(book, renderSettings);

  // Extract stable book ID for useEffect dependency
  const bookId = bookData?.id;

  /**
   * Effect to load book data when bookData prop changes
   * 
   * Process:
   * 1. Load the parsed book data into useEPUB hook
   * 2. This will trigger pagination calculation automatically
   * 
   * Dependencies: Only [bookId] to avoid infinite loops
   */
  useEffect(() => {
    if (bookData && bookData.parsedData && bookId) {
      // Load the parsed book data into the EPUB hook
      loadParsedBook(bookId, bookData.parsedData);
    }
  }, [bookId, loadParsedBook]);

  /**
   * Effect to trigger pagination calculation when book loads or settings change
   * 
   * This runs when:
   * - Book is loaded
   * - Font size changes
   * - CSS settings change
   * - Viewport size changes
   */
  useEffect(() => {
    if (book) {
      calculatePages();
    }
  }, [book, calculatePages]);

  /**
   * Effect to handle viewport size changes for responsive pagination
   */
  useEffect(() => {
    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * Effect to track and report reading progress
   * 
   * Calculates progress as percentage based on current page
   * Progress = (current page) / total pages * 100
   */
  useEffect(() => {
    if (book && currentPage && totalPages && onProgressUpdate) {
      // Calculate reading progress as percentage
      const progress = (currentPage / totalPages) * 100;
      
      // For compatibility, we still need to provide a chapter number
      // Estimate chapter from page (this is approximate)
      const estimatedChapter = Math.floor((currentPage - 1) / Math.max(1, totalPages / (book.spine?.length || 1)));
      
      // Report progress to parent for storage
      onProgressUpdate(estimatedChapter, progress);
    }
  }, [currentPage, totalPages, book, onProgressUpdate]);

  /**
   * Keyboard navigation handler for page-based navigation
   * 
   * Implements keyboard navigation:
   * - Left arrow: Previous page
   * - Right arrow: Next page
   * - Space: Next page
   * - Shift+Space: Previous page
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input field or settings sidebar is open
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || settingsSidebarOpen) {
        return;
      }
      
      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (canGoPrev) prevPage();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (canGoNext) nextPage();
          break;
        case ' ': // Spacebar
          e.preventDefault();
          if (e.shiftKey) {
            if (canGoPrev) prevPage();
          } else {
            if (canGoNext) nextPage();
          }
          break;
        case 'Escape': // Close settings sidebar
          if (settingsSidebarOpen) {
            setSettingsSidebarOpen(false);
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
  }, [nextPage, prevPage, canGoNext, canGoPrev, settingsSidebarOpen]);

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
    <div className={`reader-container theme-${theme} ${settingsSidebarOpen ? 'settings-sidebar-open' : ''}`}>
      {/* Left Sidebar - Table of contents and navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        book={book}                                     // Book structure for TOC
        currentChapter={0}                              // TODO: Map current page to chapter
        onNavigate={loadChapterByHref}                 // Handle TOC link clicks
        onChapterSelect={() => {}}                      // Disabled for now - need page mapping
      />
      
      {/* Main reading area */}
      <div className="reader-main">
        {/* Reading controls - navigation and settings toggle */}
        <ReadingControls
          currentPage={currentPage}                     // Current page number
          totalPages={totalPages}                       // Total pages for progress
          onPrevious={prevPage}                         // Previous page navigation
          onNext={nextPage}                            // Next page navigation
          settingsSidebarOpen={settingsSidebarOpen}    // Settings sidebar state
          onToggleSettingsSidebar={() => setSettingsSidebarOpen(!settingsSidebarOpen)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} // Toggle left sidebar
          sidebarOpen={sidebarOpen}                     // Left sidebar state
        />
        
        {/* Page content display - NO SCROLLING */}
        <PageView
          pageContent={pageContent}                     // Current page HTML content
          calculating={epubLoading || calculating}     // Loading state from useEPUB or pagination
          error={error}                                // Error messages
        />
      </div>
      
      {/* Settings Sidebar - Font, theme, navigation controls */}
      <SettingsSidebar
        isOpen={settingsSidebarOpen}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        theme={theme}
        onThemeChange={setTheme}
        currentPage={currentPage}
        totalPages={totalPages}
        onGoToPage={goToPage}
        // Future props for layout controls
        // textAlign={textAlign}
        // onTextAlignChange={setTextAlign}
        // margins={margins}
        // onMarginsChange={setMargins}
      />
    </div>
  );
};

export default Reader;