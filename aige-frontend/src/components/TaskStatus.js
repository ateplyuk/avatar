// aige-frontend/src/components/TaskStatus.js
import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { TASK_STATUS_POLL_INTERVAL } from '../config';

const TaskStatus = ({ aigeTaskId, label = "Task Status" }) => {
  const [statusInfo, setStatusInfo] = useState(null);
  const [error, setError] = useState(''); // For errors directly from the polling mechanism/component side
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    // Reset states if aigeTaskId is cleared or not provided
    if (!aigeTaskId) {
      setStatusInfo(null);
      setError('');
      setIsPolling(false);
      return;
    }

    let intervalId = null;
    let componentIsMounted = true;

    const fetchStatus = async () => {
      if (!componentIsMounted) return;

      // Set polling true only when a fetch is initiated
      if (componentIsMounted) setIsPolling(true);

      try {
        const result = await api.getTaskStatus(aigeTaskId);
        if (!componentIsMounted) return;

        setStatusInfo(result);
        setError(''); // Clear component-level error on successful fetch

        const terminalStatuses = ['completed', 'succeeded', 'failed', 'error', 'not_found', 'error_fetching_status'];
        if (result && terminalStatuses.includes(result.status)) {
          if (componentIsMounted) setIsPolling(false);
          if (intervalId) clearInterval(intervalId);
        }
      } catch (err) { // Catch errors from api.getTaskStatus call itself (e.g. network issues not caught by api.js)
        if (!componentIsMounted) return;
        console.error(`Error in TaskStatus component for task ${aigeTaskId}:`, err);
        setError(err.message || 'Failed to fetch task status due to a component/network error.');
        // Set a synthetic status to display this component-level error
        setStatusInfo({ aige_task_id: aigeTaskId, status: 'component_error', error: err.message });
        if (componentIsMounted) setIsPolling(false); // Stop polling on unhandled errors in component
        if (intervalId) clearInterval(intervalId);
      }
    };

    // Fetch immediately on aigeTaskId change, then set up interval.
    fetchStatus();
    intervalId = setInterval(fetchStatus, TASK_STATUS_POLL_INTERVAL);

    return () => { // Cleanup function
      componentIsMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      // Avoid setting state here as component is unmounting
    };
  }, [aigeTaskId]); // Effect dependencies

  const renderStatusDetails = () => {
    if (!statusInfo) return null; // No status yet

    let details = `Status: ${statusInfo.status}`;
    if (statusInfo.progress !== undefined && statusInfo.progress !== null) {
      details += `, Progress: ${statusInfo.progress}%`;
    }
    if (statusInfo.message) { // General messages from backend
      details += `, Message: ${statusInfo.message}`;
    }
    // Display error from statusInfo if backend reported it (e.g. status: 'failed', error: 'details')
    // Exclude the 'component_error' status because its 'error' is already captured by the main 'error' state.
    if (statusInfo.error && statusInfo.status !== 'component_error') {
        details += `, Details: ${statusInfo.error}`;
    }
    return <p>{details}</p>;
  };

  // Initial state when aigeTaskId is not yet available or cleared
  if (!aigeTaskId) {
    return (
      <div className="task-status-container debug-section">
        <h3>{label}</h3>
        <p>Waiting for task ID...</p>
      </div>
    );
  }

  return (
    <div className="task-status-container debug-section">
      <h3>{label} (ID: {aigeTaskId})</h3>
      {isPolling && <p><i>Polling for updates...</i></p>}

      {/* Display component-level errors (e.g., from the catch block) */}
      {error && <p className="error-message">Polling Error: {error}</p>}

      {/* Display status details from statusInfo object */}
      {statusInfo ? renderStatusDetails() : <p>Fetching initial status...</p>}

      {/* Specifically display API-reported errors if present in statusInfo and not a component_error */}
      {statusInfo &&
       statusInfo.error &&
       (statusInfo.status === 'not_found' || statusInfo.status === 'error_fetching_status' || statusInfo.status === 'failed') &&
       statusInfo.status !== 'component_error' && (
        <p className="error-message">API Error: {statusInfo.error}</p>
      )}
    </div>
  );
};

export default TaskStatus;
