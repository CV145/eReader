// frontend-web/src/pages/Reader/Reader.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLibrary } from '../../../../shared/contexts/LibraryContext';
import Reader from '../../components/Reader/Reader';
import './Reader.css';

const ReaderPage = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { getBook, updateBookProgress } = useLibrary();
  const [bookData, setBookData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadBook = async () => {
      try {
        setLoading(true);
        const book = await getBook(bookId);
        
        if (!book) {
          setError('Book not found');
          setTimeout(() => navigate('/library'), 2000);
          return;
        }
        
        setBookData(book);
      } catch (err) {
        console.error('Failed to load book:', err);
        setError('Failed to load book');
        setTimeout(() => navigate('/library'), 2000);
      } finally {
        setLoading(false);
      }
    };
    
    loadBook();
  }, [bookId, getBook, navigate]);

  const handleProgressUpdate = (chapter, progress) => {
    updateBookProgress(bookId, chapter, progress);
  };

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

  return (
    <div className="reader-page">
      <Reader 
        bookData={bookData}
        onProgressUpdate={handleProgressUpdate}
        onBack={handleBack}
      />
    </div>
  );
};

export default ReaderPage;