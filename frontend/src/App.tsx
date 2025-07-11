import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from './components/Header';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Articles from './pages/Articles';
import EntityDetail from './pages/EntityDetail';
import DeveloperMode from './pages/DeveloperMode';
import { ApiProvider } from './contexts/ApiContext';

function App() {
  return (
    <ApiProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 font-inter">
          <Header />
          <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/articles" element={<Articles />} />
              <Route path="/entity/:entityName" element={<EntityDetail />} />
              <Route path="/developer" element={<DeveloperMode />} />
            </Routes>
          </motion.main>
        </div>
      </Router>
    </ApiProvider>
  );
}

export default App;