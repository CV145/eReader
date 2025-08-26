// frontend-web/src/pages/Library/Library.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../../../../shared/contexts/LibraryContext';
import { FiBook, FiTrash2, FiSearch } from 'react-icons/fi';
import './Library.css';

const Library = () => {
  const navigate = useNavigate();
  const { books, deleteBook, loading } = useLibrary(); // Add loading
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('title');

  // Show loading state
  if (loading) {
    return (
      <div className="library-page">
        <div className="library-loading">
          <div className="spinner"></div>
          <p>Loading your library...</p>
        </div>
      </div>
    );
  }

  // Ensure books is an array before filtering
  const booksArray = Array.isArray(books) ? books : [];
  
  const filteredBooks = booksArray.filter(book => {
    const title = book.metadata?.title || '';
    const author = book.metadata?.creator || '';
    const search = searchTerm.toLowerCase();
    
    return title.toLowerCase().includes(search) ||
           author.toLowerCase().includes(search);
  });

  const sortedBooks = [...filteredBooks].sort((a, b) => {
    switch(sortBy) {
      case 'title':
        const titleA = a.metadata?.title || '';
        const titleB = b.metadata?.title || '';
        return titleA.localeCompare(titleB);
      case 'author':
        const authorA = a.metadata?.creator || '';
        const authorB = b.metadata?.creator || '';
        return authorA.localeCompare(authorB);
      case 'recent':
        return new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0);
      default:
        return 0;
    }
  });

  const handleDelete = async (e, bookId) => {
    e.stopPropagation();
    if (window.confirm('Delete this book?')) {
      await deleteBook(bookId);
    }
  };

  return (
    <div className="library-page">
      <header className="library-header">
        <h1>My Library</h1>
        <button 
          className="btn-upload"
          onClick={() => navigate('/upload')}
        >
          Add Book
        </button>
      </header>

      <div className="library-controls">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search books..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select 
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="title">Sort by Title</option>
          <option value="author">Sort by Author</option>
          <option value="recent">Recently Added</option>
        </select>
      </div>

      {sortedBooks.length === 0 ? (
        <div className="empty-state">
          <FiBook size={48} />
          <h2>No books found</h2>
          <p>Upload your first EPUB to get started</p>
        </div>
      ) : (
        <div className="books-grid">
          {sortedBooks.map(book => (
            <div 
              key={book.id}
              className="library-book-card"
              onClick={() => navigate(`/read/${book.id}`)}
            >
              <div className="book-info">
                <h3>{book.metadata?.title || 'Untitled'}</h3>
                <p className="author">{book.metadata?.creator || 'Unknown Author'}</p>
                <p className="meta">
                  {book.spine?.length || 0} chapters • 
                  Added {new Date(book.uploadDate).toLocaleDateString()}
                </p>
                {book.progress > 0 && (
                  <div className="progress-indicator">
                    {Math.round(book.progress)}% complete
                  </div>
                )}
              </div>
              
              <button 
                className="delete-btn"
                onClick={(e) => handleDelete(e, book.id)}
                aria-label="Delete book"
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Library;