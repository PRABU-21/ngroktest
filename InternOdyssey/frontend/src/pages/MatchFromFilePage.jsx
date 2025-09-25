import React, { useState } from 'react';
import { apiClient, handleApiError } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import CandidateTable from '../components/CandidateTable';

const MatchFromFilePage = ({ addCandidatesToLeaderboard }) => {
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
      const response = await apiClient.post('/match_from_file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      console.log('Match from file response:', response.data); // Debug log
      
      // Handle FastAPI response structure: {"selected": [...], "message": "..."}
      const responseData = response.data;
      const candidates = responseData.selected || responseData.matched_candidates || responseData || [];
      
      setMatchedCandidates(candidates);
      addCandidatesToLeaderboard(candidates);
      setMessage(`✅ Successfully matched ${candidates.length} candidates!${responseData.message ? ' ' + responseData.message : ''}`);
    } catch (error) {
      console.error('Match from file error:', error); // Debug log
      setMessage(`❌ Error: ${error.response?.data?.message || error.message}`);
      setMatchedCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h1 className="text-3xl font-bold mb-6 text-black">📁 Match From File</h1>
        <p className="text-gray-600 mb-6">
          Upload a JSON file containing candidate data to match against available internship positions.
        </p>
        
        <form onSubmit={handleMatchFromFile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Candidates JSON File
            </label>
            <input
              type="file"
              accept=".json"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {file.name}
              </p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading || !file}
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

export default MatchFromFilePage;