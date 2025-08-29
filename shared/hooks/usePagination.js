/**
 * usePagination Hook - Complete Book Pagination System
 * 
 * This hook provides page-based navigation for EPUB books, calculating pages dynamically
 * based on font size, viewport dimensions, and CSS settings. It replaces chapter-based
 * navigation with true page-based reading experience.
 * 
 * Key Features:
 * - Dynamic page calculation based on actual content dimensions
 * - Recalculates when font size or layout settings change
 * - Preserves reading position during recalculation
 * - Provides go-to-page functionality
 * - Handles content that spans multiple visual pages
 * 
 * @example
 * const {
 *   currentPage,
 *   totalPages,
 *   pageContent,
 *   calculating,
 *   calculatePages,
 *   goToPage
 * } = usePagination(book, renderSettings);
 */

import { useState, useCallback, useMemo } from 'react';

/**
 * PaginationEngine Class
 * 
 * Core engine that calculates how content should be split into pages.
 * Uses DOM measurement to determine how much content fits on each screen.
 */
class PaginationEngine {
  /**
   * Initialize PaginationEngine
   * 
   * @param {Object} book - Parsed EPUB book object with spine and getChapter method
   * @param {Object} renderSettings - Current rendering configuration
   * @param {number} renderSettings.fontSize - Font size in pixels
   * @param {boolean} renderSettings.cssEnabled - Whether EPUB CSS is applied
   * @param {Object} renderSettings.viewport - Viewport dimensions
   * @param {number} renderSettings.viewport.width - Viewport width in pixels
   * @param {number} renderSettings.viewport.height - Viewport height in pixels
   */
  constructor(book, renderSettings) {
    this.book = book;
    this.renderSettings = renderSettings;
    this.pageMap = []; // Array of page info objects
    this.totalPages = 0;
    this.measurementContainer = null; // DOM element for measuring content
  }

  /**
   * Create invisible DOM container for measuring content dimensions
   * 
   * Creates a hidden div with the same styling as the actual reading area.
   * This allows accurate measurement of how much content fits on each page.
   * 
   * @returns {HTMLDivElement} The measurement container element
   */
  createMeasurementContainer() {
    if (this.measurementContainer) {
      return this.measurementContainer;
    }

    // Create invisible container with same styles as reading area
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      top: -9999px;                                              /* Hide off-screen */
      left: -9999px;
      width: ${this.renderSettings.viewport.width - 400}px;      /* Account for sidebars */
      font-size: ${this.renderSettings.fontSize}px;             /* Match current font size */
      font-family: inherit;                                      /* Match reading area font */
      line-height: 1.6;                                         /* Match reading area spacing */
      visibility: hidden;                                       /* Extra hiding */
      pointer-events: none;                                     /* No user interaction */
    `;
    
    document.body.appendChild(container);
    this.measurementContainer = container;
    return container;
  }

  /**
   * Clean up measurement container to prevent memory leaks
   * 
   * Removes the measurement container from DOM when pagination calculation is complete.
   */
  cleanupMeasurementContainer() {
    if (this.measurementContainer && this.measurementContainer.parentNode) {
      this.measurementContainer.parentNode.removeChild(this.measurementContainer);
      this.measurementContainer = null;
    }
  }

  /**
   * Calculate total pages for entire book
   * 
   * Main pagination algorithm:
   * 1. Create measurement container with current settings
   * 2. Iterate through all chapters in book spine
   * 3. Measure how much content fits per page height
   * 4. Build pageMap with chapter boundaries and page breaks
   * 5. Return pagination data for navigation
   * 
   * @returns {Promise<Object>} Pagination result object
   * @returns {number} returns.totalPages - Total number of pages in book
   * @returns {Array} returns.pageMap - Array of page information objects
   * @returns {Function} returns.getPageInfo - Function to get page info by number
   */
  async calculateAllPages() {
    // Validate book data
    if (!this.book || !this.book.spine || this.book.spine.length === 0) {
      return {
        totalPages: 0,
        pageMap: [],
        getPageInfo: () => null
      };
    }

    try {
      // Setup measurement environment
      const container = this.createMeasurementContainer();
      const pageHeight = this.renderSettings.viewport.height - 120; // Account for controls and padding
      
      this.pageMap = [];
      let currentPage = 1;

      // Process each chapter in the book
      for (let chapterIndex = 0; chapterIndex < this.book.spine.length; chapterIndex++) {
        // Get chapter content from EPUB
        const chapter = await this.book.getChapter(chapterIndex);
        
        if (!chapter || !chapter.content) continue;

        // Render chapter content in measurement container to get actual height
        container.innerHTML = chapter.content;
        
        const contentHeight = container.scrollHeight; // Total content height
        const pagesInChapter = Math.max(1, Math.ceil(contentHeight / pageHeight)); // How many pages needed

        // Create page entries for this chapter
        for (let pageInChapter = 0; pageInChapter < pagesInChapter; pageInChapter++) {
          this.pageMap.push({
            pageNumber: currentPage,
            chapterIndex,
            pageInChapter,                                    // Page number within this chapter
            startOffset: pageInChapter * pageHeight,         // Pixel offset where page starts
            endOffset: (pageInChapter + 1) * pageHeight,     // Pixel offset where page ends
            chapterTitle: this.book.spine[chapterIndex].title || `Chapter ${chapterIndex + 1}`
          });
          currentPage++;
        }
      }

      this.totalPages = currentPage - 1;
      this.cleanupMeasurementContainer();

      return {
        totalPages: this.totalPages,
        pageMap: this.pageMap,
        /**
         * Get page information by page number
         * @param {number} pageNum - Page number (1-based)
         * @returns {Object|null} Page info object or null if invalid
         */
        getPageInfo: (pageNum) => {
          if (pageNum < 1 || pageNum > this.totalPages) return null;
          return this.pageMap[pageNum - 1]; // Convert to 0-based array index
        }
      };
    } catch (error) {
      console.error('Error calculating pages:', error);
      this.cleanupMeasurementContainer();
      return {
        totalPages: 0,
        pageMap: [],
        getPageInfo: () => null
      };
    }
  }

  /**
   * Extract content for a specific page
   * 
   * Takes a page info object and returns the HTML content that should be
   * displayed for that page. Handles content that spans partial chapters.
   * 
   * @param {Object} pageInfo - Page information object from pageMap
   * @param {number} pageInfo.chapterIndex - Which chapter this page belongs to
   * @param {number} pageInfo.pageInChapter - Page number within the chapter
   * @param {number} pageInfo.startOffset - Start pixel offset for content
   * @param {number} pageInfo.endOffset - End pixel offset for content
   * @returns {Promise<Object|null>} Page content object with HTML and CSS
   */
  async getPageContent(pageInfo) {
    if (!pageInfo || !this.book) return null;

    try {
      // Get full chapter content
      const chapter = await this.book.getChapter(pageInfo.chapterIndex);
      if (!chapter || !chapter.content) return null;

      // Create temporary container to work with content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = chapter.content;
      
      const contentHeight = tempDiv.scrollHeight;
      const pageHeight = this.renderSettings.viewport.height - 120;

      // If this is the first page and content fits entirely, return full content
      if (pageInfo.pageInChapter === 0 && contentHeight <= pageHeight) {
        return {
          content: chapter.content,
          combinedCSS: chapter.combinedCSS,
          chapterTitle: pageInfo.chapterTitle
        };
      }

      // For pages that need content slicing, create a clipped version
      const startOffset = pageInfo.startOffset;
      const endOffset = pageInfo.endOffset;
      
      // Clone content and apply CSS clipping to show only the relevant portion
      const clonedDiv = tempDiv.cloneNode(true);
      clonedDiv.style.cssText = `
        position: absolute;
        top: -${startOffset}px;        /* Offset to show correct portion */
        height: ${pageHeight}px;       /* Limit visible height */
        overflow: hidden;              /* Hide content outside page bounds */
      `;

      return {
        content: clonedDiv.innerHTML,
        combinedCSS: chapter.combinedCSS,
        chapterTitle: pageInfo.chapterTitle
      };
    } catch (error) {
      console.error('Error getting page content:', error);
      return null;
    }
  }
}

/**
 * Custom hook for book pagination
 * 
 * Provides page-based navigation system for EPUB books. Calculates pages
 * dynamically based on current font size and viewport dimensions.
 * 
 * @param {Object} book - Parsed EPUB book object
 * @param {Object} renderSettings - Current rendering settings (font, viewport, etc.)
 * @returns {Object} Pagination state and control functions
 */
export const usePagination = (book, renderSettings) => {
  // Core pagination state
  const [currentPage, setCurrentPage] = useState(1);          // Current page number (1-based)
  const [totalPages, setTotalPages] = useState(0);            // Total pages in book
  const [pageContent, setPageContent] = useState(null);       // Current page's HTML content
  const [paginationData, setPaginationData] = useState(null); // Pagination engine and data
  const [calculating, setCalculating] = useState(false);      // Whether pages are being calculated

  /**
   * Calculate pages for entire book
   * 
   * Main function that triggers pagination calculation. Called when:
   * - Book is loaded
   * - Font size changes
   * - Viewport size changes
   * - CSS settings change
   * 
   * Preserves current reading position after recalculation when possible.
   */
  const calculatePages = useCallback(async () => {
    if (!book || !renderSettings) return;
    
    setCalculating(true);
    try {
      // Create new pagination engine with current settings
      const engine = new PaginationEngine(book, renderSettings);
      const result = await engine.calculateAllPages();
      
      // Store pagination data with engine instance for content extraction
      setPaginationData({ ...result, engine });
      setTotalPages(result.totalPages);
      
      // Try to preserve current reading position
      if (currentPage <= result.totalPages && result.totalPages > 0) {
        // Current page is still valid after recalculation
        const pageInfo = result.getPageInfo(currentPage);
        if (pageInfo) {
          const content = await engine.getPageContent(pageInfo);
          setPageContent(content);
        }
      } else if (result.totalPages > 0) {
        // Current page is beyond new total, go to first page
        const pageInfo = result.getPageInfo(1);
        if (pageInfo) {
          const content = await engine.getPageContent(pageInfo);
          setPageContent(content);
          setCurrentPage(1);
        }
      }
    } catch (error) {
      console.error('Error in calculatePages:', error);
    } finally {
      setCalculating(false);
    }
  }, [book, renderSettings, currentPage]);

  /**
   * Load specific page by page number
   * 
   * @param {number} pageNumber - Page number to load (1-based)
   */
  const loadPage = useCallback(async (pageNumber) => {
    // Validate page number
    if (!paginationData || pageNumber < 1 || pageNumber > totalPages) {
      return;
    }
    
    try {
      // Get page info and extract content
      const pageInfo = paginationData.getPageInfo(pageNumber);
      if (pageInfo) {
        const content = await paginationData.engine.getPageContent(pageInfo);
        setPageContent(content);
        setCurrentPage(pageNumber);
      }
    } catch (error) {
      console.error('Error loading page:', error);
    }
  }, [paginationData, totalPages]);

  /**
   * Navigate to specific page with bounds checking
   * 
   * Public API for page navigation. Ensures page number is within valid range.
   * 
   * @param {number} pageNumber - Target page number
   */
  const goToPage = useCallback((pageNumber) => {
    // Clamp page number to valid range
    const targetPage = Math.max(1, Math.min(pageNumber, totalPages));
    if (targetPage !== currentPage) {
      loadPage(targetPage);
    }
  }, [loadPage, totalPages, currentPage]);

  /**
   * Navigate to next page
   */
  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, totalPages, goToPage]);

  /**
   * Navigate to previous page
   */
  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage]);

  // Computed navigation state
  const canGoNext = useMemo(() => currentPage < totalPages, [currentPage, totalPages]);
  const canGoPrev = useMemo(() => currentPage > 1, [currentPage]);

  // Return pagination interface
  return {
    // Current state
    currentPage,        // Current page number (1-based)
    totalPages,         // Total number of pages in book
    pageContent,        // HTML content for current page
    calculating,        // Whether pagination is being calculated
    
    // Control functions
    calculatePages,     // Recalculate all pages (call when settings change)
    loadPage,          // Load specific page by number
    goToPage,          // Navigate to specific page (public API)
    nextPage,          // Go to next page
    prevPage,          // Go to previous page
    
    // Navigation state
    canGoNext,         // Whether next page navigation is possible
    canGoPrev          // Whether previous page navigation is possible
  };
};