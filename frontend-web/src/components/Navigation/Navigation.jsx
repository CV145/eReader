// frontend-web/src/components/Navigation/Navigation.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiBook, FiUpload } from 'react-icons/fi';
import './Navigation.css';

const Navigation = () => {
  return (
    <nav className="navigation">
      <div className="nav-container">
        <NavLink to="/" className="nav-logo">
          📚 EPUB Reader
        </NavLink>
        
        <div className="nav-links">
          <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
            <FiHome /> Home
          </NavLink>
          <NavLink to="/library" className={({ isActive }) => isActive ? 'active' : ''}>
            <FiBook /> Library
          </NavLink>
          <NavLink to="/upload" className={({ isActive }) => isActive ? 'active' : ''}>
            <FiUpload /> Upload
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;