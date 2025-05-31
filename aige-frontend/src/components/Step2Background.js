// aige-frontend/src/components/Step2Background.js
import React, { useState } from 'react';
import * as api from '../services/api';
import { ASPECT_RATIOS, DEFAULT_ASPECT_RATIO, BACKGROUND_URLS, DEFAULT_SOURCE_IMAGES } from '../config'; // Added BACKGROUND_URLS, DEFAULT_SOURCE_IMAGES

const Step2Background = ({ avatarId, onBackgroundSuccess }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO);
  const [requestBody, setRequestBody] = useState(null);
  const [responseBody, setResponseBody] = useState(null);
  const [error, setError] = useState(''); // For general errors or string messages
  const [errorObject, setErrorObject] = useState(null); // For detailed error object from API
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
    setErrorObject(null); // Clear previous detailed error
    setResponseBody(null);
    setGeneratedImageReadUrl('');

    const payload = {
      prompt,
      aspect_ratio: aspectRatio,
      avatar_id: avatarId,
      writeUrl: BACKGROUND_URLS.writeUrl, // Use from config
      readUrl: BACKGROUND_URLS.readUrl,   // Use from config
      source_images: DEFAULT_SOURCE_IMAGES, // Use from config (likely empty, but required)
    };
    setRequestBody(payload);

    try {
      const response = await api.generateBackground(avatarId, payload);
      setResponseBody(response);
      // The backend response contains the actual readUrl for the *generated* image
      if (response && response.readUrl) {
        setGeneratedImageReadUrl(response.readUrl);
      }

      const currentTaskID = response.aige_task_id || response.taskId || null;

      if (onBackgroundSuccess) {
        onBackgroundSuccess({
          aigeTaskId: currentTaskID,
          readUrl: response.readUrl // Pass the actual readUrl of the generated image
        });
      }

    } catch (err) {
      // err should now be the detailed error object from the backend
      console.error("Error in Step2Background handleSubmit:", err);
      // err might be an object (from backend) or an Error instance (network issue)
      const errorMessage = err.message || (typeof err === 'string' ? err : 'Failed to generate background. Check console/API error details.');
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

      {/* Display generic error message if errorObject is not providing a specific message */}
      {error && (!errorObject || typeof errorObject.message !== 'string') && <p className="error-message">Error: {error}</p>}

      {/* Display detailed error object if available */}
      {errorObject && (
        <div className="debug-section error-message">
          <h3>API Error Details:</h3>
          {/* Attempt to provide a primary message from the error object if possible */}
          {errorObject.message && typeof errorObject.message === 'string' && <p>{errorObject.message}</p>}
          <pre>{JSON.stringify(errorObject, null, 2)}</pre>
        </div>
      )}

      {/* Display response body only on success now */}
      {responseBody && !errorObject && (
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
