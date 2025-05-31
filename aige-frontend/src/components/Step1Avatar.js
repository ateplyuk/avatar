// aige-frontend/src/components/Step1Avatar.js
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as api from '../services/api';
import { ASPECT_RATIOS, DEFAULT_ASPECT_RATIO, AVATAR_URLS, DEFAULT_SOURCE_IMAGES } from '../config';

const Step1Avatar = ({ onAvatarSuccess }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO);
  const [avatarId, setAvatarId] = useState('');
  const [requestBody, setRequestBody] = useState(null);
  const [responseBody, setResponseBody] = useState(null);
  const [error, setError] = useState('');
  const [errorObject, setErrorObject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImageReadUrl, setGeneratedImageReadUrl] = useState('');
  const [imageLoadError, setImageLoadError] = useState(false); // New state for image load errors

  useEffect(() => {
    setAvatarId(uuidv4());
  }, []);

  // Reset imageLoadError when generatedImageReadUrl changes
  useEffect(() => {
    setImageLoadError(false);
  }, [generatedImageReadUrl]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setErrorObject(null);
    setResponseBody(null);
    setImageLoadError(false); // Reset image load error on new submission
    // Keep previous image visible during generation for better UX, or clear it:
    // setGeneratedImageReadUrl('');

    const payload = {
      prompt,
      aspect_ratio: aspectRatio,
      avatar_id: avatarId,
      writeUrl: AVATAR_URLS.writeUrl,
      readUrl: AVATAR_URLS.readUrl,
      source_images: DEFAULT_SOURCE_IMAGES,
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
      console.error("Error in Step1Avatar handleSubmit:", err);
      const errorMessage = err.message || (typeof err === 'string' ? err : 'Failed to generate avatar. Check console/API error details.');
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
    setImageLoadError(false); // Reset error on successful load
  };

  return (
    <div className="step-container step-layout-container">
      <div className="form-and-debug-column">
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
        <h3>Generated Avatar Preview</h3>
        {generatedImageReadUrl && !imageLoadError ? (
          <img
            src={generatedImageReadUrl}
            alt="Generated Avatar"
            className="result-image"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        ) : (
          <div className="image-placeholder">
            {imageLoadError
              ? 'Error loading image. Check console or URL.'
              : 'Your generated avatar will appear here.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step1Avatar;
