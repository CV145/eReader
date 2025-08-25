//Library context for managing books. They should be able to be stored offline on the device, and eventually online in the backend


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
  const [books, setBooks] = useState([]);
  const [currentBook, setCurrentBook] = useState(null);

  // Load books from IndexedDB on mount
  useEffect(() => {
    loadBooksFromStorage();
  }, []);

  const loadBooksFromStorage = async () => {
    // Open IndexedDB
    const db = await openDB();
    const transaction = db.transaction(['books'], 'readonly');
    const store = transaction.objectStore('books');
    const allBooks = await store.getAll();
    setBooks(allBooks);
  };

  const addBook = async (file, parsedBook) => {
    const bookId = `book_${Date.now()}`;
    
    const newBook = {
      id: bookId,
      fileName: file.name,
      fileSize: file.size,
      metadata: parsedBook.metadata,
      navigation: parsedBook.navigation,
      spine: parsedBook.spine,
      uploadDate: new Date().toISOString(),
      lastRead: null,
      currentChapter: 0,
      progress: 0,
      // Store the parsed book data
      parsedData: parsedBook
    };

    // Store in IndexedDB
    const db = await openDB();
    const transaction = db.transaction(['books'], 'readwrite');
    const store = transaction.objectStore('books');
    await store.add(newBook);

    // Store the actual file separately
    const fileTransaction = db.transaction(['files'], 'readwrite');
    const fileStore = fileTransaction.objectStore('files');
    await fileStore.add({ id: bookId, file: file });

    setBooks(prev => [...prev, newBook]);
    return bookId;
  };

  const getBook = async (bookId) => {
    // First check memory
    const memoryBook = books.find(b => b.id === bookId);
    if (memoryBook) return memoryBook;

    // Otherwise load from IndexedDB
    const db = await openDB();
    const transaction = db.transaction(['books'], 'readonly');
    const store = transaction.objectStore('books');
    return await store.get(bookId);
  };

  const deleteBook = async (bookId) => {
    const db = await openDB();
    
    // Delete book data
    const bookTransaction = db.transaction(['books'], 'readwrite');
    await bookTransaction.objectStore('books').delete(bookId);
    
    // Delete file
    const fileTransaction = db.transaction(['files'], 'readwrite');
    await fileTransaction.objectStore('files').delete(bookId);

    setBooks(prev => prev.filter(b => b.id !== bookId));
  };

  const updateBookProgress = async (bookId, chapter, progress) => {
    const db = await openDB();
    const transaction = db.transaction(['books'], 'readwrite');
    const store = transaction.objectStore('books');
    
    const book = await store.get(bookId);
    book.currentChapter = chapter;
    book.progress = progress;
    book.lastRead = new Date().toISOString();
    
    await store.put(book);
    
    setBooks(prev => prev.map(b => 
      b.id === bookId ? { ...b, currentChapter: chapter, progress, lastRead: book.lastRead } : b
    ));
  };

  const value = {
    books,
    currentBook,
    setCurrentBook,
    addBook,
    getBook,
    deleteBook,
    updateBookProgress
  };

  return (
    <LibraryContext.Provider value={value}>
      {children}
    </LibraryContext.Provider>
  );
};

// IndexedDB helper
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EPUBLibrary', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store book metadata
      if (!db.objectStoreNames.contains('books')) {
        const bookStore = db.createObjectStore('books', { keyPath: 'id' });
        bookStore.createIndex('title', 'metadata.title', { unique: false });
        bookStore.createIndex('author', 'metadata.creator', { unique: false });
      }
      
      // Store actual files
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
      }
    };
  });
}