import React, { useState, useEffect } from 'react';
import { apiClient, handleApiError } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import CandidateTable from '../components/CandidateTable';
import Tag from '../components/Tag';

const DashboardPage = ({ addCandidatesToSelected, selectedCandidates }) => {
  // State for different sections
  const [activeTab, setActiveTab] = useState('upload');
  
  // Upload Resume section state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [storedResumes, setStoredResumes] = useState([]);
  
  // Match From File section state
  const [selectedResumeForMatch, setSelectedResumeForMatch] = useState(null);
  const [matchFile, setMatchFile] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchMessage, setMatchMessage] = useState('');
  const [matchedCandidates, setMatchedCandidates] = useState([]);
  
  // Applicants section state
  const [allApplicants, setAllApplicants] = useState([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [applicantsError, setApplicantsError] = useState('');
  const [currentView, setCurrentView] = useState('all');
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch all applicants from backend
  const fetchApplicants = async () => {
    setApplicantsLoading(true);
    setApplicantsError('');
    try {
      const response = await apiClient.get('/list_applicants');
      setAllApplicants(response.data.candidates || []);
    } catch (err) {
      const errorData = handleApiError(err);
      setApplicantsError(`Failed to fetch applicants: ${errorData.message}`);
      setAllApplicants([]);
    } finally {
      setApplicantsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'applicants') {
      fetchApplicants();
    }
  }, [activeTab]);

  // Upload Resume functionality
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadMessage('Please select a file first');
      return;
    }

    setUploadLoading(true);
    setUploadMessage('');
    
    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const response = await apiClient.post('/upload_resumes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadMessage('✅ File uploaded successfully!');
      setParsedData(response.data.parsed);
      
      // Add to stored resumes
      const newResume = {
        id: Date.now().toString(),
        name: uploadFile.name,
        data: response.data.parsed,
        uploadDate: new Date().toLocaleString()
      };
      setStoredResumes(prev => [...prev, newResume]);
    } catch (error) {
      setUploadMessage(`❌ Error: ${error.response?.data?.message || error.message}`);
      setParsedData(null);
    } finally {
      setUploadLoading(false);
    }
  };
  
  // Match From File functionality
  const handleMatchFromFile = async (e) => {
    e.preventDefault();
    if (!matchFile) {
      setMatchMessage('Please select a file first');
      return;
    }

    setMatchLoading(true);
    setMatchMessage('');
    
    const formData = new FormData();
    formData.append('file', matchFile);

    try {
      const response = await apiClient.post('/match_from_file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      console.log('Match from file response:', response.data); // Debug log
      
      // Handle FastAPI response structure: {"selected": [...], "message": "..."}
      const responseData = response.data;
      const candidates = responseData.selected || responseData.matched_candidates || responseData || [];
      
      setMatchedCandidates(candidates);
      addCandidatesToSelected(candidates);
      setMatchMessage(`✅ Successfully matched ${responseData.count || candidates.length} candidates!`);
    } catch (error) {
      console.error('Match from file error:', error); // Debug log
      setMatchMessage(`❌ Error: ${error.response?.data?.message || error.message}`);
      setMatchedCandidates([]);
    } finally {
      setMatchLoading(false);
    }
  };
  
  // Match from stored resume
  const handleMatchFromStoredResume = async (resumeId) => {
    const selectedResume = storedResumes.find(resume => resume.id === resumeId);
    if (!selectedResume) {
      setMatchMessage('No resume selected');
      return;
    }
    
    setMatchLoading(true);
    setMatchMessage('');
    
    try {
      // Create a blob from the JSON data and a file from the blob
      const jsonString = JSON.stringify(selectedResume.data);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const file = new File([blob], selectedResume.name, { type: 'application/json' });
      
      // Create a FormData object and append the file
      const formData = new FormData();
      formData.append('file', file);
      
      // Send to the match_from_file endpoint that we know exists
      const response = await apiClient.post('/match_from_file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const responseData = response.data;
      const candidates = responseData.selected || responseData.matched_candidates || responseData || [];
      
      setMatchedCandidates(candidates);
      addCandidatesToSelected(candidates);
      setMatchMessage(`✅ Successfully matched ${responseData.count || candidates.length} candidates from ${selectedResume.name}!`);
    } catch (error) {
      setMatchMessage(`❌ Error: ${error.response?.data?.message || error.message}`);
      setMatchedCandidates([]);
    } finally {
      setMatchLoading(false);
    }
  };
  
  // Applicants functionality
  // Get current data based on view
  const getCurrentData = () => {
    return currentView === 'all' ? allApplicants : selectedCandidates;
  };

  const currentData = getCurrentData();

  // Switch view
  const switchView = (view) => {
    setCurrentView(view);
    setSelectedApplicant(null);
    setShowDetailModal(false);
  };

  // Show applicant details modal
  const showDetails = (applicant) => {
    setSelectedApplicant(applicant);
    setShowDetailModal(true);
  };

  // Tab navigation
  const renderTabContent = () => {
    switch (activeTab) {
      case 'upload':
        return renderUploadTab();
      case 'match':
        return renderMatchTab();
      case 'applicants':
        return renderApplicantsTab();
      default:
        return renderUploadTab();
    }
  };

  // Upload Resume tab content
  const renderUploadTab = () => {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl font-bold mb-4 text-black">📄 Upload Resume</h2>
        <p className="text-gray-600 mb-6">
          Upload a JSON file containing resume data to store for matching.
        </p>
        
        <form onSubmit={handleFileUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Resume JSON File
            </label>
            <input
              type="file"
              accept=".json"
              onChange={(e) => setUploadFile(e.target.files[0])}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
            />
            {uploadFile && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {uploadFile.name}
              </p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={uploadLoading || !uploadFile}
            className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {uploadLoading ? <LoadingSpinner text="Uploading..." /> : 'Upload Resume'}
          </button>
        </form>
        
        {uploadMessage && (
          <div className={`mt-6 p-4 rounded-lg ${
            uploadMessage.includes('Error') ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-green-100 text-green-800 border border-green-300'
          }`}>
            {uploadMessage}
          </div>
        )}

        {parsedData && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">📋 Parsed JSON Preview</h3>
            <div className="bg-gray-100 rounded-lg p-4 max-h-96 overflow-auto">
              <pre className="text-sm whitespace-pre-wrap">
                {JSON.stringify(parsedData, null, 2)}
              </pre>
            </div>
          </div>
        )}
        
        {storedResumes.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Stored Resumes</h3>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {storedResumes.map((resume) => (
                    <tr key={resume.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{resume.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{resume.uploadDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setActiveTab('match');
                            setSelectedResumeForMatch(resume);
                          }}
                          className="text-black hover:text-gray-700"
                        >
                          Match
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Match From File tab content
  const renderMatchTab = () => {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl font-bold mb-4 text-black">📁 Match Candidates</h2>
        
        {/* Match from stored resume section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Match from Stored Resume</h3>
          
          {storedResumes.length > 0 ? (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select a stored resume
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {storedResumes.map((resume) => (
                    <div 
                      key={resume.id} 
                      className={`border p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedResumeForMatch?.id === resume.id 
                          ? 'border-black bg-gray-100' 
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      onClick={() => setSelectedResumeForMatch(resume)}
                    >
                      <p className="font-medium truncate">{resume.name}</p>
                      <p className="text-xs text-gray-500">{resume.uploadDate}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                onClick={() => handleMatchFromStoredResume(selectedResumeForMatch?.id)}
                disabled={matchLoading || !selectedResumeForMatch}
                className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {matchLoading ? <LoadingSpinner text="Matching candidates..." /> : 'Match Selected Resume'}
              </button>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
              <p className="flex items-center">
                <span className="text-xl mr-2">ℹ️</span>
                <span>No stored resumes found. Please upload resumes in the Upload tab first.</span>
              </p>
            </div>
          )}
        </div>

        {/* Match from new file section */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Match from New File</h3>
          <form onSubmit={handleMatchFromFile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Candidates JSON File
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setMatchFile(e.target.files[0])}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
              />
              {matchFile && (
                <p className="text-sm text-gray-600 mt-1">
                  Selected: {matchFile.name}
                </p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={matchLoading || !matchFile}
              className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {matchLoading ? <LoadingSpinner text="Matching candidates..." /> : 'Match Candidates'}
            </button>
          </form>
        </div>
        
        {matchMessage && (
          <div className={`mt-6 p-4 rounded-lg ${
            matchMessage.includes('Error') ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-green-100 text-green-800 border border-green-300'
          }`}>
            {matchMessage}
          </div>
        )}

        {matchedCandidates.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Matched Candidates</h3>
            <CandidateTable candidates={matchedCandidates} />
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setActiveTab('applicants')}
                className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                View All Applicants
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Applicants tab content
  const renderApplicantsTab = () => {
    if (applicantsLoading) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-center">
          <LoadingSpinner text="Loading applicants..." />
        </div>
      );
    }

    return (
      <>
        {/* Header with tabs */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => switchView('all')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentView === 'all'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                👥 All Applicants ({allApplicants.length})
              </button>
              <button
                onClick={() => switchView('selected')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentView === 'selected'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ✅ Selected Candidates ({selectedCandidates.length})
              </button>
            </nav>
          </div>

          {/* Refresh button */}
          <div className="px-6 py-4 flex justify-between items-center">
            <button
              onClick={fetchApplicants}
              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm"
            >
              🔄 Refresh Data
            </button>
            <div className="text-sm text-gray-500">
              Showing {currentData.length} {currentView === 'all' ? 'applicants' : 'selected candidates'}
            </div>
          </div>
          
          {applicantsError && (
            <div className="px-6 pb-4">
              <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">
                {applicantsError}
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        {currentData.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 shadow-sm text-center">
            <div className="text-6xl mb-4">
              {currentView === 'all' ? '👥' : '✅'}
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {currentView === 'all' ? 'No Applicants Found' : 'No Selected Candidates'}
            </h2>
            <p className="text-gray-600">
              {currentView === 'all' 
                ? 'Upload some files to see applicants here.' 
                : 'Match some candidates to see selected ones here.'
              }
            </p>
            {currentView === 'all' ? (
              <button
                onClick={() => setActiveTab('upload')}
                className="mt-6 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Upload Resumes
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('match')}
                className="mt-6 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Match Candidates
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 text-left text-sm">
                    <th className="px-4 py-3 font-semibold">#</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Skills</th>
                    <th className="px-4 py-3 font-semibold">Location</th>
                    <th className="px-4 py-3 font-semibold">Experience</th>
                    <th className="px-4 py-3 font-semibold">Demographics</th>
                    <th className="px-4 py-3 font-semibold text-center">Score</th>
                    <th className="px-4 py-3 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentData.map((applicant, index) => (
                    <tr 
                      key={applicant.id || index} 
                      className="hover:bg-gray-50 text-sm"
                    >
                      <td className="px-4 py-3 font-medium text-center">{index + 1}</td>
                      <td className="px-4 py-3 font-medium">{applicant.name}</td>
                      <td className="px-4 py-3">
                        {applicant.skills && applicant.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {applicant.skills.slice(0, 3).map((skill, idx) => (
                              <Tag key={idx} variant="skill">{skill}</Tag>
                            ))}
                            {applicant.skills.length > 3 && (
                              <Tag variant="count">+{applicant.skills.length - 3}</Tag>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{applicant.location || 'N/A'}</td>
                      <td className="px-4 py-3">{applicant.experience || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          {applicant.rural && (
                            <span title="Rural Background" className="h-6 w-6 flex items-center justify-center rounded-full bg-green-100 text-green-800 text-xs font-medium">R</span>
                          )}
                          {applicant.social && (
                            <span title={`Social Category: ${applicant.social}`} className="h-6 w-6 flex items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-medium">S</span>
                          )}
                          {applicant.past_participation && (
                            <span title="Past Participation" className="h-6 w-6 flex items-center justify-center rounded-full bg-orange-100 text-orange-800 text-xs font-medium">P</span>
                          )}
                          {applicant.has_experience && (
                            <span title="Has Experience" className="h-6 w-6 flex items-center justify-center rounded-full bg-purple-100 text-purple-800 text-xs font-medium">E</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {applicant.final_score ? (
                          <span className="inline-block bg-black text-white px-2 py-1 rounded text-sm font-medium">
                            {applicant.final_score.toFixed(2)}
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => showDetails(applicant)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    );
  };

  // Detail Modal
  const renderDetailModal = () => {
    if (!showDetailModal || !selectedApplicant) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-xl font-bold text-gray-900">Applicant Details</h2>
            <button 
              onClick={() => setShowDetailModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedApplicant.name}</h2>
                <p className="text-gray-600 mt-1">ID: {selectedApplicant.id}</p>
              </div>
              {currentView === 'selected' && selectedApplicant.final_score && (
                <div className="bg-black text-white px-4 py-2 rounded-lg">
                  <div className="text-sm text-gray-300">Final Score</div>
                  <div className="text-xl font-bold">{selectedApplicant.final_score.toFixed(2)}</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left column */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedApplicant.skills && selectedApplicant.skills.length > 0 ? (
                      selectedApplicant.skills.map((skill, index) => (
                        <Tag key={index} variant="skill">{skill}</Tag>
                      ))
                    ) : (
                      <span className="text-gray-400">No skills listed</span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    Location
                  </h3>
                  <p className="text-gray-900">{selectedApplicant.location || 'Not specified'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    Experience
                  </h3>
                  <p className="text-gray-900">{selectedApplicant.experience || 'Not specified'}</p>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    Demographics
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Social Category:</span>
                      <span className="font-medium">{selectedApplicant.social || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rural Background:</span>
                      <span className={`font-medium ${selectedApplicant.rural ? 'text-green-600' : 'text-gray-600'}`}>
                        {selectedApplicant.rural ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Past Participation:</span>
                      <span className={`font-medium ${selectedApplicant.past_participation ? 'text-orange-600' : 'text-green-600'}`}>
                        {selectedApplicant.past_participation ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Has Experience:</span>
                      <span className={`font-medium ${selectedApplicant.has_experience ? 'text-blue-600' : 'text-gray-600'}`}>
                        {selectedApplicant.has_experience ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score breakdown for selected candidates */}
                {currentView === 'selected' && selectedApplicant.breakdown && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                      Score Breakdown
                    </h3>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Skills Match:</span>
                        <span>{(selectedApplicant.breakdown.skill_frac * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Semantic Similarity:</span>
                        <span>{(selectedApplicant.breakdown.semantic_sim * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Location Match:</span>
                        <span>{(selectedApplicant.breakdown.location * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Experience Score:</span>
                        <span>{(selectedApplicant.breakdown.experience * 100).toFixed(1)}%</span>
                      </div>
                      {selectedApplicant.breakdown.rural_bonus > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Rural Bonus:</span>
                          <span>+{(selectedApplicant.breakdown.rural_bonus * 100).toFixed(1)}%</span>
                        </div>
                      )}
                      {selectedApplicant.breakdown.social_bonus > 0 && (
                        <div className="flex justify-between text-blue-600">
                          <span>Social Bonus:</span>
                          <span>+{(selectedApplicant.breakdown.social_bonus * 100).toFixed(1)}%</span>
                        </div>
                      )}
                      {selectedApplicant.breakdown.past_penalty > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Past Participation Penalty:</span>
                          <span>-{(selectedApplicant.breakdown.past_penalty * 100).toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t p-4 flex justify-end">
            <button
              onClick={() => setShowDetailModal(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
        <div className="px-1">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-4 px-4 text-center font-medium rounded-t-lg transition-colors ${
                activeTab === 'upload'
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📄 Upload Resume
            </button>
            <button
              onClick={() => setActiveTab('match')}
              className={`flex-1 py-4 px-4 text-center font-medium rounded-t-lg transition-colors ${
                activeTab === 'match'
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📁 Match Candidates
            </button>
            <button
              onClick={() => setActiveTab('applicants')}
              className={`flex-1 py-4 px-4 text-center font-medium rounded-t-lg transition-colors ${
                activeTab === 'applicants'
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              👥 View Applicants
            </button>
          </div>
        </div>
      </div>
      
      {/* Tab Content */}
      {renderTabContent()}
      
      {/* Detail Modal */}
      {renderDetailModal()}
    </div>
  );
};

export default DashboardPage;