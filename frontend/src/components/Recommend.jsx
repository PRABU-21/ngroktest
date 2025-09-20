import { useState } from "react";
import axios from "axios";

function Recommend() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a PDF file first.");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const res = await axios.post(
        "https://ursula-pseudoviscous-usably.ngrok-free.app/recommendations",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setRecommendations(res.data.recommendations || []);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch recommendations.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl border border-purple-200">
      {/* Title */}
      <h3 className="text-2xl font-bold text-[#7209b7] mb-6 text-center">
        📑 Upload Resume for Recommendations
      </h3>

      {/* Big File Input */}
      <div
        className="border-2 border-dashed border-purple-300 rounded-xl p-12 text-center cursor-pointer hover:border-purple-500 transition"
        onClick={() => document.getElementById("resumeInput").click()}
      >
        <input
          id="resumeInput"
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="text-gray-500 text-lg">
          {file ? `Selected: ${file.name}` : "Click here or drag PDF to upload"}
        </p>
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={loading || !file}
        className="mt-6 w-full bg-[#7209b7] hover:bg-[#9d4edd] text-white px-6 py-3 rounded-xl shadow-md disabled:opacity-50 text-lg transition"
      >
        {loading ? "Uploading..." : "Get Job Recommendations"}
      </button>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-8">
          <h4 className="text-lg font-semibold text-gray-700 mb-3">
            🎯 Recommended Roles
          </h4>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recommendations.map((job) => (
              <div
                key={job.job_id}
                className="flex-shrink-0 w-56 bg-gradient-to-br from-purple-50 via-white to-purple-100 border border-purple-200 rounded-xl shadow-md p-4 hover:shadow-lg transition"
              >
                <h5 className="text-md font-bold text-[#7209b7] mb-2">
                  {job.title}
                </h5>
                <p className="text-sm text-gray-600">
                  Confidence:{" "}
                  <span className="font-semibold text-gray-800">
                    {job.confidence.toFixed(2)}%
                  </span>
                </p>
                <p className="text-xs text-gray-400 mt-2">Job ID: {job.job_id}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Recommend;
