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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEPUB } from '../../../../shared/hooks/useEPUB';
import { usePagination } from '../../../../shared/hooks/usePagination';
import Sidebar from '../Sidebar/Sidebar';
import PageView from '../PageView/PageView';
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
  const [lineHeight, setLineHeight] = useState(1.8);       // Line height for text
  const containerRef = useRef(null);                       // Reference to content container
  const [containerDimensions, setContainerDimensions] = useState({ height: 600, width: 720 });

  // Extract stable book ID for useEffect dependency
  const bookId = bookData?.id;
  
  // Store chapter contents for pagination with lazy loading
  const [allChapters, setAllChapters] = useState([]);
  const [loadedChapters, setLoadedChapters] = useState(new Set());
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  
  // Load initial chapters when book loads (current + adjacent)
  useEffect(() => {
    const loadInitialChapters = async () => {
      if (book && book.spine && !isLoadingChapters) {
        console.log('Loading initial chapters for pagination, spine length:', book.spine.length);
        setIsLoadingChapters(true);
        
        // Initialize empty chapters array
        const chaptersData = book.spine.map((item, i) => ({
          content: null, // Will be loaded on demand
          title: book.navigation?.[i]?.label || `Chapter ${i + 1}`,
          index: i,
          loaded: false
        }));
        
        setAllChapters(chaptersData);
        
        // Load current chapter and adjacent ones
        const chaptersToLoad = [
          Math.max(0, currentChapter - 1),
          currentChapter,
          Math.min(book.spine.length - 1, currentChapter + 1)
        ];
        
        await loadChapterRange(chaptersToLoad);
        setIsLoadingChapters(false);
      }
    };
    loadInitialChapters();
  }, [book, currentChapter]); // Load based on current chapter position
  
  // Function to load specific chapters
  const loadChapterRange = async (chapterIndexes) => {
    if (!book) return;
    
    const newLoadedChapters = new Set(loadedChapters);
    const updatedChapters = [...allChapters];
    
    try {
      for (const i of chapterIndexes) {
        if (i >= 0 && i < book.spine.length && !newLoadedChapters.has(i)) {
          console.log(`Loading chapter ${i + 1}...`);
          
          const chapterData = await book.getChapter(i);
          
          // Debug: Log what we're actually getting from getChapter
          console.log(`Chapter ${i + 1} raw data:`, {
            hasContent: !!chapterData.content,
            contentType: typeof chapterData.content,
            contentLength: chapterData.content?.length,
            contentPreview: chapterData.content?.substring(0, 200),
            allFields: Object.keys(chapterData),
            title: chapterData.title,
            hasCss: !!chapterData.css
          });
          
          updatedChapters[i] = {
            content: chapterData.content,
            title: book.navigation?.[i]?.label || chapterData.title || `Chapter ${i + 1}`,
            index: i,
            css: chapterData.css,
            loaded: true
          };
          
          newLoadedChapters.add(i);
        }
      }
      
      setAllChapters(updatedChapters);
      setLoadedChapters(newLoadedChapters);
      console.log(`Loaded chapters. Total loaded: ${newLoadedChapters.size}/${book.spine.length}`);
      
    } catch (error) {
      console.error('Error loading chapter range:', error);
    }
  };
  
  // Initialize pagination hook
  const {
    pages,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    goToChapter,
    getCurrentPageContent,
    progress,
    currentChapter: currentChapterFromPage,
    isFirstPage,
    isLastPage
  } = usePagination({
    chapters: allChapters.filter(ch => ch.loaded || ch.content), // Only paginate loaded chapters
    currentChapterIndex: currentChapter,
    fontSize,
    lineHeight,
    containerHeight: containerDimensions.height,
    containerWidth: containerDimensions.width
  });

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
   * Calculates progress as percentage based on pages
   * Progress = (current page + 1) / total pages * 100
   * 
   * Dependencies: [currentPage, totalPages]
   * (onProgressUpdate intentionally excluded to prevent re-renders)
   */
  useEffect(() => {
    if (book && currentPage !== undefined && onProgressUpdate) {
      // Report progress to parent (ReaderPage) for storage
      onProgressUpdate(currentChapterFromPage, progress);
    }
  }, [currentPage, totalPages, currentChapterFromPage, progress]); // Exclude onProgressUpdate to prevent re-renders

  /**
   * Keyboard navigation handler
   * 
   * Implements Kindle-style keyboard navigation:
   * - Left arrow: Previous page
   * - Right arrow: Next page
   * - Space: Next page
   * - Shift+Space: Previous page
   * - G: Go to page dialog
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
          prevPage();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextPage();
          break;
        case ' ': // Spacebar
          e.preventDefault();
          if (e.shiftKey) {
            prevPage();
          } else {
            nextPage();
          }
          break;
        case 'g':
        case 'G':
          // TODO: Show go-to-page dialog
          e.preventDefault();
          const pageNum = prompt(`Go to page (1-${totalPages}):`);
          if (pageNum) {
            const page = parseInt(pageNum) - 1;
            if (page >= 0 && page < totalPages) {
              goToPage(page);
            }
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
  }, [nextPage, prevPage, goToPage, totalPages]);
  
  /**
   * Update container dimensions on mount and resize
   */
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const height = containerRef.current.offsetHeight || 600;
        const width = containerRef.current.offsetWidth || 720;
        console.log('Container dimensions:', { height, width });
        setContainerDimensions({ height, width });
      } else {
        console.log('Container ref not available, using defaults');
        setContainerDimensions({ height: 600, width: 720 });
      }
    };
    
    // Wait a bit for DOM to render before measuring
    const timer = setTimeout(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

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
        currentChapter={currentChapterFromPage}         // Highlight current chapter from page
        onNavigate={(href) => {                        // Handle TOC link clicks
          // Find chapter index and go to its first page
          const chapterIndex = book.spine.findIndex(item => item.href === href);
          if (chapterIndex !== -1) {
            goToChapter(chapterIndex);
          }
        }}
        onChapterSelect={goToChapter}                   // Handle direct chapter selection
      />
      
      {/* Main reading area */}
      <div className="reader-main" ref={containerRef}>
        {/* Reading controls - navigation, settings, theme */}
        <ReadingControls
          currentChapter={currentChapterFromPage}       // Current chapter from page
          totalChapters={totalPages}                    // Total pages instead of chapters
          fontSize={fontSize}                           // Current font size
          onFontSizeChange={setFontSize}               // Font size adjustment
          theme={theme}                                 // Current theme
          onThemeChange={setTheme}                     // Theme switching
          cssEnabled={cssEnabled}                       // EPUB CSS toggle state
          onCssToggle={() => setCssEnabled(!cssEnabled)} // Toggle EPUB styling
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} // Toggle sidebar
          sidebarOpen={sidebarOpen}                     // Sidebar state
        />
        
        {/* Page content display */}
        <PageView
          content={getCurrentPageContent()}             // Current page content
          pageInfo={{
            current: currentPage + 1,
            total: totalPages,
            chapterIndex: currentChapterFromPage,
            isFirstPage,
            isLastPage
          }}
          fontSize={fontSize}                          // Applied font size
          lineHeight={lineHeight}                      // Line height
          cssEnabled={cssEnabled}                      // Whether to apply EPUB CSS
          onNextPage={nextPage}                        // Next page navigation
          onPrevPage={prevPage}                        // Previous page navigation
          theme={theme}                                 // Current theme
        />
      </div>
    </div>
  );
};

export default Reader;