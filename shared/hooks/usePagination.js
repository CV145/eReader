/**
 * usePagination Hook
 * 
 * Manages pagination of EPUB content, splitting chapters into pages
 * based on viewport dimensions, font size, and line height.
 * 
 * This hook handles:
 * 1. Calculating page breaks for content
 * 2. Tracking current page position
 * 3. Navigation between pages
 * 4. Recalculating pages on resize/font change
 * 5. Mapping between chapters and pages
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export const usePagination = ({
  chapters = [],
  currentChapterIndex = 0,
  fontSize = 16,
  lineHeight = 1.8,
  containerHeight = 600,
  containerWidth = 720
}) => {
  // State for pagination
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageMap, setPageMap] = useState({}); // Maps page numbers to chapter/position
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Cache for processed chapters
  const processedChapters = useRef([]);

  /**
   * Calculate approximate characters per page
   * Based on viewport size and font settings
   */
  const calculateCharsPerPage = useCallback(() => {
    // Approximate calculations based on typical character widths
    const avgCharWidth = fontSize * 0.5; // Rough estimate
    const charsPerLine = Math.floor(containerWidth / avgCharWidth);
    const lineHeightPx = fontSize * lineHeight;
    const linesPerPage = Math.floor(containerHeight / lineHeightPx);
    const charsPerPage = charsPerLine * linesPerPage;
    
    // Account for padding and margins (reduce by ~15%)
    return Math.floor(charsPerPage * 0.85);
  }, [fontSize, lineHeight, containerHeight, containerWidth]);

  /**
   * Split content into pages
   * This is a simplified version - in production, you'd want more sophisticated
   * text measurement using actual DOM rendering
   */
  const paginateContent = useCallback(async () => {
    if (chapters.length === 0) {
      console.log('No chapters to paginate');
      return;
    }
    
    setIsCalculating(true);
    console.log('Starting pagination with chapters:', chapters.length, 'container:', { containerHeight, containerWidth });
    
    // Debug: Log the chapters array structure
    console.log('Chapters array content:', chapters.map((ch, i) => ({
      index: i,
      hasContent: !!ch?.content,
      contentLength: ch?.content?.length,
      contentPreview: ch?.content?.substring(0, 50),
      loaded: ch?.loaded,
      title: ch?.title
    })));
    
    const charsPerPage = calculateCharsPerPage();
    console.log('Calculated chars per page:', charsPerPage);
    
    const newPages = [];
    const newPageMap = {};
    let globalPageIndex = 0;
    
    // Process each chapter
    chapters.forEach((chapter, chapterIndex) => {
      if (!chapter) {
        console.log('Skipping missing chapter:', chapterIndex);
        return;
      }
      
      // Handle chapters that haven't been loaded yet
      if (!chapter.content || !chapter.loaded) {
        console.log('Chapter not loaded yet, creating placeholder page:', chapterIndex);
        // Create a placeholder page for unloaded chapters
        newPages.push({
          pageNumber: globalPageIndex,
          chapterIndex: chapterIndex,
          chapterTitle: chapter.title || `Chapter ${chapterIndex + 1}`,
          startOffset: 0,
          endOffset: 0,
          content: `<div class="loading-chapter"><p>Loading ${chapter.title || `Chapter ${chapterIndex + 1}`}...</p></div>`,
          textContent: `Loading ${chapter.title}...`,
          isFirstPageOfChapter: true,
          isLastPageOfChapter: true,
          isPlaceholder: true
        });
        
        newPageMap[globalPageIndex] = {
          chapter: chapterIndex,
          pageInChapter: 0,
          totalPagesInChapter: 1
        };
        
        globalPageIndex++;
        return;
      }
      
      // For HTML content, we need a different approach
      // Strip HTML tags for character counting, but preserve HTML for display
      const textContent = chapter.content.replace(/<[^>]*>/g, '');
      const chapterLength = textContent.length;
      
      // Debug: Log the content processing
      console.log(`Chapter ${chapterIndex + 1} content processing:`, {
        originalHTMLLength: chapter.content?.length,
        htmlPreview: chapter.content?.substring(0, 100),
        strippedTextLength: chapterLength,
        textPreview: textContent.substring(0, 100),
        charsPerPage: charsPerPage
      });
      
      // Calculate pages, but ensure minimum of 1 page per chapter
      const pagesInChapter = Math.max(1, Math.ceil(chapterLength / charsPerPage));
      
      console.log(`Chapter ${chapterIndex + 1}: ${chapterLength} chars, ${pagesInChapter} pages`);
      
      // For now, split HTML content roughly by character count
      // This is a simplified approach - ideally we'd parse and split at proper HTML boundaries
      const htmlContent = chapter.content;
      
      // Create pages for this chapter
      for (let pageInChapter = 0; pageInChapter < pagesInChapter; pageInChapter++) {
        let pageContent;
        
        if (pagesInChapter === 1) {
          // Single page - use full content
          pageContent = htmlContent;
        } else {
          // Multiple pages - split the text content and try to preserve some HTML structure
          const startChar = pageInChapter * charsPerPage;
          const endChar = Math.min(startChar + charsPerPage, chapterLength);
          const pageText = textContent.substring(startChar, endChar);
          
          // Simple approach: wrap the text chunk in basic HTML
          // In production, you'd want sophisticated HTML splitting
          pageContent = `<div class="page-content-chunk">${pageText}</div>`;
          
          // If it's the first page, try to include any chapter title from original HTML
          if (pageInChapter === 0) {
            const titleMatch = htmlContent.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/i);
            if (titleMatch) {
              pageContent = titleMatch[0] + pageContent;
            }
          }
        }
        
        newPages.push({
          pageNumber: globalPageIndex,
          chapterIndex: chapterIndex,
          chapterTitle: chapter.title || `Chapter ${chapterIndex + 1}`,
          startOffset: pageInChapter * charsPerPage,
          endOffset: Math.min((pageInChapter + 1) * charsPerPage, chapterLength),
          content: pageContent, // This is now HTML content
          textContent: textContent.substring(pageInChapter * charsPerPage, Math.min((pageInChapter + 1) * charsPerPage, chapterLength)),
          isFirstPageOfChapter: pageInChapter === 0,
          isLastPageOfChapter: pageInChapter === pagesInChapter - 1
        });
        
        newPageMap[globalPageIndex] = {
          chapter: chapterIndex,
          pageInChapter: pageInChapter,
          totalPagesInChapter: pagesInChapter
        };
        
        globalPageIndex++;
      }
    });
    
    console.log('Pagination complete. Total pages:', globalPageIndex);
    
    setPages(newPages);
    setPageMap(newPageMap);
    setTotalPages(newPages.length);
    setIsCalculating(false);
    
    return newPages;
  }, [chapters, calculateCharsPerPage, containerHeight, containerWidth]);

  /**
   * Navigate to a specific page
   */
  const goToPage = useCallback((pageNumber) => {
    if (pageNumber >= 0 && pageNumber < totalPages) {
      setCurrentPage(pageNumber);
      return true;
    }
    return false;
  }, [totalPages]);

  /**
   * Navigate to next page
   */
  const nextPage = useCallback(() => {
    console.log('nextPage called, currentPage:', currentPage, 'totalPages:', totalPages);
    const success = goToPage(currentPage + 1);
    console.log('nextPage result:', success, 'new currentPage should be:', currentPage + 1);
    return success;
  }, [currentPage, goToPage, totalPages]);

  /**
   * Navigate to previous page
   */
  const prevPage = useCallback(() => {
    console.log('prevPage called, currentPage:', currentPage, 'totalPages:', totalPages);
    const success = goToPage(currentPage - 1);
    console.log('prevPage result:', success, 'new currentPage should be:', currentPage - 1);
    return success;
  }, [currentPage, goToPage, totalPages]);

  /**
   * Jump to a specific chapter
   */
  const goToChapter = useCallback((chapterIndex) => {
    // Find the first page of the specified chapter
    const targetPage = pages.findIndex(page => page.chapterIndex === chapterIndex);
    if (targetPage !== -1) {
      setCurrentPage(targetPage);
      return true;
    }
    return false;
  }, [pages]);

  /**
   * Get current page content with proper HTML structure
   */
  const getCurrentPageContent = useCallback(() => {
    console.log('getCurrentPageContent called:', { currentPage, totalPages, pagesLength: pages.length });
    
    if (pages.length === 0) {
      console.log('No pages available');
      return {
        content: 'Loading pages...',
        chapterTitle: 'Loading',
        pageInfo: {
          current: 1,
          total: 1,
          chapterIndex: 0,
          isFirstPage: true,
          isLastPage: true
        }
      };
    }
    
    const page = pages[currentPage];
    if (!page) {
      console.log('Page not found at index:', currentPage);
      return {
        content: `Page ${currentPage + 1} not found`,
        chapterTitle: 'Error',
        pageInfo: {
          current: currentPage + 1,
          total: totalPages,
          chapterIndex: 0,
          isFirstPage: true,
          isLastPage: true
        }
      };
    }
    
    const chapter = chapters[page.chapterIndex];
    if (!chapter) {
      console.log('Chapter not found at index:', page.chapterIndex);
      return {
        content: `Chapter ${page.chapterIndex + 1} not found`,
        chapterTitle: page.chapterTitle || 'Unknown Chapter',
        pageInfo: {
          current: currentPage + 1,
          total: totalPages,
          chapterIndex: page.chapterIndex,
          isFirstPage: page.isFirstPageOfChapter,
          isLastPage: page.isLastPageOfChapter
        }
      };
    }
    
    console.log('Returning page content for page:', currentPage + 1, 'of', totalPages);
    
    // In a real implementation, you'd slice the actual HTML content
    // preserving tags and structure. This is simplified.
    return {
      content: page.content,
      chapterTitle: page.chapterTitle,
      pageInfo: {
        current: currentPage + 1,
        total: totalPages,
        chapterIndex: page.chapterIndex,
        isFirstPage: page.isFirstPageOfChapter,
        isLastPage: page.isLastPageOfChapter
      }
    };
  }, [currentPage, pages, chapters, totalPages]);

  /**
   * Calculate reading progress as percentage
   */
  const getProgress = useCallback(() => {
    if (totalPages === 0) return 0;
    return ((currentPage + 1) / totalPages) * 100;
  }, [currentPage, totalPages]);

  /**
   * Recalculate pages when chapters or settings change
   */
  useEffect(() => {
    if (chapters.length > 0) {
      console.log('Recalculating pages due to changes');
      paginateContent();
    }
  }, [chapters, fontSize, lineHeight, containerHeight, containerWidth, paginateContent]);
  
  /**
   * Ensure currentPage stays within bounds when totalPages changes
   */
  useEffect(() => {
    if (totalPages > 0 && currentPage >= totalPages) {
      console.log('Adjusting currentPage from', currentPage, 'to', totalPages - 1);
      setCurrentPage(totalPages - 1);
    }
  }, [totalPages, currentPage]);

  /**
   * Update current page when switching chapters via TOC
   */
  useEffect(() => {
    if (pages.length > 0 && currentChapterIndex !== undefined) {
      const currentPageData = pages[currentPage];
      if (currentPageData && currentPageData.chapterIndex !== currentChapterIndex) {
        goToChapter(currentChapterIndex);
      }
    }
  }, [currentChapterIndex, pages, currentPage, goToChapter]);

  return {
    // Page data
    pages,
    currentPage,
    totalPages,
    pageMap,
    
    // Navigation
    nextPage,
    prevPage,
    goToPage,
    goToChapter,
    
    // Content
    getCurrentPageContent,
    
    // Status
    isCalculating,
    progress: getProgress(),
    
    // Current position info
    currentChapter: pages[currentPage]?.chapterIndex || 0,
    currentChapterTitle: pages[currentPage]?.chapterTitle || '',
    isFirstPage: currentPage === 0,
    isLastPage: currentPage === totalPages - 1,
    pagesInCurrentChapter: pageMap[currentPage]?.totalPagesInChapter || 0,
    pageInChapter: pageMap[currentPage]?.pageInChapter || 0
  };
};

export default usePagination;