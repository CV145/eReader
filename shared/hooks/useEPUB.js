// This hook manages all EPUB-related state and operations, referring to the parser in the shared folder
/*
 1. A component calls loadEPUB(file) with the EPUB file
  2. The hook parses the epub using the parser code in the shared folder
  3. Parsed book data is stored in React state
  4. Functions to navigate and load chapters are provided
  5. Returns all state and functions for component use
*/
import { useState, useCallback, useRef } from 'react';
import { EPUBParser } from '../parser/src/EPUBParser.js';

export const useEPUB = () => {
  const [bookId, setBookId] = useState(null);
  const [book, setBook] = useState(null); //Parsed EPUB data (metadata, spine, navigation, etc)
  const [currentChapter, setCurrentChapter] = useState(0); //Current chapter index
  const [chapterContent, setChapterContent] = useState(null); //Current chapter's content and CSS
  const [loading, setLoading] = useState(false); //Loading state for async operations
  const [error, setError] = useState(null); //Error messages
  const [cssEnabled, setCssEnabled] = useState(true); // Toggle for epub styling
  
  const parserRef = useRef(null);

  /*
  - Converts file to ArrayBuffer
  - Creates an EPUBParser instance
  - Parses the EPUB and sets book state
  - Auto-loads first chapter

  useCallback prevents loadEpub from being recreated each time a component re-renders
  */
  const loadEPUB = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    
    try {
      const buffer = await file.arrayBuffer();
      const parser = new EPUBParser();
      parserRef.current = parser;
      
      const parsedBook = await parser.parse(buffer);
      setBook(parsedBook);
      setCurrentChapter(0);
      
      // Load first chapter automatically
      if (parsedBook.spine && parsedBook.spine.length > 0) {
        const firstChapter = await parsedBook.getChapter(0);
        setChapterContent(firstChapter);
      }
      
      return parsedBook;
    } catch (err) {
      setError(err.message);
      console.error('Failed to parse EPUB:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  //Load a parsed book
  const loadParsedBook = useCallback(async (newBookId, parsedBook) => {
    
    //Prevent re-loading the same book
    if (!parsedBook || bookId === newBookId)
    {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setBookId(newBookId); //Set the ID when a new book is loaded
      setBook(parsedBook);
      setCurrentChapter(0);
      
      // Load first chapter automatically
      if (parsedBook.spine && parsedBook.spine.length > 0) {
        const firstChapter = await parsedBook.getChapter(0);
        setChapterContent(firstChapter);
      }
    } catch (err) {
      setError(`Failed to load chapter from parsed book: ${err.message}`);
      console.error('Failed to load parsed book:', err);
    } finally {
      setLoading(false);
    }
  }, [bookId]); // Reload when bookId changes

  /*
  - Loads specific chapter by spine index
  - Updates current chapter content and index
  */
  const loadChapter = useCallback(async (index) => {
    if (!book || index < 0 || index >= book.spine.length) return;
    
    setLoading(true);
    try {
      const chapter = await book.getChapter(index);
      setChapterContent(chapter);
      setCurrentChapter(index);
    } catch (err) {
      setError(`Failed to load chapter: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [book]);

  /*
 - Finds chapter by
  href path
  - Handles URL
  fragments (scrolls to
   specific sections)
  - Uses loadChapter
  internally
  */
  const loadChapterByHref = useCallback(async (href) => {
    if (!book) return;
    
    // Find chapter index by href
    const index = book.spine.findIndex(
      item => item.href.split('#')[0] === href.split('#')[0]
    );
    
    if (index !== -1) {
      await loadChapter(index);
      
      // Handle fragment (scroll to specific section)
      const fragment = href.split('#')[1];
      if (fragment) {
        setTimeout(() => {
          const element = document.getElementById(fragment);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    }
  }, [book, loadChapter]);

  // Navigation between
  const nextChapter = useCallback(() => {
    if (currentChapter < book.spine.length - 1) {
      loadChapter(currentChapter + 1);
    }
  }, [currentChapter, book, loadChapter]);

  const prevChapter = useCallback(() => {
    if (currentChapter > 0) {
      loadChapter(currentChapter - 1);
    }
  }, [currentChapter, loadChapter]);

  return {
    book,
    currentChapter,
    chapterContent,
    loading,
    error,
    cssEnabled,
    setCssEnabled,
    loadEPUB,
    loadParsedBook,
    loadChapter,
    loadChapterByHref,
    nextChapter,
    prevChapter,
    totalChapters: book?.spine?.length || 0
  };
};

/*
useEPUB is a custom React hook which is just a function
that returns an object containing all the state and functions

const {book, loading, loadEPUB, nextChapter, ...} = useEPUB();

Each component that calls useEPUB() gets its own independent
state. Each call to useEPUB() creates a new instance with
fresh useState calls
*/