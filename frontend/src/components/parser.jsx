import { useState } from "react";
import axios from "axios";

function Parser() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);

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
        "https://ursula-pseudoviscous-usably.ngrok-free.app/parser",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setParsedData(res.data.parsed_data || null);
    } catch (err) {
      console.error(err);
      alert("Failed to parse resume.");
    } finally {
      setLoading(false);
    }
  };

  if (!parsedData)
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl mx-auto border border-purple-200 flex flex-col gap-6">
        <h3 className="text-2xl font-bold text-[#7209b7] mb-4 text-center">
          📄 Upload Resume
        </h3>

        {/* Big File Input */}
        <div
          className="border-2 border-dashed border-purple-300 rounded-xl p-12 text-center cursor-pointer hover:border-purple-500 transition"
          onClick={() => document.getElementById("parserInput").click()}
        >
          <input
            id="parserInput"
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
          className="mt-4 w-full bg-[#7209b7] hover:bg-[#9d4edd] text-white px-6 py-3 rounded-xl shadow-md disabled:opacity-50 text-lg transition"
        >
          {loading ? "Parsing..." : "Parse Resume"}
        </button>
      </div>
    );

  return (
    <div className="w-full max-w-5xl mx-auto py-6 flex flex-col gap-6">
      <button
        onClick={() => setParsedData(null)}
        className="self-start mb-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-1 rounded-lg text-sm transition"
      >
        ← Upload Another Resume
      </button>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-purple-200">
          <h4 className="text-purple-700 font-semibold text-lg mb-1">Name</h4>
          <p className="text-gray-700">{parsedData.Name || "N/A"}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-purple-200">
          <h4 className="text-purple-700 font-semibold text-lg mb-1">Contact</h4>
          <p className="text-gray-700">
            Email: {parsedData.Contact?.email || "N/A"}
          </p>
          <p className="text-gray-700">
            Phone: {parsedData.Contact?.phone || "N/A"}
          </p>
        </div>
      </div>

      {/* Skills */}
      {parsedData.Skills?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-purple-200">
          <h4 className="text-purple-700 font-semibold text-lg mb-2">Skills</h4>
          <div className="flex flex-wrap gap-2">
            {parsedData.Skills.map((skill, i) => (
              <span
                key={i}
                className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Education & Work Experience */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parsedData.Education?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-4 border border-purple-200">
            <h4 className="text-purple-700 font-semibold text-lg mb-2">Education</h4>
            {parsedData.Education.map((edu, i) => (
              <p key={i} className="text-gray-700 text-sm mb-1">
                {edu.degree} - {edu.institution} {edu.year ? `(${edu.year})` : ""}
              </p>
            ))}
          </div>
        )}

        {parsedData["Work Experience"]?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-4 border border-purple-200">
            <h4 className="text-purple-700 font-semibold text-lg mb-2">
              Work Experience
            </h4>
            {parsedData["Work Experience"].map((work, i) => (
              <p key={i} className="text-gray-700 text-sm mb-1">
                {work.role} @ {work.company} ({work.duration})
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Certifications */}
      {parsedData.Certifications?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-purple-200">
          <h4 className="text-purple-700 font-semibold text-lg mb-2">Certifications</h4>
          <div className="flex flex-wrap gap-2">
            {parsedData.Certifications.map((cert, i) => (
              <span
                key={i}
                className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
              >
                {cert}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Parser;
