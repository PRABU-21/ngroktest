import { useState } from 'react';
import axios from 'axios';

const JobDescriptionForm = ({ onJobSubmitted }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    required_skills: '',
    location: '',
    capacity: 10,
    quotas: {
      rural_min: 0,
      SC_min: 0,
      ST_min: 0
    },
    targeted_social: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('quotas.')) {
      const quotaKey = name.split('.')[1];
      setFormData({
        ...formData,
        quotas: {
          ...formData.quotas,
          [quotaKey]: parseInt(value, 10) || 0
        }
      });
    } else if (name === 'required_skills') {
      setFormData({
        ...formData,
        [name]: value // Keep as string for the input
      });
    } else if (name === 'capacity') {
      setFormData({
        ...formData,
        [name]: parseInt(value, 10) || 0
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Convert skills string to array
      const submitData = {
        ...formData,
        required_skills: formData.required_skills.split(',').map(skill => skill.trim())
      };

      const response = await axios.post('/api/submit_job', submitData);
      setSuccess('Job description submitted successfully!');
      if (onJobSubmitted) {
        onJobSubmitted(response.data.job);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit job description');
      console.error('Error submitting job:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6">Submit Job Description</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Job Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="required_skills" className="block text-sm font-medium text-gray-700 mb-1">
            Required Skills (comma separated)
          </label>
          <input
            type="text"
            id="required_skills"
            name="required_skills"
            value={formData.required_skills}
            onChange={handleChange}
            placeholder="Python, Machine Learning, Data Analysis"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
              Capacity (Total Positions)
            </label>
            <input
              type="number"
              id="capacity"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              min={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="targeted_social" className="block text-sm font-medium text-gray-700 mb-1">
              Targeted Social Category (Optional)
            </label>
            <select
              id="targeted_social"
              name="targeted_social"
              value={formData.targeted_social}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="OBC">OBC</option>
            </select>
          </div>
        </div>
        
        <div className="mb-6 border-t border-gray-200 pt-4">
          <h3 className="text-md font-medium mb-3">Quota Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="quotas.rural_min" className="block text-sm font-medium text-gray-700 mb-1">
                Rural Minimum
              </label>
              <input
                type="number"
                id="quotas.rural_min"
                name="quotas.rural_min"
                value={formData.quotas.rural_min}
                onChange={handleChange}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="quotas.SC_min" className="block text-sm font-medium text-gray-700 mb-1">
                SC Minimum
              </label>
              <input
                type="number"
                id="quotas.SC_min"
                name="quotas.SC_min"
                value={formData.quotas.SC_min}
                onChange={handleChange}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="quotas.ST_min" className="block text-sm font-medium text-gray-700 mb-1">
                ST Minimum
              </label>
              <input
                type="number"
                id="quotas.ST_min"
                name="quotas.ST_min"
                value={formData.quotas.ST_min}
                onChange={handleChange}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Job Description'}
        </button>
      </form>
    </div>
  );
};

export default JobDescriptionForm;