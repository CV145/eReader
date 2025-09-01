/**
 * usePagination Hook - Simple Text-Based Pagination
 * 
 * A simplified approach that splits content into pages based on text length
 * and container overflow detection.
 * 
 * Key Features:
 * - Simple text-based page splitting
 * - Maintains HTML structure
 * - Dynamic viewport and font size support
 * - Reliable page boundaries
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
 * Check if container content overflows
 */
function isOverflowing(container) {
  return container.scrollHeight > container.clientHeight;
}

/**
 * Split HTML content into pages
 */
async function paginateChapter(chapterContent, viewport, fontSize) {
  const pages = [];
  const container = createMeasurementContainer(viewport, fontSize);
  
  // Parse the HTML content
  const parser = new DOMParser();
  const doc = parser.parseFromString(chapterContent, 'text/html');
  const allElements = Array.from(doc.body.children);
  
  if (allElements.length === 0) {
    // If no elements, treat as plain text
    container.innerHTML = chapterContent;
    if (!isOverflowing(container)) {
      pages.push(chapterContent);
    } else {
      // Split by estimated characters per page
      const charsPerPage = Math.floor((viewport.height - 60) * (viewport.width - 400) / (fontSize * 2));
      const text = doc.body.textContent;
      for (let i = 0; i < text.length; i += charsPerPage) {
        pages.push(`<p>${text.substring(i, i + charsPerPage)}</p>`);
      }
    }
    document.body.removeChild(container);
    return pages;
  }
  
  let currentPageElements = [];
  let currentPageHTML = '';
  
  console.log(`DEBUG: Processing ${allElements.length} top-level elements`);
  
  for (let i = 0; i < allElements.length; i++) {
    const element = allElements[i];
    const elementHTML = element.outerHTML;
    
    // Try adding this element to the current page
    const testHTML = currentPageHTML + elementHTML;
    container.innerHTML = testHTML;
    
    if (isOverflowing(container)) {
      // This element causes overflow
      
      if (currentPageHTML) {
        // Save current page if it has content
        pages.push(currentPageHTML);
        currentPageHTML = '';
      }
      
      // Check if this single element fits on a page
      container.innerHTML = elementHTML;
      
      if (!isOverflowing(container)) {
        // Element fits on its own page
        currentPageHTML = elementHTML;
      } else {
        // Single element is too large, need to split it
        console.log('DEBUG: Large element needs splitting:', element.tagName);
        
        // For large elements, split by text content
        const textContent = element.textContent;
        const charsPerPage = Math.floor((viewport.height - 60) * (viewport.width - 400) / (fontSize * 2.5));
        
        if (textContent.length > charsPerPage) {
          // Split text into multiple pages
          for (let j = 0; j < textContent.length; j += charsPerPage) {
            const pageText = textContent.substring(j, j + charsPerPage);
            const pageHTML = `<${element.tagName.toLowerCase()} class="${element.className}">${pageText}</${element.tagName.toLowerCase()}>`;
            pages.push(pageHTML);
          }
        } else {
          // Just add it even if it overflows slightly
          pages.push(elementHTML);
        }
        
        currentPageHTML = '';
      }
    } else {
      // Element fits, add to current page
      currentPageHTML = testHTML;
    }
  }
  
  // Add any remaining content as the last page
  if (currentPageHTML) {
    pages.push(currentPageHTML);
  }
  
  // Clean up
  document.body.removeChild(container);
  
  console.log(`DEBUG: Created ${pages.length} pages`);
  
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
        content: nextPageData.content || nextPageData, // Handle both old and new format
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
        content: prevPageData.content || prevPageData, // Handle both old and new format
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
        content: pageData.content || pageData, // Handle both old and new format
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