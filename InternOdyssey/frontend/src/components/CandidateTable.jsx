import React from 'react';
import Tag from './Tag';

const CandidateTable = ({ candidates, showTitle = true }) => {
  // Ensure candidates is an array
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {!Array.isArray(candidates) 
          ? 'Invalid candidate data format' 
          : 'No candidates to display'
        }
      </div>
    );
  }

  return (
    <div className="mt-6">
      {showTitle && (
        <h3 className="text-lg font-semibold mb-4">🎯 Matched Candidates</h3>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">#</th>
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
                <td className="border border-gray-300 px-4 py-2 text-center font-medium">
                  {index + 1}
                </td>
                <td className="border border-gray-300 px-4 py-2 font-medium">
                  {candidate.name}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {candidate.skills && (
                    <div className="flex flex-wrap gap-1">
                      {candidate.skills.slice(0, 3).map((skill, idx) => (
                        <Tag key={idx} variant="skill">
                          {skill}
                        </Tag>
                      ))}
                      {candidate.skills.length > 3 && (
                        <Tag variant="count">
                          +{candidate.skills.length - 3}
                        </Tag>
                      )}
                    </div>
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {candidate.location || 'N/A'}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {candidate.experience || 'N/A'}
                </td>
                <td className="border border-gray-300 px-4 py-2 font-semibold text-center">
                  {candidate.final_score ? (
                    <span className="bg-black text-white px-2 py-1 rounded text-sm">
                      {candidate.final_score.toFixed(2)}
                    </span>
                  ) : (
                    'N/A'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CandidateTable;