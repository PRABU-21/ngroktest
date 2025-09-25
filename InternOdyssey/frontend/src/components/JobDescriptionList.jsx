import { useState, useEffect } from 'react';
import axios from 'axios';

const JobDescriptionList = ({ onSelectJob, selectedJobId }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/list_jobs');
        setJobs(response.data.jobs || []);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
        setError('Failed to load job descriptions. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="bg-red-100 text-red-700 p-4 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <p className="text-gray-600 text-center">No job descriptions found. Create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6">Available Job Descriptions</h2>
      
      <div className="space-y-4">
        {jobs.map((job) => (
          <div 
            key={job.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedJobId === job.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
            }`}
            onClick={() => onSelectJob(job)}
          >
            <h3 className="text-lg font-medium">{job.title}</h3>
            <div className="mt-2 text-sm text-gray-600">
              <div className="flex flex-wrap gap-2 mt-2">
                {job.required_skills.map((skill) => (
                  <span 
                    key={skill} 
                    className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <p className="mt-2">
                <strong>Location:</strong> {job.location}
              </p>
              <p className="mt-1">
                <strong>Capacity:</strong> {job.capacity} positions
              </p>
              {job.targeted_social && (
                <p className="mt-1">
                  <strong>Targeted Social:</strong> {job.targeted_social}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobDescriptionList;