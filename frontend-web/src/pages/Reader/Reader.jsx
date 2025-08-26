/**
 * ReaderPage Component
 * 
 * This is the main page component that handles loading and displaying EPUB books.
 * It serves as a bridge between the routing system and the actual Reader component.
 * 
 * Key responsibilities:
 * 1. Extract bookId from URL parameters
 * 2. Load book metadata and file from IndexedDB storage
 * 3. Parse the EPUB file using EPUBParser
 * 4. Pass parsed data to the Reader component
 * 5. Handle loading states and errors
 * 6. Provide progress tracking functionality
 * 
 * Flow:
 * URL /read/:bookId → Load book from storage → Parse EPUB → Display in Reader
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLibrary } from '../../../../shared/contexts/LibraryContext';
import { EPUBParser } from '../../../../shared/parser/src/EPUBParser';
import Reader from '../../components/Reader/Reader';
import './Reader.css';

const ReaderPage = () => {
  // Extract bookId from URL path (e.g., /read/book_123 → book_123)
  const { bookId } = useParams();
  const navigate = useNavigate();
  
  // Get library functions for book storage operations
  const { getBook, getBookFile, updateBookProgress } = useLibrary();
  
  // Component state management
  const [bookData, setBookData] = useState(null);        // Book metadata from storage
  const [parsedBook, setParsedBook] = useState(null);    // Parsed EPUB data with methods
  const [loading, setLoading] = useState(true);          // Loading state for UI feedback
  const [error, setError] = useState(null);              // Error messages for user

  /**
   * Main effect to load and parse the book when bookId changes
   * 
   * This effect runs when:
   * - Component mounts with a bookId
   * - User navigates to a different book (bookId changes)
   * 
   * Process:
   * 1. Load book metadata from IndexedDB
   * 2. Load original EPUB file buffer from IndexedDB  
   * 3. Re-parse the EPUB to get fresh parsed data with methods
   * 4. Handle errors and redirect to library if needed
   * 
   * Note: We re-parse instead of storing parsed data because:
   * - IndexedDB can't store functions (methods like getChapter)
   * - Ensures fresh parser state for each book load
   */
  useEffect(() => {
    const loadBook = async () => {
      try {
        setLoading(true);
        
        // Step 1: Get book metadata (title, author, progress, etc.)
        const book = await getBook(bookId);
        if (!book) {
          setError('Book not found');
          // Auto-redirect to library after showing error
          setTimeout(() => navigate('/library'), 2000);
          return;
        }
        
        setBookData(book);
        
        // Step 2: Get the original EPUB file buffer from storage
        const fileBuffer = await getBookFile(bookId);
        if (fileBuffer) {
          // Step 3: Parse the EPUB file to get structure and methods
          const parser = new EPUBParser();
          const parsed = await parser.parse(fileBuffer);
          setParsedBook(parsed);
        } else {
          setError('Book file not found');
          setTimeout(() => navigate('/library'), 2000);
        }
      } catch (err) {
        console.error('Failed to load book:', err);
        setError('Failed to load book');
        setTimeout(() => navigate('/library'), 2000);
      } finally {
        setLoading(false);
      }
    };
    
    loadBook();
    // Only re-run when bookId changes (not when functions change)
  }, [bookId]);

  /**
   * Callback to handle reading progress updates
   * 
   * Called by the Reader component when:
   * - User navigates to a new chapter
   * - Reading progress changes
   * 
   * Updates both IndexedDB storage and React state
   */
  const handleProgressUpdate = useCallback((chapter, progress) => {
    updateBookProgress(bookId, chapter, progress);
  }, [bookId, updateBookProgress]);

  /**
   * Navigation handler to return to library
   * Simple wrapper for navigate function
   */
  const handleBack = () => {
    navigate('/library');
  };

  /**
   * Memoized book data object for Reader component
   * 
   * Combines:
   * - bookData: metadata, progress, etc. from storage
   * - parsedBook: parsed EPUB structure with methods
   * 
   * Memoized to prevent unnecessary re-renders of Reader component
   * Only recreates when bookData or parsedBook actually change
   */
  const memoizedBookData = useMemo(() => {
    if (!bookData || !parsedBook) return null;
    return {
      ...bookData,
      parsedData: parsedBook
    };
  }, [bookData, parsedBook]);

  // Loading state: Show spinner while book is being loaded and parsed
  if (loading) {
    return (
      <div className="reader-page-loading">
        <div className="spinner"></div>
        <p>Loading book...</p>
      </div>
    );
  }

  // Error state: Show error message with auto-redirect
  if (error) {
    return (
      <div className="reader-page-error">
        <p>{error}</p>
        <p>Redirecting to library...</p>
      </div>
    );
  }

  // Parsed book check: Ensure we have valid parsed data
  if (!parsedBook) {
    return (
      <div className="reader-page-error">
        <p>Unable to parse book</p>
        <p>Redirecting to library...</p>
      </div>
    );
  }

  // Success state: Render the main Reader component
  return (
    <div className="reader-page">
      <Reader 
        bookData={memoizedBookData}           // Combined book metadata + parsed data
        onProgressUpdate={handleProgressUpdate}  // Callback for progress tracking
        onBack={handleBack}                   // Navigation back to library
      />
    </div>
  );
};

export default ReaderPage;