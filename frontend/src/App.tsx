import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Wireframe from './pages/Wireframe';
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import BeachDetails from './pages/BeachDetails';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Styled Pages (Step 5) */}
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/beach/:id" element={<BeachDetails />} />
        
        {/* Wireframe for reference (Step 3) */}
        <Route path="/wireframe/*" element={<Wireframe />} />
        
        {/* Fallback to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
