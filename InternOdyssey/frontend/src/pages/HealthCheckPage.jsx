import React, { useState, useEffect } from 'react';
import { apiClient, testApiConnection } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const HealthCheckPage = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiTestResult, setApiTestResult] = useState(null);
  const [apiTestLoading, setApiTestLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/health');
      setHealthStatus(response.data);
    } catch (error) {
      setHealthStatus({
        node: 'error',
        fastapi: { status: 'unreachable', error: error.message }
      });
    } finally {
      setLoading(false);
    }
  };

  const testApiConnectivity = async () => {
    setApiTestLoading(true);
    setApiTestResult(null);
    try {
      const result = await testApiConnection();
      setApiTestResult(result);
    } catch (error) {
      setApiTestResult({
        success: false,
        error: error.message
      });
    } finally {
      setApiTestLoading(false);
    }
  };
  
  useEffect(() => {
    checkHealth();
  }, []);

  // Render status indicator based on value
  const StatusIndicator = ({ status }) => {
    let colorClass = '';
    switch (status?.toLowerCase()) {
      case 'ok':
      case 'online':
      case 'running':
        colorClass = 'bg-green-500';
        break;
      case 'warning':
      case 'partial':
        colorClass = 'bg-yellow-500';
        break;
      case 'error':
      case 'unreachable':
      case 'offline':
        colorClass = 'bg-red-500';
        break;
      default:
        colorClass = 'bg-gray-500';
    }

    return (
      <span className={`inline-block w-3 h-3 rounded-full ${colorClass} mr-2`}></span>
    );
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">System Health Status</h1>
        <div className="space-x-2">
          <button
            onClick={checkHealth}
            disabled={loading}
            className="px-4 py-2 font-semibold text-white bg-blue-500 rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? 'Checking...' : 'Refresh Status'}
          </button>
          <button
            onClick={testApiConnectivity}
            disabled={apiTestLoading}
            className="px-4 py-2 font-semibold text-white bg-purple-500 rounded hover:bg-purple-700 disabled:bg-purple-300"
          >
            {apiTestLoading ? 'Testing...' : 'Test API Connection'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      ) : healthStatus ? (
        <div className="space-y-6">
          {/* Node.js Server Status */}
          <div className="p-4 border rounded-lg">
            <h2 className="flex items-center text-xl font-semibold mb-3">
              <StatusIndicator status={healthStatus.node} />
              Node.js Server
            </h2>
            <div className="ml-5 p-3 bg-gray-50 rounded">
              <p className="text-sm">
                <span className="font-semibold">Status:</span>{' '}
                <span className={healthStatus.node === 'ok' ? 'text-green-600' : 'text-red-600'}>
                  {healthStatus.node === 'ok' ? 'Running' : 'Error'}
                </span>
              </p>
            </div>
          </div>

          {/* FastAPI Server Status */}
          <div className="p-4 border rounded-lg">
            <h2 className="flex items-center text-xl font-semibold mb-3">
              <StatusIndicator 
                status={healthStatus.fastapi?.status === 'ok' ? 'ok' : 'error'} 
              />
              FastAPI Server
            </h2>
            <div className="ml-5 p-3 bg-gray-50 rounded">
              <p className="text-sm">
                <span className="font-semibold">Status:</span>{' '}
                <span 
                  className={
                    healthStatus.fastapi?.status === 'ok' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }
                >
                  {healthStatus.fastapi?.status === 'ok' 
                    ? 'Running' 
                    : healthStatus.fastapi?.error || 'Unreachable'}
                </span>
              </p>
              {healthStatus.fastapi?.version && (
                <p className="text-sm mt-2">
                  <span className="font-semibold">Version:</span> {healthStatus.fastapi.version}
                </p>
              )}
            </div>
          </div>

          {/* API Connection Test Results */}
          {apiTestResult && (
            <div className="p-4 border rounded-lg">
              <h2 className="flex items-center text-xl font-semibold mb-3">
                <StatusIndicator status={apiTestResult.success ? 'ok' : 'error'} />
                API Connection Test
              </h2>
              <div className="ml-5 p-3 bg-gray-50 rounded">
                {apiTestResult.success ? (
                  <div className="text-green-600">
                    <p>Connection successful</p>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-60">
                      {JSON.stringify(apiTestResult.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-red-600">
                    <p>Connection failed: {apiTestResult.error}</p>
                    {apiTestResult.details && (
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-60">
                        {JSON.stringify(apiTestResult.details, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-10 text-center text-gray-500">
          <p>No health data available. Click "Refresh Status" to check system health.</p>
        </div>
      )}

      {/* Troubleshooting Section */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Troubleshooting</h3>
        <ul className="list-disc pl-5 text-sm text-blue-700 space-y-1">
          <li>If Node.js server is unreachable, check if the backend server is running on port 5000</li>
          <li>If FastAPI is unreachable, verify that the Python FastAPI server is running</li>
          <li>Check that your FASTAPI_URL or NGROK_URL environment variable is set correctly in the backend</li>
          <li>Verify network connectivity between frontend and backend servers</li>
          <li>Check for any firewall rules that might be blocking connections</li>
        </ul>
      </div>
    </div>
  );
};

export default HealthCheckPage;