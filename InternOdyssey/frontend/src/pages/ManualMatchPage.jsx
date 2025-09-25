import React, { useState } from 'react';
import { apiClient, handleApiError } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import CandidateTable from '../components/CandidateTable';

const ManualMatchPage = ({ addCandidatesToLeaderboard }) => {
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
      const response = await apiClient.post('/match_internship', payload);
      
      // Handle FastAPI response structure: {"selected": [...], "message": "..."}
      const responseData = response.data;
      const candidates = responseData.selected || responseData.matched_candidates || responseData || [];
      
      setMatchedCandidates(candidates);
      addCandidatesToLeaderboard(candidates);
      setMessage(`✅ Successfully matched ${candidates.length} candidates!${responseData.message ? ' ' + responseData.message : ''}`);
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

  const sampleJson = `{
  "internship": {
    "id": 1,
    "title": "Software Engineering Intern",
    "description": "Join our team as a software engineering intern to work on cutting-edge web applications using modern technologies.",
    "required_skills": ["JavaScript", "React", "Node.js"],
    "location": "San Francisco, CA",
    "capacity": 5,
    "quotas": {
      "rural_min": 1,
      "SC_min": 1,
      "ST_min": 1
    },
    "targeted_social": null
  },
  "candidates": [
    {
      "id": 1,
      "name": "John Doe",
      "skills": ["JavaScript", "React", "Python"],
      "location": "San Francisco, CA",
      "rural": false,
      "social": "General",
      "experience": "Fresher",
      "past_participation": false,
      "has_experience": false
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "skills": ["JavaScript", "Node.js", "MongoDB"],
      "location": "Rural Area, CA",
      "rural": true,
      "social": "SC",
      "experience": "6 months",
      "past_participation": false,
      "has_experience": false
    }
  ]
}`;

  const insertSample = () => {
    setJsonInput(sampleJson);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h1 className="text-3xl font-bold mb-6 text-black">✏️ Manual JSON Match</h1>
        <p className="text-gray-600 mb-6">
          Enter JSON data manually to match candidates against internship requirements.
        </p>
        
        <form onSubmit={handleManualMatch} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                JSON Data
              </label>
              <button
                type="button"
                onClick={insertSample}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Insert Sample JSON
              </button>
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='Enter JSON data here...'
              rows={12}
              className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-black focus:border-black"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || !jsonInput.trim()}
            className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <LoadingSpinner text="Matching candidates..." /> : 'Match Candidates'}
          </button>
        </form>
        
        {message && (
          <div className={`mt-6 p-4 rounded-lg ${
            message.includes('Error') ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-green-100 text-green-800 border border-green-300'
          }`}>
            {message}
          </div>
        )}

        {matchedCandidates.length > 0 && (
          <CandidateTable candidates={matchedCandidates} />
        )}
      </div>
    </div>
  );
};

export default ManualMatchPage;