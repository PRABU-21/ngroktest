import React, { useState, useEffect } from 'react';
import { apiClient, handleApiError } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Tag from '../components/Tag';

const ApplicantsPage = ({ selectedCandidates }) => {
  const [allApplicants, setAllApplicants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState('all'); // 'all' or 'selected'
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch all applicants from backend
  const fetchApplicants = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/list_applicants');
      setAllApplicants(response.data.candidates || []);
    } catch (err) {
      const errorData = handleApiError(err);
      setError(`Failed to fetch applicants: ${errorData.message}`);
      setAllApplicants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

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

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm text-center">
          <LoadingSpinner text="Loading applicants..." />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
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
        
        {error && (
          <div className="px-6 pb-4">
            <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">
              {error}
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
      
      {/* Detail Modal */}
      {showDetailModal && selectedApplicant && (
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
      )}
    </div>
  );
};

export default ApplicantsPage;