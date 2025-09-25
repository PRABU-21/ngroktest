import React, { useState } from 'react';
import { apiClient, handleApiError } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const UploadResumePage = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [parsedData, setParsedData] = useState(null);

  const handleFileUpload = async (e) => {
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
      const response = await apiClient.post('/upload_resumes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage('✅ File uploaded successfully!');
      setParsedData(response.data.parsed);
    } catch (error) {
      setMessage(`❌ Error: ${error.response?.data?.message || error.message}`);
      setParsedData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h1 className="text-3xl font-bold mb-6 text-black">📄 Upload Resume</h1>
        <p className="text-gray-600 mb-6">
          Upload a JSON file containing resume data to parse and preview the contents.
        </p>
        
        <form onSubmit={handleFileUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Resume JSON File
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
            {loading ? <LoadingSpinner text="Uploading..." /> : 'Upload Resume'}
          </button>
        </form>
        
        {message && (
          <div className={`mt-6 p-4 rounded-lg ${
            message.includes('Error') ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-green-100 text-green-800 border border-green-300'
          }`}>
            {message}
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
      </div>
    </div>
  );
};

export default UploadResumePage;