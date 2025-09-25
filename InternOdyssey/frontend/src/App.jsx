import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import NavigationSidebar from './components/NavigationSidebar';
import DashboardPage from './pages/DashboardPage';
import HealthCheckPage from './pages/HealthCheckPage';
import MatchCandidatesPage from './pages/MatchCandidatesPage';

export default function App() {
  // Global state for selected candidates
  const [selectedCandidates, setSelectedCandidates] = useState([]);

  const addCandidatesToSelected = (candidates) => {
    // Ensure candidates is an array
    if (!Array.isArray(candidates)) {
      console.warn('Expected candidates to be an array, received:', candidates);
      return;
    }

    setSelectedCandidates(prev => {
      const existing = [...prev];
      candidates.forEach(candidate => {
        // Avoid duplicates based on name and id
        const existingIndex = existing.findIndex(c => 
          c.name === candidate.name || (c.id && candidate.id && c.id === candidate.id)
        );
        if (existingIndex === -1) {
          existing.push(candidate);
        } else {
          existing[existingIndex] = candidate; // Update if exists
        }
      });
      // Sort by final_score descending
      return existing.sort((a, b) => (b.final_score || 0) - (a.final_score || 0));
    });
  };

  return (
    <ErrorBoundary>
      <Router>
        <div className="flex min-h-screen bg-white">
          {/* Sidebar */}
          <NavigationSidebar />

          {/* Main Content Area */}
          <div className="flex-1 ml-64 p-8">
            <Routes>
              <Route 
                path="/" 
                element={<DashboardPage 
                  addCandidatesToSelected={addCandidatesToSelected}
                  selectedCandidates={selectedCandidates}
                />} 
              />
              <Route 
                path="/health-check" 
                element={<HealthCheckPage />} 
              />
              <Route 
                path="/match-candidates" 
                element={<MatchCandidatesPage />} 
              />
              {/* Redirect all old routes to dashboard */}
              <Route 
                path="/upload-resume" 
                element={<Navigate to="/" replace />} 
              />
              <Route 
                path="/match-from-file" 
                element={<Navigate to="/" replace />} 
              />
              <Route 
                path="/applicants" 
                element={<Navigate to="/" replace />} 
              />
              <Route 
                path="/leaderboard" 
                element={<Navigate to="/" replace />} 
              />
            </Routes>
          </div>
        </div>
      </Router>
    </ErrorBoundary>
  );
}
