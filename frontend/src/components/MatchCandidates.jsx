import { useState } from "react";
import axios from "axios";

function MatchCandidates() {
  const [description, setDescription] = useState("");
  const [topK, setTopK] = useState(3);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);

  const handleMatch = async () => {
    if (!description) return alert("Please enter a job description.");

    try {
      setLoading(true);
      const res = await axios.post(
        "https://ursula-pseudoviscous-usably.ngrok-free.app/match_candidates",
        { description, top_k: topK },
        { headers: { "Content-Type": "application/json" } }
      );
      setMatches(res.data.matches || []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch candidate matches.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-3xl border border-purple-200">
      <h3 className="text-2xl font-bold text-[#7209b7] mb-6 text-center">
        🔎 Find Best Candidates
      </h3>

      {/* Job Description Input */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Enter job description here..."
        rows={5}
        className="w-full border border-purple-300 rounded-xl p-4 mb-4 focus:outline-none focus:ring-2 focus:ring-[#7209b7] text-gray-700"
      />

      {/* Top K Input */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-gray-600 font-medium">Top K:</label>
        <input
          type="number"
          value={topK}
          onChange={(e) => setTopK(e.target.value)}
          className="w-20 border border-purple-300 rounded-lg p-2 text-gray-700"
          min="1"
        />
      </div>

      {/* Match Button */}
      <button
        onClick={handleMatch}
        disabled={loading || !description}
        className="w-full bg-[#7209b7] hover:bg-[#9d4edd] text-white px-6 py-3 rounded-xl shadow-md disabled:opacity-50 text-lg transition"
      >
        {loading ? "Matching..." : "Find Candidates"}
      </button>

      {/* Matches */}
      {matches.length > 0 && (
        <div className="mt-8">
          <h4 className="text-lg font-semibold text-gray-700 mb-4">
            🏆 Top Matches
          </h4>
          <div className="grid gap-4">
            {matches.map((candidate, i) => (
  <div
    key={i}
    className="bg-white rounded-2xl shadow-md border border-purple-200 p-6"
  >
    {/* Candidate Name */}
    <h4 className="text-xl font-bold text-[#7209b7] mb-2">
      {candidate.name}
    </h4>

    {/* Score */}
    <p className="text-sm text-gray-600 mb-4">
      Compatibility Score:{" "}
      <span className="font-semibold">{(candidate.score * 100).toFixed(2)}%</span>
    </p>

    {/* Matched Skills */}
    {candidate.matched_skills?.length > 0 && (
      <div className="mb-3">
        <h5 className="text-purple-700 font-semibold mb-1"> Matched Skills</h5>
        <div className="flex flex-wrap gap-2">
          {candidate.matched_skills.map((skill, idx) => (
            <span
              key={idx}
              className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    )}

    {/* All Skills */}
    {candidate.skills?.length > 0 && (
      <div className="mb-3">
        <h5 className="text-purple-700 font-semibold mb-1"> All Skills</h5>
        <div className="flex flex-wrap gap-2">
          {candidate.skills.map((skill, idx) => (
            <span
              key={idx}
              className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    )}

    {/* Location */}
    <p className="text-gray-700 text-sm mb-1">
      📍 Location: {candidate.location || "N/A"}
    </p>

    {/* Experience */}
    <p className="text-gray-700 text-sm mb-1">
      💼 Experience: {candidate.experience || "N/A"}
    </p>

    {/* Certifications */}
    {candidate.certifications?.length > 0 && (
      <div className="mt-2">
        <h5 className="text-purple-700 font-semibold mb-1">🎓 Certifications</h5>
        <div className="flex flex-wrap gap-2">
          {candidate.certifications.map((cert, idx) => (
            <span
              key={idx}
              className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm"
            >
              {cert}
            </span>
          ))}
        </div>
      </div>
    )}
        </div>
))}

          </div>
        </div>
      )}
    </div>
  );
}

export default MatchCandidates;
