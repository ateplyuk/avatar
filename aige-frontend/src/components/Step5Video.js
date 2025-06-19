import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { generateAvatarUrls, TASK_STATUS_POLL_INTERVAL } from '../config';

const DURATION_OPTIONS = [
  { label: '5 seconds', value: '5' },
  { label: '10 seconds', value: '10' },
];

const Step5Video = ({ avatarId, onVideoSuccess }) => {
  const [form, setForm] = useState({
    prompt: '',
    input_img: '',
    duration: '5',
    negative_prompt: 'blur, distort, and low quality',
    cfg_scale: 0.5,
  });
  const [requestBody, setRequestBody] = useState(null);
  const [responseBody, setResponseBody] = useState(null);
  const [error, setError] = useState('');
  const [errorObject, setErrorObject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedVideoReadUrl, setGeneratedVideoReadUrl] = useState('');
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [initialReadUrl, setInitialReadUrl] = useState(null);

  useEffect(() => {
    let intervalId;
    const pollTaskStatus = async () => {
      if (!currentTaskId) return;
      try {
        const status = await api.getTaskStatus(currentTaskId);
        setTaskStatus(status.status);
        if (status.status === 'done') {
          if (initialReadUrl) {
            setGeneratedVideoReadUrl(initialReadUrl);
          }
          clearInterval(intervalId);
        } else if (status.status === 'error') {
          setError('Task failed: ' + status.status);
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error('Error polling task status:', err);
        clearInterval(intervalId);
      }
    };
    if (currentTaskId) {
      intervalId = setInterval(pollTaskStatus, TASK_STATUS_POLL_INTERVAL);
      pollTaskStatus();
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentTaskId, initialReadUrl]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setErrorObject(null);
    setResponseBody(null);
    setTaskStatus(null);
    setInitialReadUrl(null);
    setGeneratedVideoReadUrl('');
    try {
      const urls = await generateAvatarUrls();
      const payload = {
        ...form,
        avatar_id: avatarId,
        writeUrl: urls.writeUrl,
        readUrl: urls.readUrl,
      };
      setRequestBody(payload);
      setInitialReadUrl(urls.readUrl);
      const response = await api.generateVideo(avatarId, payload);
      setResponseBody({
        aige_task_id: response.aige_task_id,
        avatar_id: avatarId,
      });
      const currentTaskID = response.aige_task_id;
      setCurrentTaskId(currentTaskID);
      if (onVideoSuccess) {
        onVideoSuccess({
          aigeTaskId: currentTaskID,
          readUrl: urls.readUrl,
        });
      }
    } catch (err) {
      console.error('Error in Step5Video handleSubmit:', err);
      const errorMessage = err.message || (typeof err === 'string' ? err : 'Failed to generate video. Check console/API error details.');
      setError(errorMessage);
      setErrorObject(err);
      setResponseBody(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (!avatarId) {
    return (
      <div className="step-container disabled-step">
        <h2>Step 5: Generate Video</h2>
        <p>Please complete previous steps first. Avatar ID is required.</p>
      </div>
    );
  }

  return (
    <div className="step-container step-layout-container">
      <div className="form-and-debug-column">
        <h2>Step 5: Generate Video (for Avatar ID: {avatarId})</h2>
        <div style={{fontSize: '0.95em', color: '#1976d2', marginBottom: 8}}>
          {`PUT /api/v1/avatar/${avatarId}/video`}
        </div>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="video-prompt">Prompt:</label>
            <input
              type="text"
              id="video-prompt"
              name="prompt"
              value={form.prompt}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="video-input-img">Input Image URL:</label>
            <input
              type="text"
              id="video-input-img"
              name="input_img"
              value={form.input_img}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="video-duration">Duration:</label>
            <select
              id="video-duration"
              name="duration"
              value={form.duration}
              onChange={handleChange}
            >
              {DURATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="video-negative-prompt">Negative Prompt:</label>
            <input
              type="text"
              id="video-negative-prompt"
              name="negative_prompt"
              value={form.negative_prompt}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="video-cfg-scale">CFG Scale:</label>
            <input
              type="number"
              id="video-cfg-scale"
              name="cfg_scale"
              value={form.cfg_scale}
              min={0}
              max={10}
              step={0.01}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate Video'}
          </button>
        </form>

        {isLoading && <p>Generating video...</p>}

        {error && (!errorObject || typeof errorObject.message !== 'string') && <p className="error-message">Error: {error}</p>}

        {errorObject && (
          <div className="debug-section error-message">
            <h3>API Error Details:</h3>
            {errorObject.message && typeof errorObject.message === 'string' && <p>{errorObject.message}</p>}
            <pre>{JSON.stringify(errorObject, null, 2)}</pre>
          </div>
        )}

        {requestBody && (
          <div className="debug-section">
            <h3>Request Body:</h3>
            <pre>{JSON.stringify(requestBody, null, 2)}</pre>
          </div>
        )}

        {responseBody && !errorObject && (
          <div className="debug-section">
            <h3>Response Body:</h3>
            <pre>{JSON.stringify(responseBody, null, 2)}</pre>
          </div>
        )}
      </div>
      <div className="image-preview-column">
        <h3>Generated Video Preview</h3>
        {taskStatus === 'done' && generatedVideoReadUrl ? (
          <video
            src={generatedVideoReadUrl}
            controls
            className="result-image"
            style={{ maxWidth: '100%', maxHeight: 400 }}
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="image-placeholder">
            {isLoading ? 'Generating video...' : 'Your generated video will appear here.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step5Video; 