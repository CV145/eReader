// frontend-web/src/pages/Reader/Reader.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLibrary } from '../../../../shared/contexts/LibraryContext';
import { EPUBParser } from '../../../../shared/parser/src/EPUBParser';
import Reader from '../../components/Reader/Reader';
import './Reader.css';

const ReaderPage = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { getBook, getBookFile, updateBookProgress } = useLibrary();
  const [bookData, setBookData] = useState(null);
  const [parsedBook, setParsedBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadBook = async () => {
      try {
        setLoading(true);
        
        // Get book metadata
        const book = await getBook(bookId);
        if (!book) {
          setError('Book not found');
          setTimeout(() => navigate('/library'), 2000);
          return;
        }
        
        setBookData(book);
        
        // Get the file buffer and re-parse it
        const fileBuffer = await getBookFile(bookId);
        if (fileBuffer) {
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
  }, [bookId, getBook, getBookFile, navigate]);

  const handleProgressUpdate = useCallback((chapter, progress) => {
    updateBookProgress(bookId, chapter, progress);
  }, [bookId, updateBookProgress]);

  const handleBack = () => {
    navigate('/library');
  };

  if (loading) {
    return (
      <div className="reader-page-loading">
        <div className="spinner"></div>
        <p>Loading book...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reader-page-error">
        <p>{error}</p>
        <p>Redirecting to library...</p>
      </div>
    );
  }

  if (!parsedBook) {
    return (
      <div className="reader-page-error">
        <p>Unable to parse book</p>
        <p>Redirecting to library...</p>
      </div>
    );
  }

  return (
    <div className="reader-page">
      <Reader 
        bookData={{
          ...bookData,
          parsedData: parsedBook
        }}
        onProgressUpdate={handleProgressUpdate}
        onBack={handleBack}
      />
    </div>
  );
};

export default ReaderPage;