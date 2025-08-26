import React, { useState, useEffect } from 'react';
import { useEPUB } from '../../../../shared/hooks/useEPUB';
import Sidebar from '../Sidebar/Sidebar';
import ChapterView from '../ChapterView/ChapterView';
import ReadingControls from '../Controls/ReadingControls';
import { FiArrowLeft } from 'react-icons/fi';
import './Reader.css';

const Reader = ({bookData, onProgressUpdate, onBack}) => {
  const {
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
    totalChapters
  } = useEPUB();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fontSize, setFontSize] = useState(16);
  const [theme, setTheme] = useState('light');

  // Extract the stable ID from the bookData prop
  const bookId = bookData?.id;

  // Load the book when bookData is provided
  useEffect(() => {
    if (bookData && bookData.parsedData && bookId) {
      loadParsedBook(bookId, bookData.parsedData).then(() => {
        // Restore reading position if available (.then(), only AFTER the book is loaded)
        if (bookData.currentChapter) {
            loadChapter(bookData.currentChapter);
        }
      });
    }
  }, [bookData, loadParsedBook, loadChapter]);

  // Update progress when chapter changes
  useEffect(() => {
    if (book && currentChapter !== undefined && onProgressUpdate) {
      const progress = ((currentChapter + 1) / totalChapters) * 100;
      onProgressUpdate(currentChapter, progress);
    }
  }, [currentChapter, book, totalChapters, onProgressUpdate]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.epub')) {
      await loadEPUB(file);
      setSidebarOpen(true);
    }
  };

  if (!book) {
    return (
      <div className="reader-container">
        <div className="reader-loading">
          <p>Preparing book...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`reader-container theme-${theme}`}>
        {/* Back button overlay */}
      {onBack && (
        <button className="reader-back-btn" onClick={onBack} title="Back to Library">
          <FiArrowLeft />
        </button>
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        book={book}
        currentChapter={currentChapter}
        onNavigate={loadChapterByHref}
        onChapterSelect={loadChapter}
      />
      
      <div className="reader-main">
        <ReadingControls
          currentChapter={currentChapter}
          totalChapters={totalChapters}
          onPrevious={prevChapter}
          onNext={nextChapter}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          theme={theme}
          onThemeChange={setTheme}
          cssEnabled={cssEnabled}
          onCssToggle={() => setCssEnabled(!cssEnabled)}
        />
        
        <ChapterView
          content={chapterContent}
          loading={loading}
          error={error}
          fontSize={fontSize}
          cssEnabled={cssEnabled}
        />
      </div>
    </div>
  );
};

export default Reader;