import { useState } from 'react';
import JobDescriptionForm from '../components/JobDescriptionForm';
import JobDescriptionList from '../components/JobDescriptionList';
import axios from 'axios';

const JobManagementPage = () => {
  const [selectedJob, setSelectedJob] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [matchFile, setMatchFile] = useState(null);
  const [numCandidates, setNumCandidates] = useState(10);
  const [matchResults, setMatchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleJobSubmitted = (job) => {
    setSelectedJob(job);
    setShowForm(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setMatchFile(e.target.files[0]);
    }
  };

  const handleMatch = async (e) => {
    e.preventDefault();
    if (!matchFile || !selectedJob) return;

    setLoading(true);
    setError(null);
    setMatchResults(null);

    try {
      const formData = new FormData();
      formData.append('file', matchFile);
      formData.append('num_candidates', numCandidates);

      const response = await axios.post('/api/match_from_file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMatchResults(response.data);
    } catch (err) {
      console.error('Error matching candidates:', err);
      setError(err.response?.data?.message || 'Failed to match candidates');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Job & Candidate Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          {showForm ? (
            <JobDescriptionForm onJobSubmitted={handleJobSubmitted} />
          ) : (
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 mb-4"
              >
                Create New Job Description
              </button>
              <JobDescriptionList
                onSelectJob={setSelectedJob}
                selectedJobId={selectedJob?.id}
              />
            </div>
          )}
        </div>

        <div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-6">Match Candidates</h2>

            {selectedJob ? (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Selected Job:</h3>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <p className="font-semibold">{selectedJob.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{selectedJob.location}</p>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-700">Please select a job description first.</p>
              </div>
            )}

            <form onSubmit={handleMatch}>
              <div className="mb-4">
                <label htmlFor="candidates-file" className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Candidates JSON File
                </label>
                <input
                  type="file"
                  id="candidates-file"
                  onChange={handleFileChange}
                  accept=".json"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  disabled={!selectedJob}
                />
              </div>

              <div className="mb-6">
                <label htmlFor="num-candidates" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Candidates to Return
                </label>
                <input
                  type="number"
                  id="num-candidates"
                  value={numCandidates}
                  onChange={(e) => setNumCandidates(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedJob || !matchFile || loading}
                className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-300"
              >
                {loading ? 'Processing...' : 'Match Candidates'}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {matchResults && (
        <div className="bg-white p-6 rounded-lg shadow-md mt-8">
          <h2 className="text-2xl font-semibold mb-6">Match Results</h2>
          
          {matchResults.selected.length === 0 ? (
            <p className="text-gray-600">No candidates matched your criteria.</p>
          ) : (
            <div>
              <p className="mb-4 text-green-700">Successfully matched {matchResults.count || matchResults.selected.length} candidates!</p>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Skills
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Experience
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Social/Rural
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {matchResults.selected.map((candidate) => (
                      <tr key={candidate.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {candidate.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-wrap gap-1">
                            {candidate.skills.slice(0, 3).map((skill) => (
                              <span key={skill} className="bg-gray-100 text-xs px-2 py-1 rounded">
                                {skill}
                              </span>
                            ))}
                            {candidate.skills.length > 3 && (
                              <span className="text-gray-500 text-xs">
                                +{candidate.skills.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {candidate.location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {candidate.experience}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {candidate.social}
                          {candidate.rural && (
                            <span className="ml-1 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                              Rural
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className="bg-blue-100 text-blue-800 py-1 px-2 rounded-md">
                            {candidate.final_score.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JobManagementPage;