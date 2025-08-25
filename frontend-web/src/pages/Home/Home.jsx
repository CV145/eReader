
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../../../../shared/contexts/LibraryContext';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { books } = useLibrary();

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
            View Library ({books.length} books)
          </button>
        </div>
      </header>

      {books.length > 0 && (
        <section className="recent-books">
          <h2>Continue Reading</h2>
          <div className="book-grid">
            {books
              .filter(book => book.lastRead)
              .sort((a, b) => new Date(b.lastRead) - new Date(a.lastRead))
              .slice(0, 3)
              .map(book => (
                <div 
                  key={book.id} 
                  className="book-card"
                  onClick={() => navigate(`/read/${book.id}`)}
                >
                  <h3>{book.metadata.title}</h3>
                  <p>{book.metadata.creator}</p>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${book.progress}%` }}
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