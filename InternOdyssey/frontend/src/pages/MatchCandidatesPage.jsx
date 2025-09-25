import { useState } from 'react';
import axios from 'axios';

const MatchCandidatesPage = () => {
  const [matchFile, setMatchFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [matchResults, setMatchResults] = useState(null);
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setMatchFile(e.target.files[0]);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!matchFile) {
      setError('Please select a file first');
      return;
    }
    
    setLoading(true);
    setError(null);
    setMatchResults(null);
    
    const formData = new FormData();
    formData.append('file', matchFile);
    
    try {
      const response = await axios.post('/api/match_from_file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
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
      <h1 className="text-3xl font-bold mb-8">Match Candidates</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-6">Upload Job and Candidates</h2>
        <p className="mb-4 text-gray-600">
          Upload a JSON file containing both an internship description and candidates. 
          The file must have both "internship" and "candidates" keys.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="match-file" className="block text-sm font-medium text-gray-700 mb-1">
              Upload JSON File
            </label>
            <input
              type="file"
              id="match-file"
              onChange={handleFileChange}
              accept=".json"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={!matchFile || loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300"
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
      
      {matchResults && (
        <div className="bg-white p-6 rounded-lg shadow-md mt-8">
          <h2 className="text-2xl font-semibold mb-6">Match Results</h2>
          
          {matchResults.selected?.length === 0 ? (
            <p className="text-gray-600">No candidates matched your criteria.</p>
          ) : (
            <div>
              <p className="mb-4 text-green-700">Successfully matched {matchResults.selected?.length || 0} candidates!</p>
              
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
                    {matchResults.selected?.map((candidate) => (
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

      <div className="bg-white p-6 rounded-lg shadow-md mt-8">
        <h2 className="text-2xl font-semibold mb-4">Expected JSON Format</h2>
        <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
{`{
  "internship": {
    "id": 1,
    "title": "Data Science Intern",
    "description": "We are looking for a data science intern...",
    "required_skills": ["Python", "Machine Learning", "SQL"],
    "location": "Bangalore",
    "capacity": 5,
    "quotas": {
      "rural_min": 1,
      "SC_min": 1,
      "ST_min": 1
    },
    "targeted_social": "SC"
  },
  "candidates": [
    {
      "id": 1,
      "name": "John Doe",
      "skills": ["Python", "Machine Learning", "SQL"],
      "location": "Bangalore",
      "rural": false,
      "social": "General",
      "experience": "1 year",
      "past_participation": false,
      "has_experience": false
    },
    // More candidates...
  ]
}`}
        </pre>
      </div>
    </div>
  );
};

export default MatchCandidatesPage;