/**
 * LibraryContext - Complete Book Library Management System
 * 
 * This React Context provides centralized state management for the entire book library,
 * handling storage, retrieval, and progress tracking using IndexedDB for offline persistence.
 * 
 * Key Features:
 * - Offline book storage using IndexedDB
 * - Book metadata and file management
 * - Reading progress tracking per book
 * - CRUD operations for library management
 * - Automatic data persistence
 * 
 * Storage Architecture:
 * - IndexedDB Database: 'EPUBLibrary'
 * - Object Store 'books': Book metadata, progress, reading position
 * - Object Store 'files': Original EPUB file buffers
 * 
 * Data Flow:
 * 1. User adds EPUB → File parsed → Metadata + buffer stored in IndexedDB
 * 2. User opens book → Metadata loaded → File buffer retrieved and parsed
 * 3. User reads → Progress automatically tracked and persisted
 * 4. User returns → Reading position restored from storage
 * 
 * Context Usage:
 * - Wrap app with LibraryProvider
 * - Use useLibrary() hook in components
 * - Access books array, loading state, and CRUD functions
 * 
 * Where are books stored?
 * - Locally on device using IndexedDB (browser's local database)
 * Database name: 'ereader-library'
 * Object store: 'books'
 * Each book stored with: {id, title,
   author, coverImage, uploadDate,
  currentChapter, progress,
  parsedData}
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

const LibraryContext = createContext();

export const useLibrary = () => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within LibraryProvider');
  }
  return context;
};

export const LibraryProvider = ({ children }) => {
  // Core library state management
  const [books, setBooks] = useState([]);              // Array of all books in the library with metadata
  const [currentBook, setCurrentBook] = useState(null); // Currently selected/opened book
  const [loading, setLoading] = useState(true);        // Loading state during database operations

  useEffect(() => {
    loadBooksFromStorage();
  }, []);

  const loadBooksFromStorage = async () => {
    try {
      setLoading(true);
      const db = await openDB();
      const transaction = db.transaction(['books'], 'readonly');
      const store = transaction.objectStore('books');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const loadedBooks = request.result || [];
        setBooks(loadedBooks);
        setLoading(false);
      };
      
      request.onerror = () => {
        console.error('Failed to load books:', request.error);
        setBooks([]);
        setLoading(false);
      };
    } catch (error) {
      console.error('Failed to open database:', error);
      setBooks([]);
      setLoading(false);
    }
  };

  /**
   * Add new book to the library
   * 
   * This is the main function for importing EPUB files into the library.
   * It handles both metadata extraction and file storage in a single transaction.
   * 
   * Process:
   * 1. Generate unique book ID using timestamp
   * 2. Convert file to ArrayBuffer for storage
   * 3. Extract serializable data from parsed EPUB (remove functions)
   * 4. Create book metadata object
   * 5. Store both metadata and file buffer in IndexedDB
   * 6. Update React state with new book
   * 
   * @param {File} file - Original EPUB file from user
   * @param {Object} parsedBook - Parsed EPUB data with structure and methods
   * @returns {Promise<string>} - Book ID of the newly added book
   * 
   * Storage Strategy:
   * - Metadata goes to 'books' store for quick access
   * - File buffer goes to 'files' store for re-parsing when needed
   * - Dual storage allows fast library browsing + full functionality when reading
   */
  const addBook = async (file, parsedBook) => {
    // Generate unique book ID using current timestamp
    const bookId = `book_${Date.now()}`;
    
    // Convert file to ArrayBuffer BEFORE starting IndexedDB transaction
    // (IndexedDB transactions can timeout if this takes too long)
    let fileBuffer;
    try {
      fileBuffer = await file.arrayBuffer();
    } catch (error) {
      console.error('Failed to read file:', error);
      throw new Error('Failed to read file');
    }
    
    // Extract only serializable data from parsedBook
    // (IndexedDB can't store functions, so we remove methods like getChapter)
    const bookData = {
      metadata: parsedBook.metadata || {},    // Title, author, publisher, etc.
      navigation: parsedBook.navigation || [], // Table of contents structure
      spine: parsedBook.spine || [],          // Chapter order and files
      manifest: parsedBook.manifest || {},     // All files in EPUB
      fonts: parsedBook.fonts || [],          // Embedded fonts
      globalCSS: parsedBook.globalCSS || []   // Global stylesheets
    };
    
    // Create complete book metadata object for storage
    const newBook = {
      id: bookId,                             // Unique identifier
      fileName: file.name,                    // Original filename
      fileSize: file.size,                    // File size in bytes
      metadata: bookData.metadata,            // Book info (title, author, etc.)
      navigation: bookData.navigation,        // Table of contents
      spine: bookData.spine,                  // Chapter structure
      uploadDate: new Date().toISOString(),   // When book was added
      lastRead: null,                         // Last reading session
      currentChapter: 0,                      // Reading position
      progress: 0,                            // Reading progress percentage
      bookData: bookData                      // Complete parsed structure
    };

    try {
      const db = await openDB();
      
      return new Promise((resolve, reject) => {
        // Start a transaction for both stores
        const transaction = db.transaction(['books', 'files'], 'readwrite');
        
        // Handle transaction complete/error
        transaction.oncomplete = () => {
          setBooks(prev => [...prev, newBook]);
          resolve(bookId);
        };
        
        transaction.onerror = () => {
          reject(transaction.error);
        };
        
        // Store the book metadata
        const bookStore = transaction.objectStore('books');
        const bookRequest = bookStore.add(newBook);
        
        bookRequest.onerror = () => {
          console.error('Failed to store book:', bookRequest.error);
        };
        
        // Store the file buffer (already converted)
        const fileStore = transaction.objectStore('files');
        const fileData = {
          id: bookId,
          fileName: file.name,
          buffer: fileBuffer
        };
        
        const fileRequest = fileStore.add(fileData);
        
        fileRequest.onerror = () => {
          console.error('Failed to store file:', fileRequest.error);
        };
      });
    } catch (error) {
      console.error('Failed to add book:', error);
      throw error;
    }
  };

  // Get book with given ID
  const getBook = async (bookId) => {
    // First check memory (React state)
    const memoryBook = books.find(b => b.id === bookId);
    if (memoryBook) return memoryBook;

    // Otherwise load from IndexedDB
    try {
      const db = await openDB();
      const transaction = db.transaction(['books'], 'readonly');
      const store = transaction.objectStore('books');
      
      return new Promise((resolve, reject) => {
        const request = store.get(bookId);
        
        request.onsuccess = () => {
          // Returns the book from await getBook(id)
          resolve(request.result);
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Failed to get book:', error);
      return null;
    }
  };

  // Gets original EPUB file buffer from IndexedDB
  const getBookFile = async (bookId) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      
      return new Promise((resolve, reject) => {
        const request = store.get(bookId);
        
        request.onsuccess = () => {
          const result = request.result;
          if (result && result.buffer) {
            resolve(result.buffer);
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Failed to get book file:', error);
      return null;
    }
  };

  // Removes from both 'books' and 'files' objectStores
  // Updates React state
  const deleteBook = async (bookId) => {
    try {
      const db = await openDB();
      
      // Use a single transaction for both deletions
      const transaction = db.transaction(['books', 'files'], 'readwrite');
      
      transaction.objectStore('books').delete(bookId);
      transaction.objectStore('files').delete(bookId);
      
      transaction.oncomplete = () => {
        setBooks(prev => prev.filter(b => b.id !== bookId));
      };
      
    } catch (error) {
      console.error('Failed to delete book:', error);
    }
  };

  /*
 - Updates reading
  position and
  progress percentage
  - Stores lastRead
  timestamp
  - Syncs to both
  IndexedDB and React
   state
  */
  const updateBookProgress = async (bookId, chapter, progress) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['books'], 'readwrite');
      const store = transaction.objectStore('books');
      
      const request = store.get(bookId);
      
      request.onsuccess = () => {
        const book = request.result;
        if (book) {
          book.currentChapter = chapter;
          book.progress = progress;
          book.lastRead = new Date().toISOString();
          
          const updateRequest = store.put(book);
          
          updateRequest.onsuccess = () => {
            setBooks(prev => prev.map(b => 
              b.id === bookId 
                ? { ...b, currentChapter: chapter, progress, lastRead: book.lastRead } 
                : b
            ));
          };
        }
      };
    } catch (error) {
      console.error('Failed to update book progress:', error);
    }
  };

  const value = {
    books: Array.isArray(books) ? books : [],
    currentBook,
    setCurrentBook,
    addBook,
    getBook,
    getBookFile,
    deleteBook,
    updateBookProgress,
    loading
  };

  return (
    <LibraryContext.Provider value={value}>
      {children}
    </LibraryContext.Provider>
  );
};

// IndexedDB helper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EPUBLibrary', 1);
    
    request.onerror = () => {
      reject(request.error);
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store book metadata
      if (!db.objectStoreNames.contains('books')) {
        const bookStore = db.createObjectStore('books', { keyPath: 'id' });
        bookStore.createIndex('title', 'metadata.title', { unique: false });
        bookStore.createIndex('author', 'metadata.creator', { unique: false });
        bookStore.createIndex('uploadDate', 'uploadDate', { unique: false });
      }
      
      // Store actual files
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
      }
    };
  });
}


/*
 Any component can access the library:
 const { books, addBook, getBook, updateBookProgress } = useLibrary();

 IndexedDB 
  Structure:

  // Database: 
  'EPUBLibrary'
  {
    books: {
  // Book metadata
      id: 'book_123',
      fileName:
  'book.epub',
      metadata:
  {...},
      currentChapter:
   2,
      progress: 45.5,
      bookData: {...}
   // Serialized EPUB
   data
    },
    files: {
  // Original files
      id: 'book_123',
      buffer:
  ArrayBuffer // 
  Original EPUB file
    }
  }

*/