
import React from 'react';
import { FiBook } from 'react-icons/fi';
import TableOfContents from './TableOfContents';
import './Sidebar.css';

const Sidebar = ({ isOpen, book, currentChapter, onNavigate, onChapterSelect }) => {
  return (
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="book-info">
            <h2>{book.metadata.title}</h2>
            <p className="book-author">{book.metadata.creator}</p>
            {book.metadata.publisher && (
              <p className="book-publisher">{book.metadata.publisher}</p>
            )}
          </div>
          
          {book.fonts && book.fonts.length > 0 && (
            <div className="font-info">
              <span className="info-badge">
                {book.fonts.length} embedded font{book.fonts.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
        
        <div className="sidebar-content">
          <h3>
            <FiBook /> Table of Contents
          </h3>
          
          {book.navigation && book.navigation.length > 0 ? (
            <TableOfContents
              items={book.navigation}
              onNavigate={onNavigate}
              currentChapter={currentChapter}
              spine={book.spine}
            />
          ) : (
            <div className="chapter-list">
              {book.spine.map((item, index) => (
                <div
                  key={index}
                  className={`chapter-item ${index === currentChapter ? 'active' : ''}`}
                  onClick={() => onChapterSelect(index)}
                >
                  Chapter {index + 1}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
  );
};

export default Sidebar;