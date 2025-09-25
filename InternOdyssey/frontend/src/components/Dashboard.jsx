import React, { useState, useRef } from 'react';
import axios from 'axios';

// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

const Dashboard = () => {
  // Global state for leaderboard
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentSection, setCurrentSection] = useState('upload-resume');
  
  // Refs for scrolling to sections
  const uploadResumeRef = useRef(null);
  const matchFromFileRef = useRef(null);
  const manualMatchRef = useRef(null);
  const healthCheckRef = useRef(null);

  const scrollToSection = (section) => {
    setCurrentSection(section);
    const refs = {
      'upload-resume': uploadResumeRef,
      'match-from-file': matchFromFileRef,
      'manual-match': manualMatchRef,
      'health-check': healthCheckRef
    };
    refs[section]?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addCandidatesToLeaderboard = (candidates) => {
    setLeaderboard(prev => {
      const existing = [...prev];
      candidates.forEach(candidate => {
        // Avoid duplicates based on name
        const existingIndex = existing.findIndex(c => c.name === candidate.name);
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
    <div className="flex min-h-screen bg-white">
      {/* Black Sidebar */}
      <div className="w-64 bg-black text-white fixed h-full overflow-y-auto">
        <div className="p-6">
          <h1 className="text-xl font-bold mb-8">InternOdyssey</h1>
          <nav className="space-y-2">
            <button
              onClick={() => scrollToSection('upload-resume')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                currentSection === 'upload-resume' ? 'bg-white text-black' : 'hover:bg-gray-800'
              }`}
            >
              📄 Upload Resume
            </button>
            <button
              onClick={() => scrollToSection('match-from-file')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                currentSection === 'match-from-file' ? 'bg-white text-black' : 'hover:bg-gray-800'
              }`}
            >
              📁 Match From File
            </button>
            <button
              onClick={() => scrollToSection('manual-match')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                currentSection === 'manual-match' ? 'bg-white text-black' : 'hover:bg-gray-800'
              }`}
            >
              ✏️ Manual JSON Match
            </button>
            <button
              onClick={() => scrollToSection('health-check')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                currentSection === 'health-check' ? 'bg-white text-black' : 'hover:bg-gray-800'
              }`}
            >
              ❤️ Health Check
            </button>
          </nav>
        </div>

        {/* Leaderboard in Sidebar */}
        {leaderboard.length > 0 && (
          <div className="p-6 border-t border-gray-700">
            <h2 className="text-lg font-semibold mb-4">🏆 Leaderboard</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {leaderboard.slice(0, 10).map((candidate, index) => (
                <div key={index} className="bg-gray-800 p-3 rounded-lg text-sm">
                  <div className="font-medium">{candidate.name}</div>
                  <div className="text-gray-300">Score: {candidate.final_score?.toFixed(2) || 'N/A'}</div>
                  <div className="text-gray-400 text-xs">{candidate.location}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 p-8">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Upload Resume Section */}
          <section ref={uploadResumeRef} id="upload-resume">
            <FileUploadComponent />
          </section>

          {/* Match From File Section */}
          <section ref={matchFromFileRef} id="match-from-file">
            <MatchFromFileComponent addCandidatesToLeaderboard={addCandidatesToLeaderboard} />
          </section>

          {/* Manual JSON Match Section */}
          <section ref={manualMatchRef} id="manual-match">
            <MatchInternshipComponent addCandidatesToLeaderboard={addCandidatesToLeaderboard} />
          </section>

          {/* Health Check Section */}
          <section ref={healthCheckRef} id="health-check">
            <HealthCheckComponent />
          </section>

          {/* Full Leaderboard Section */}
          {leaderboard.length > 0 && (
            <section className="mt-12">
              <LeaderboardSection leaderboard={leaderboard} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

// File Upload Component
const FileUploadComponent = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [parsedData, setParsedData] = useState(null);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('Please select a file first');
      return;
    }

    setLoading(true);
    setMessage('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload_resumes`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage('✅ File uploaded successfully!');
      setParsedData(response.data.parsed);
    } catch (error) {
      setMessage(`❌ Error: ${error.response?.data?.message || error.message}`);
      setParsedData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-black">📄 Upload Resume</h2>
      <form onSubmit={handleFileUpload} className="space-y-4">
        <div>
          <input
            type="file"
            accept=".json"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full p-3 border border-gray-300 rounded-lg"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !file}
          className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Uploading...' : 'Upload Resume'}
        </button>
      </form>
      
      {message && (
        <div className={`mt-4 p-3 rounded-lg ${
          message.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {message}
        </div>
      )}

      {parsedData && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">📋 Parsed JSON Preview:</h3>
          <pre className="text-sm overflow-x-auto bg-white p-3 rounded border">
            {JSON.stringify(parsedData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

// Match From File Component
const MatchFromFileComponent = ({ addCandidatesToLeaderboard }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [matchedCandidates, setMatchedCandidates] = useState([]);

  const handleMatchFromFile = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('Please select a file first');
      return;
    }

    setLoading(true);
    setMessage('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/match_from_file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const candidates = response.data.matched_candidates || response.data || [];
      setMatchedCandidates(candidates);
      addCandidatesToLeaderboard(candidates);
      setMessage(`✅ Successfully matched ${candidates.length} candidates!`);
    } catch (error) {
      setMessage(`❌ Error: ${error.response?.data?.message || error.message}`);
      setMatchedCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-black">📁 Match From File</h2>
      <form onSubmit={handleMatchFromFile} className="space-y-4">
        <div>
          <input
            type="file"
            accept=".json"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full p-3 border border-gray-300 rounded-lg"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !file}
          className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Matching...' : 'Match Candidates'}
        </button>
      </form>
      
      {message && (
        <div className={`mt-4 p-3 rounded-lg ${
          message.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {message}
        </div>
      )}

      {matchedCandidates.length > 0 && (
        <CandidateTable candidates={matchedCandidates} />
      )}
    </div>
  );
};

// Manual JSON Match Component
const MatchInternshipComponent = ({ addCandidatesToLeaderboard }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [matchedCandidates, setMatchedCandidates] = useState([]);

  const handleManualMatch = async (e) => {
    e.preventDefault();
    if (!jsonInput.trim()) {
      setMessage('Please enter JSON data');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const payload = JSON.parse(jsonInput);
      const response = await axios.post(`${API_BASE_URL}/match_internship`, payload);
      
      const candidates = response.data.matched_candidates || response.data || [];
      setMatchedCandidates(candidates);
      addCandidatesToLeaderboard(candidates);
      setMessage(`✅ Successfully matched ${candidates.length} candidates!`);
    } catch (error) {
      if (error instanceof SyntaxError) {
        setMessage('❌ Error: Invalid JSON format');
      } else {
        setMessage(`❌ Error: ${error.response?.data?.message || error.message}`);
      }
      setMatchedCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-black">✏️ Manual JSON Match</h2>
      <form onSubmit={handleManualMatch} className="space-y-4">
        <div>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='Enter JSON data here...'
            rows={8}
            className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !jsonInput.trim()}
          className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Matching...' : 'Match Candidates'}
        </button>
      </form>
      
      {message && (
        <div className={`mt-4 p-3 rounded-lg ${
          message.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {message}
        </div>
      )}

      {matchedCandidates.length > 0 && (
        <CandidateTable candidates={matchedCandidates} />
      )}
    </div>
  );
};

// Health Check Component
const HealthCheckComponent = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      setHealthStatus(response.data);
    } catch (error) {
      setHealthStatus({
        node: 'error',
        fastapi: { status: 'unreachable', error: error.message }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-black">❤️ Health Check</h2>
      
      <button
        onClick={checkHealth}
        disabled={loading}
        className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed mb-6"
      >
        {loading ? 'Checking...' : 'Check Health Status'}
      </button>

      {healthStatus && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border-2 ${
              healthStatus.node === 'ok' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
            }`}>
              <h3 className="font-semibold">Node.js Backend</h3>
              <p className={healthStatus.node === 'ok' ? 'text-green-600' : 'text-red-600'}>
                {healthStatus.node === 'ok' ? '✅ Online' : '❌ Error'}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg border-2 ${
              healthStatus.fastapi?.status === 'ok' || healthStatus.fastapi === 'ok'
                ? 'border-green-500 bg-green-50' 
                : 'border-red-500 bg-red-50'
            }`}>
              <h3 className="font-semibold">FastAPI Service</h3>
              <p className={
                healthStatus.fastapi?.status === 'ok' || healthStatus.fastapi === 'ok'
                  ? 'text-green-600' 
                  : 'text-red-600'
              }>
                {healthStatus.fastapi?.status === 'ok' || healthStatus.fastapi === 'ok'
                  ? '✅ Online' 
                  : `❌ ${healthStatus.fastapi?.status || 'Error'}`
                }
              </p>
              {healthStatus.fastapi?.error && (
                <p className="text-red-500 text-sm mt-1">{healthStatus.fastapi.error}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Candidate Table Component
const CandidateTable = ({ candidates }) => {
  if (!candidates || candidates.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">🎯 Matched Candidates</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Skills</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Location</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Experience</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Final Score</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-medium">{candidate.name}</td>
                <td className="border border-gray-300 px-4 py-2">
                  {candidate.skills && (
                    <div className="flex flex-wrap gap-1">
                      {candidate.skills.slice(0, 3).map((skill, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded">
                          {skill}
                        </span>
                      ))}
                      {candidate.skills.length > 3 && (
                        <span className="px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded">
                          +{candidate.skills.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2">{candidate.location || 'N/A'}</td>
                <td className="border border-gray-300 px-4 py-2">{candidate.experience || 'N/A'}</td>
                <td className="border border-gray-300 px-4 py-2 font-semibold">
                  {candidate.final_score ? candidate.final_score.toFixed(2) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Full Leaderboard Section
const LeaderboardSection = ({ leaderboard }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-black">🏆 Complete Leaderboard</h2>
      <CandidateTable candidates={leaderboard} />
    </div>
  );
};

export default Dashboard;