// aige-frontend/src/components/Step1Avatar.js
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as api from '../services/api';
import { ASPECT_RATIOS, DEFAULT_ASPECT_RATIO } from '../config';

const Step1Avatar = ({ onAvatarSuccess }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO);
  const [avatarId, setAvatarId] = useState('');
  const [requestBody, setRequestBody] = useState(null);
  const [responseBody, setResponseBody] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImageReadUrl, setGeneratedImageReadUrl] = useState('');
  // const [aigeTaskId, setAigeTaskId] = useState(''); // Will be passed up via onAvatarSuccess

  useEffect(() => {
    setAvatarId(uuidv4()); // Generate avatar_id on component mount
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setResponseBody(null);
    setGeneratedImageReadUrl('');
    // setAigeTaskId('');

    const payload = {
      prompt,
      aspect_ratio: aspectRatio, // Backend handles aspect_ratio
      avatar_id: avatarId,
    };
    setRequestBody(payload);

    try {
      const response = await api.generateAvatar(payload);
      setResponseBody(response);
      if (response && response.readUrl) {
        setGeneratedImageReadUrl(response.readUrl);
      }

      const currentTaskID = response.aige_task_id || response.taskId || null;

      if (onAvatarSuccess) {
        onAvatarSuccess({
          avatarId: avatarId,
          aigeTaskId: currentTaskID,
          readUrl: response.readUrl
        });
      }

    } catch (err) {
      setError(err.message || 'Failed to generate avatar.');
      // If the error object (err) has a 'data' property (like from Axios error.response), use that.
      // Otherwise, use the err object itself (which might be a simple Error).
      setResponseBody(err.data || err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="step-container">
      <h2>Step 1: Generate Avatar</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="avatar-prompt">Prompt:</label>
          <input
            type="text"
            id="avatar-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="avatar-aspect-ratio">Aspect Ratio:</label>
          <select
            id="avatar-aspect-ratio"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
          >
            {ASPECT_RATIOS.map(ar => (
              <option key={ar.value} value={ar.value}>{ar.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Avatar'}
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
          <h3>Generated Avatar:</h3>
          <img src={generatedImageReadUrl} alt="Generated Avatar" style={{ maxWidth: '100%', height: 'auto' }} />
        </div>
      )}
    </div>
  );
};

export default Step1Avatar;
