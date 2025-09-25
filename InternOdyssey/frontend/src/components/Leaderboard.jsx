import React from 'react';
import CandidateTable from './CandidateTable';

const Leaderboard = ({ candidates, title = '🏆 Leaderboard' }) => {
  if (!candidates || candidates.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl font-bold mb-6 text-black">{title}</h2>
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-lg">No candidates yet</p>
          <p className="text-sm">Start matching candidates to see them appear here!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-black">{title}</h2>
      <div className="mb-4 text-sm text-gray-600">
        Total candidates: <span className="font-semibold">{candidates.length}</span>
      </div>
      <CandidateTable candidates={candidates} showTitle={false} />
    </div>
  );
};

export default Leaderboard;