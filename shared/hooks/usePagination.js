/**
 * usePagination Hook - Character-based Pagination with Binary Search
 * 
 * Splits book content into pages by finding the exact character position
 * where content overflows the visible area.
 * 
 * Key Features:
 * - Binary search to find exact overflow point
 * - Works with any HTML structure
 * - Accurate page boundaries
 * - Handles entire book pagination
 */

import { useState, useCallback, useEffect, useMemo } from 'react';

/**
 * Create a hidden measurement container matching PageView dimensions
 */
function createMeasurementContainer(viewport, fontSize) {
  const container = document.createElement('div');
  container.className = 'pagination-measure-container';
  container.style.cssText = `
    position: absolute;
    top: -9999px;
    left: -9999px;
    width: ${viewport.width - 400}px;
    height: ${viewport.height - 60}px;
    font-size: ${fontSize}px;
    font-family: inherit;
    line-height: 1.6;
    padding: 20px;
    box-sizing: border-box;
    overflow: hidden;
    visibility: hidden;
  `;
  
  document.body.appendChild(container);
  return container;
}

/**
 * Check if any content overflows the container
 */
function hasOverflow(container) {
  // Get all text nodes and check their positions
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const containerBottom = container.getBoundingClientRect().bottom;
  let node;
  
  while (node = walker.nextNode()) {
    if (node.nodeValue && node.nodeValue.trim()) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      if (rect.bottom > containerBottom) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Binary search to find how much text fits on a page
 */
function findPageBreak(htmlContent, container) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const textContent = doc.body.textContent || '';
  
  if (!textContent) return htmlContent;
  
  // Binary search for the maximum text that fits
  let low = 0;
  let high = textContent.length;
  let bestFit = 0;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const testText = textContent.substring(0, mid);
    
    // Wrap in a paragraph for testing
    container.innerHTML = `<div>${testText}</div>`;
    
    if (!hasOverflow(container)) {
      bestFit = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  
  return bestFit;
}

/**
 * Split chapter into pages using binary search
 */
async function paginateChapter(chapterContent, viewport, fontSize) {
  const pages = [];
  const container = createMeasurementContainer(viewport, fontSize);
  
  // Parse and get text content
  const parser = new DOMParser();
  const doc = parser.parseFromString(chapterContent, 'text/html');
  const fullText = doc.body.textContent || '';
  
  console.log(`DEBUG: Chapter has ${fullText.length} characters`);
  
  if (!fullText) {
    document.body.removeChild(container);
    return [chapterContent]; // Return original if no text
  }
  
  let currentPosition = 0;
  let pageCount = 0;
  const maxPages = 1000; // Safety limit
  
  while (currentPosition < fullText.length && pageCount < maxPages) {
    // Get remaining text
    const remainingText = fullText.substring(currentPosition);
    
    // Find how much fits on this page
    container.innerHTML = `<div>${remainingText}</div>`;
    
    if (!hasOverflow(container)) {
      // All remaining text fits on one page
      pages.push(`<div>${remainingText}</div>`);
      break;
    }
    
    // Binary search to find the break point
    let low = 0;
    let high = remainingText.length;
    let bestFit = 0;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const testText = remainingText.substring(0, mid);
      container.innerHTML = `<div>${testText}</div>`;
      
      if (!hasOverflow(container)) {
        bestFit = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    
    if (bestFit === 0) {
      // Can't fit any text, force at least some content
      bestFit = Math.min(100, remainingText.length);
    }
    
    // Add this page
    const pageText = remainingText.substring(0, bestFit);
    pages.push(`<div>${pageText}</div>`);
    currentPosition += bestFit;
    pageCount++;
    
    console.log(`DEBUG: Page ${pageCount} contains ${bestFit} characters`);
  }
  
  // Clean up
  document.body.removeChild(container);
  
  console.log(`DEBUG: Created ${pages.length} pages from ${fullText.length} characters`);
  
  return pages;
}

/**
 * Custom hook for pagination
 */
export const usePagination = (book, renderSettings) => {
  // Core state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageContent, setPageContent] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [pages, setPages] = useState([]);
  const [chapterData, setChapterData] = useState(null);
  
  /**
   * Calculate pages for entire book
   */
  const calculatePages = useCallback(async () => {
    if (!book) return;
    
    setCalculating(true);
    console.log('DEBUG: Starting pagination for entire book...');
    
    try {
      const allPages = [];
      const chapterCount = book.spine?.length || 0;
      console.log(`DEBUG: Book has ${chapterCount} chapters`);
      
      // Paginate ALL chapters
      for (let i = 0; i < chapterCount; i++) {
        const chapter = await book.getChapter(i);
        if (!chapter || !chapter.content) {
          console.warn(`WARNING: Chapter ${i} has no content, skipping`);
          continue;
        }
        
        console.log(`DEBUG: Chapter ${i} content length:`, chapter.content.length);
        
        // Store first chapter data for CSS
        if (i === 0) {
          setChapterData(chapter);
        }
        
        // Paginate this chapter
        const chapterPages = await paginateChapter(
          chapter.content,
          renderSettings.viewport,
          renderSettings.fontSize
        );
        
        console.log(`DEBUG: Chapter ${i} created ${chapterPages.length} pages`);
        
        // Add chapter pages to total pages, keeping track of chapter info
        chapterPages.forEach(pageContent => {
          allPages.push({
            content: pageContent,
            chapterIndex: i,
            chapterTitle: chapter.title || `Chapter ${i + 1}`,
            combinedCSS: chapter.combinedCSS
          });
        });
      }
      
      console.log(`DEBUG: Total pages for entire book: ${allPages.length}`);
      
      setPages(allPages);
      setTotalPages(allPages.length);
      
      // Load first page
      if (allPages.length > 0) {
        const firstPage = allPages[0];
        setPageContent({
          content: firstPage.content,
          combinedCSS: firstPage.combinedCSS,
          chapterTitle: firstPage.chapterTitle
        });
        setCurrentPage(1);
      }
      
    } catch (error) {
      console.error('ERROR: Pagination failed:', error);
    } finally {
      setCalculating(false);
    }
  }, [book, renderSettings]);
  
  // Run pagination when book or settings change
  useEffect(() => {
    calculatePages();
  }, [calculatePages]);
  
  /**
   * Navigate to next page
   */
  const nextPage = useCallback(() => {
    if (currentPage < pages.length) {
      const nextPageNum = currentPage + 1;
      const nextPageData = pages[nextPageNum - 1];
      setCurrentPage(nextPageNum);
      setPageContent({
        content: nextPageData.content || nextPageData,
        combinedCSS: nextPageData.combinedCSS || chapterData?.combinedCSS,
        chapterTitle: nextPageData.chapterTitle || chapterData?.title || 'Chapter 1'
      });
    }
  }, [currentPage, pages, chapterData]);
  
  /**
   * Navigate to previous page
   */
  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      const prevPageNum = currentPage - 1;
      const prevPageData = pages[prevPageNum - 1];
      setCurrentPage(prevPageNum);
      setPageContent({
        content: prevPageData.content || prevPageData,
        combinedCSS: prevPageData.combinedCSS || chapterData?.combinedCSS,
        chapterTitle: prevPageData.chapterTitle || chapterData?.title || 'Chapter 1'
      });
    }
  }, [currentPage, pages, chapterData]);
  
  /**
   * Go to specific page
   */
  const goToPage = useCallback((pageNumber) => {
    const targetPage = Math.max(1, Math.min(pageNumber, pages.length));
    if (targetPage !== currentPage && pages[targetPage - 1]) {
      const pageData = pages[targetPage - 1];
      setCurrentPage(targetPage);
      setPageContent({
        content: pageData.content || pageData,
        combinedCSS: pageData.combinedCSS || chapterData?.combinedCSS,
        chapterTitle: pageData.chapterTitle || chapterData?.title || 'Chapter 1'
      });
    }
  }, [currentPage, pages, chapterData]);
  
  // Navigation state
  const canGoNext = useMemo(() => currentPage < pages.length, [currentPage, pages]);
  const canGoPrev = useMemo(() => currentPage > 1, [currentPage]);
  
  return {
    // State
    currentPage,
    totalPages,
    pageContent,
    calculating,
    
    // Actions
    calculatePages,
    goToPage,
    nextPage,
    prevPage,
    
    // Navigation
    canGoNext,
    canGoPrev
  };
};