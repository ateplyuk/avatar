// aige-frontend/src/components/Step1Avatar.js
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as api from '../services/api';
import { ASPECT_RATIOS, DEFAULT_ASPECT_RATIO, DEFAULT_SOURCE_IMAGES, generateAvatarUrls, TASK_STATUS_POLL_INTERVAL } from '../config';

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
  const [imageLoadError, setImageLoadError] = useState(false);
  // const [refreshKey, setRefreshKey] = useState(0);
  // const [debugInfo, setDebugInfo] = useState(null);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [initialReadUrl, setInitialReadUrl] = useState(null);

  useEffect(() => {
    setAvatarId(uuidv4());
  }, []);

  // Reset imageLoadError when generatedImageReadUrl changes
  useEffect(() => {
    setImageLoadError(false);
  }, [generatedImageReadUrl]);

  // Poll task status
  useEffect(() => {
    let intervalId;

    const pollTaskStatus = async () => {
      if (!currentTaskId) return;

      try {
        const status = await api.getTaskStatus(currentTaskId);
        setTaskStatus(status.status);
        
        if (status.status === 'done') {
          // При достижении статуса done используем initialReadUrl
          if (initialReadUrl) {
            setGeneratedImageReadUrl(initialReadUrl);
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
      // Initial poll
      pollTaskStatus();
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentTaskId, initialReadUrl]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setErrorObject(null);
    setResponseBody(null);
    setImageLoadError(false);
    setTaskStatus(null);
    setInitialReadUrl(null);
    setGeneratedImageReadUrl('');

    try {
      const urls = await generateAvatarUrls();
      const payload = {
        prompt,
        aspect_ratio: aspectRatio,
        avatar_id: avatarId,
        writeUrl: urls.writeUrl,
        readUrl: urls.readUrl,
        source_images: DEFAULT_SOURCE_IMAGES
      };
      setRequestBody(payload);
      setInitialReadUrl(urls.readUrl);

      const response = await api.generateAvatar(payload);
      setResponseBody({
        aige_task_id: response.aige_task_id,
        avatar_id: response.avatar_id
      });

      const currentTaskID = response.aige_task_id; //|| response.taskId || null;
      setCurrentTaskId(currentTaskID);
      
      if (onAvatarSuccess) {
        onAvatarSuccess({
          avatarId: avatarId,
          aigeTaskId: currentTaskID,
          readUrl: urls.readUrl
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
    setImageLoadError(false);
  };

  return (
    <div className="step-container step-layout-container">
      <div className="form-and-debug-column">
        <h2>Step 1: Generate Avatar</h2>
        <div style={{fontSize: '0.95em', color: '#1976d2', marginBottom: 8}}>POST /api/v1/avatar</div>
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
        {taskStatus === 'done' && generatedImageReadUrl ? (
          <img
            src={generatedImageReadUrl}
            alt="Generated Avatar"
            className="result-image"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        ) : (
          <div className="image-placeholder">
            {isLoading ? 'Generating avatar...' : 'Your generated avatar will appear here.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step1Avatar;
