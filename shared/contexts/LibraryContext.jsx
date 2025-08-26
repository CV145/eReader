/*
 LibraryContext.jsx is a React Context that manages the entire book library state and persistence.

 It's state management for the book library with IndexedDB storage - books are saved offline and reading progress is tracked.

 (Where are books stored?)

 Offline local storage on device
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
  const [books, setBooks] = useState([]); //Array of all books in the library
  const [currentBook, setCurrentBook] = useState(null); //Currently selected book
  const [loading, setLoading] = useState(true); //Loading state during database operations

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

  /*
  - Creates unique book ID
  - Extracts serializable data from the parsed EPUB (no functions)
  - Stores book metadata in 'books' objectStore
  - Stores original EPUB file buffer in 'files' objectStore
  - Updates React state
  */
  const addBook = async (file, parsedBook) => {

    // The unique Book ID
    const bookId = `book_${Date.now()}`;
    
    // Get the array buffer BEFORE starting the transaction
    let fileBuffer;
    try {
      fileBuffer = await file.arrayBuffer();
    } catch (error) {
      console.error('Failed to read file:', error);
      throw new Error('Failed to read file');
    }
    
    // Extract only serializable data from parsedBook (no functions)
    const bookData = {
      metadata: parsedBook.metadata || {},
      navigation: parsedBook.navigation || [],
      spine: parsedBook.spine || [],
      manifest: parsedBook.manifest || {},
      fonts: parsedBook.fonts || [],
      globalCSS: parsedBook.globalCSS || []
    };
    
    const newBook = {
      id: bookId,
      fileName: file.name,
      fileSize: file.size,
      metadata: bookData.metadata,
      navigation: bookData.navigation,
      spine: bookData.spine,
      uploadDate: new Date().toISOString(),
      lastRead: null,
      currentChapter: 0,
      progress: 0,
      bookData: bookData
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