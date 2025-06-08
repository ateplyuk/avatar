// aige-frontend/src/components/Step2Background.js
import React, { useState, useEffect } from 'react'; // Added useEffect
import * as api from '../services/api';
import { ASPECT_RATIOS, DEFAULT_ASPECT_RATIO, BACKGROUND_URLS } from '../config';

const Step2Background = ({ avatarId, onBackgroundSuccess }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO);
  const [requestBody, setRequestBody] = useState(null);
  const [responseBody, setResponseBody] = useState(null);
  const [error, setError] = useState('');
  const [errorObject, setErrorObject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImageReadUrl, setGeneratedImageReadUrl] = useState('');
  const [imageLoadError, setImageLoadError] = useState(false); // New state
  const [refreshKey, setRefreshKey] = useState(0); // Для обновления картинки

  // Reset imageLoadError when generatedImageReadUrl changes
  useEffect(() => {
    setImageLoadError(false);
  }, [generatedImageReadUrl]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!avatarId) {
      setError('Avatar ID is missing. Please complete Step 1 first.');
      return;
    }

    setIsLoading(true);
    setError('');
    setErrorObject(null);
    setResponseBody(null);
    setImageLoadError(false); // Reset image load error on new submission
    // Keep previous image visible or clear it:
    // setGeneratedImageReadUrl('');

    const payload = {
      prompt,
      aspect_ratio: aspectRatio,
      avatar_id: avatarId,
      writeUrl: BACKGROUND_URLS.writeUrl,
      readUrl: BACKGROUND_URLS.readUrl
    };
    setRequestBody(payload);

    try {
      const response = await api.generateBackground(avatarId, payload);
      // Only show aige_task_id and avatar_id in response body
      setResponseBody({
        aige_task_id: response.aige_task_id,
        avatar_id: response.avatar_id
      });
      if (response && payload.readUrl) {
        setGeneratedImageReadUrl(payload.readUrl);
      }
      const currentTaskID = response.aige_task_id || response.taskId || null;
      if (onBackgroundSuccess) {
        onBackgroundSuccess({
          aigeTaskId: currentTaskID,
          readUrl: response.readUrl
        });
      }
    } catch (err) {
      console.error("Error in Step2Background handleSubmit:", err);
      const errorMessage = err.message || (typeof err === 'string' ? err : 'Failed to generate background. Check console/API error details.');
      setError(errorMessage);
      setErrorObject(err);
      setResponseBody(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageError = () => {
    console.error('Error loading image:', generatedImageReadUrl);
    setImageLoadError(true);
  };

  const handleImageLoad = () => {
    setImageLoadError(false);
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
    <div className="step-container step-layout-container">
      <div className="form-and-debug-column">
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

        {isLoading && <p>Loading image...</p>}

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
        <h3>Generated Background Preview</h3>
        {generatedImageReadUrl ? (
          <>
            {!imageLoadError ? (
              <img
                key={refreshKey}
                src={generatedImageReadUrl}
                alt="Generated Background"
                className="result-image"
                onError={handleImageError}
                onLoad={handleImageLoad}
              />
            ) : (
              <div className="image-placeholder">
                Error loading image. Check console or URL.
              </div>
            )}
            <button style={{marginTop: '10px'}} onClick={() => setRefreshKey(prev => prev + 1)}>
              Обновить картинку
            </button>
          </>
        ) : (
          <div className="image-placeholder">
            Your generated background will appear here.
          </div>
        )}
      </div>
    </div>
  );
};

export default Step2Background;
