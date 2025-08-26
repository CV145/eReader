// frontend-web/src/pages/Home/Home.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../../../../shared/contexts/LibraryContext';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { books, loading } = useLibrary();
  
  // Ensure books is an array
  const booksArray = Array.isArray(books) ? books : [];

  return (
    <div className="home-page">
      <header className="hero-section">
        <h1>📚 Your Digital Library</h1>
        <p>Read, organize, and enjoy your EPUB collection</p>
        
        <div className="cta-buttons">
          <button 
            className="btn-primary"
            onClick={() => navigate('/upload')}
          >
            Upload New Book
          </button>
          <button 
            className="btn-secondary"
            onClick={() => navigate('/library')}
          >
            View Library {!loading && `(${booksArray.length} books)`}
          </button>
        </div>
      </header>

      {!loading && booksArray.length > 0 && (
        <section className="recent-books">
          <h2>Continue Reading</h2>
          <div className="book-grid">
            {booksArray
              .filter(book => book.lastRead)
              .sort((a, b) => new Date(b.lastRead) - new Date(a.lastRead))
              .slice(0, 3)
              .map(book => (
                <div 
                  key={book.id} 
                  className="book-card"
                  onClick={() => navigate(`/read/${book.id}`)}
                >
                  <h3>{book.metadata?.title || 'Untitled'}</h3>
                  <p>{book.metadata?.creator || 'Unknown Author'}</p>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${book.progress || 0}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;