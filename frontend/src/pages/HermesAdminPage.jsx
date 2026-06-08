import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const HermesAdminPage = () => {
  const [hermesStatus, setHermesStatus] = useState(null);
  const [agentStatuses, setAgentStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const navigate = useNavigate();

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/hermes/status');
      const data = await response.json();

      if (data.success) {
        setHermesStatus(data.data);
        setAgentStatuses(data.data.agents || {});
        setIsRunning(data.data.isRunning);
      } else {
        setError(data.error || 'Failed to fetch Hermes status');
      }
    } catch (err) {
      setError('Failed to connect to Hermes agent system');
    } finally {
      setLoading(false);
    }
  };

  const runCycle = async () => {
    try {
      const response = await fetch('/api/hermes/run-cycle', {
        method: 'POST'
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      // Refresh status after cycle
      setTimeout(fetchStatus, 2000);
    } catch (err) {
      setError(`Failed to run Hermes cycle: ${err.message}`);
    }
  };

  const toggleScheduledRuns = async () => {
    try {
      const method = isRunning ? 'stop' : 'start';
      const response = await fetch(`/api/hermes/${method}-scheduled-runs`, {
        method: 'POST'
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setIsRunning(!isRunning);
      fetchStatus(); // Refresh status
    } catch (err) {
      setError(`Failed to ${isRunning ? 'stop' : 'start'} scheduled runs: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !hermesStatus) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-6 text-red-600 max-w-xl w-full">
          <h2 className="text-xl font-bold mb-4">Error</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={fetchStatus}
            className="btn btn-outline btn-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Hermes Agent System Admin
          </h1>

          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-700">System Status</h2>
                <p className="text-gray-600">
                  {hermesStatus ? (
                    <>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${hermesStatus.isRunning ? 'bg-green-100 text-green-800'
                          : hermesStatus.scheduled ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'}`}>
                        {hermesStatus.isRunning ? 'Running' :
                         hermesStatus.scheduled ? 'Scheduled' : 'Stopped'}
                      </span>
                      <span className="ml-2 text-sm">Last updated: {new Date(hermesStatus.timestamp).toLocaleTimeString()}</span>
                    </>
                  ) : 'No status available'}
                </p>
              </div>
              <div className="space-x-3">
                {!hermesStatus.isRunning && (
                  <button
                    onClick={toggleScheduledRuns}
                    disabled={loading}
                    className={`btn btn-primary ${loading ? 'opacity-50' : ''}`}
                  >
                    {loading ? 'Starting...' : 'Start Scheduled Runs'}
                  </button>
                )}
                {hermesStatus.isRunning && (
                  <button
                    onClick={toggleScheduledRuns}
                    disabled={loading}
                    className={`btn btn-error ${loading ? 'opacity-50' : ''}`}
                  >
                    {loading ? 'Stopping...' : 'Stop Scheduled Runs'}
                  </button>
                )}
                <button
                  onClick={runCycle}
                  disabled={loading || hermesStatus.isRunning}
                  className={`btn btn-outline ${loading || hermesStatus.isRunning ? 'opacity-50' : ''}`}
                >
                  {loading || hermesStatus.isRunning ? 'Running...' : 'Run Cycle Now'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Agent Statuses</h2>
              {!agentStatuses || Object.keys(agentStatuses).length === 0 ? (
                <p className="text-gray-500">No agent status available</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(agentStatuses).map(([name, status]) => (
                    <div key={name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium text-gray-800 capitalize">{name}</h3>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${status.status === 'healthy' || status.status === 'compliant'
                            ? 'bg-green-100 text-green-800'
                            : status.status === 'needs_improvement' || status.status === 'warning'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'}`}>
                          {status.status || 'unknown'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        {Object.entries(status).map(([key, value]) =>
                          key !== 'status' && key !== 'lastComplianceCheck' && key !== 'lastIntelligenceTypes' &&
                          <div key={key} className="flex justify-between">
                            <span>{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                            <span>{typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : value}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-4">System Information</h2>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Run Interval:</span>
                  <span>{hermesStatus ? hermesStatus.runInterval / 1000 + 's' : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Scheduled:</span>
                  <span>{hermesStatus ? (hermesStatus.scheduled ? 'Yes' : 'No') : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Currently Running:</span>
                  <span>{isRunning ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HermesAdminPage;