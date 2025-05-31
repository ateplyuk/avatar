// aige-frontend/src/components/Step2Background.js
import React, { useState } from 'react';
import * as api from '../services/api';
import { ASPECT_RATIOS, DEFAULT_ASPECT_RATIO } from '../config';

const Step2Background = ({ avatarId, onBackgroundSuccess }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO);
  const [requestBody, setRequestBody] = useState(null);
  const [responseBody, setResponseBody] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImageReadUrl, setGeneratedImageReadUrl] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!avatarId) {
      setError('Avatar ID is missing. Please complete Step 1 first.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResponseBody(null);
    setGeneratedImageReadUrl('');

    const payload = {
      prompt,
      aspect_ratio: aspectRatio,
      avatar_id: avatarId, // Backend expects avatar_id in body as well for validation
    };
    setRequestBody(payload);

    try {
      const response = await api.generateBackground(avatarId, payload); // avatarId also in path
      setResponseBody(response);
      if (response && response.readUrl) {
        setGeneratedImageReadUrl(response.readUrl);
      }

      const currentTaskID = response.aige_task_id || response.taskId || null; // Adapt to actual response field

      if (onBackgroundSuccess) {
        onBackgroundSuccess({
          aigeTaskId: currentTaskID,
          readUrl: response.readUrl
        });
      }

    } catch (err) {
      setError(err.message || 'Failed to generate background.');
      // If the error object (err) has a 'data' property (like from Axios error.response), use that.
      // Otherwise, use the err object itself (which might be a simple Error).
      setResponseBody(err.data || err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!avatarId) {
    return (
      <div className="step-container disabled-step">
        <h2>Step 2: Generate Background</h2>
        <p>Please complete Step 1 to generate an avatar first. Avatar ID is required.</p>
      </div>
    );
  }

  return (
    <div className="step-container">
      <h2>Step 2: Generate Background (for Avatar ID: {avatarId})</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="bg-prompt">Prompt:</label>
          <input
            type="text"
            id="bg-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="bg-aspect-ratio">Aspect Ratio:</label>
          <select
            id="bg-aspect-ratio"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
          >
            {ASPECT_RATIOS.map(ar => (
              <option key={ar.value} value={ar.value}>{ar.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={isLoading || !avatarId}>
          {isLoading ? 'Generating...' : 'Generate Background'}
        </button>
      </form>

      {requestBody && (
        <div className="debug-section">
          <h3>Request Body:</h3>
          <pre>{JSON.stringify(requestBody, null, 2)}</pre>
        </div>
      )}

      {isLoading && <p>Loading image...</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {responseBody && (
        <div className="debug-section">
          <h3>Response Body:</h3>
          <pre>{JSON.stringify(responseBody, null, 2)}</pre>
        </div>
      )}

      {generatedImageReadUrl && (
        <div className="image-preview">
          <h3>Generated Background:</h3>
          <img src={generatedImageReadUrl} alt="Generated Background" style={{ maxWidth: '100%', height: 'auto' }} />
        </div>
      )}
    </div>
  );
};

export default Step2Background;
