// frontend-web/src/pages/Upload/Upload.jsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../../../../shared/contexts/LibraryContext';
import { EPUBParser } from '../../../../shared/parser/src/EPUBParser';
import { FiUpload, FiCheck, FiX } from 'react-icons/fi';
import './Upload.css';

const Upload = () => {
  const navigate = useNavigate();
  const { addBook } = useLibrary();
  const fileInputRef = useRef(null);
  
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [parsedBook, setParsedBook] = useState(null);

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.epub')) {
      setUploadStatus({ type: 'error', message: 'Please select a valid EPUB file' });
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    try {
      // Parse the EPUB
      const buffer = await file.arrayBuffer();
      const parser = new EPUBParser();
      const parsed = await parser.parse(buffer);
      
      setParsedBook(parsed);
      
      // Add to library
      const bookId = await addBook(file, parsed);
      
      setUploadStatus({ 
        type: 'success', 
        message: 'Book uploaded successfully!',
        bookId 
      });
      
      // Redirect to reader after 2 seconds
      setTimeout(() => {
        navigate(`/read/${bookId}`);
      }, 2000);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({ 
        type: 'error', 
        message: `Failed to parse EPUB: ${error.message}` 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="upload-page">
      <div className="upload-container">
        <h1>Upload EPUB</h1>
        
        <div 
          className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".epub"
            onChange={(e) => handleFile(e.target.files[0])}
            style={{ display: 'none' }}
          />
          
          {uploading ? (
            <div className="uploading">
              <div className="spinner" />
              <p>Parsing EPUB...</p>
            </div>
          ) : (
            <>
              <FiUpload size={48} />
              <h2>Drop EPUB file here</h2>
              <p>or</p>
              <button 
                className="browse-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse Files
              </button>
            </>
          )}
        </div>

        {uploadStatus && (
          <div className={`status-message ${uploadStatus.type}`}>
            {uploadStatus.type === 'success' ? <FiCheck /> : <FiX />}
            <span>{uploadStatus.message}</span>
          </div>
        )}

        {parsedBook && (
          <div className="book-preview">
            <h3>Book Details</h3>
            <p><strong>Title:</strong> {parsedBook.metadata.title}</p>
            <p><strong>Author:</strong> {parsedBook.metadata.creator}</p>
            <p><strong>Chapters:</strong> {parsedBook.spine?.length || 0}</p>
            {parsedBook.fonts?.length > 0 && (
              <p><strong>Embedded Fonts:</strong> {parsedBook.fonts.length}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;