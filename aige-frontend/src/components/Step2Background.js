// aige-frontend/src/components/Step2Background.js
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as api from '../services/api';
import { ASPECT_RATIOS, DEFAULT_ASPECT_RATIO, generateBackgroundUrls, TASK_STATUS_POLL_INTERVAL } from '../config';

const Step2Background = ({ onBackgroundSuccess, avatarId }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO);
  // const [backgroundId, setBackgroundId] = useState('');
  const [requestBody, setRequestBody] = useState(null);
  const [responseBody, setResponseBody] = useState(null);
  const [error, setError] = useState('');
  const [errorObject, setErrorObject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImageReadUrl, setGeneratedImageReadUrl] = useState('');
  const [imageLoadError, setImageLoadError] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [initialReadUrl, setInitialReadUrl] = useState(null);

  // useEffect(() => {
  //   setBackgroundId(uuidv4());
  // }, []);

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
      const urls = await generateBackgroundUrls();
      const payload = {
        prompt,
        aspect_ratio: aspectRatio,
        // background_id: backgroundId,
        avatar_id: avatarId,
        // aige_task_id: aigeTaskId,
        writeUrl: urls.writeUrl,
        readUrl: urls.readUrl,
        // source_images: DEFAULT_SOURCE_IMAGES
      };
      setRequestBody(payload);
      setInitialReadUrl(urls.readUrl);

      const response = await api.generateBackground(avatarId, payload);
      setResponseBody({
        aige_task_id: response.aige_task_id,
        // background_id: response.background_id,
        avatar_id: avatarId

      });

      const currentTaskID = response.aige_task_id; //|| response.taskId || null;
      setCurrentTaskId(currentTaskID);
      
      if (onBackgroundSuccess) {
        onBackgroundSuccess({
          // backgroundId: backgroundId,
          aigeTaskId: currentTaskID,
          readUrl: urls.readUrl
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

  return (
    <div className="step-container step-layout-container">
      <div className="form-and-debug-column">
        <h2>Step 2: Generate Background</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="background-prompt">Prompt:</label>
            <input
              type="text"
              id="background-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="background-aspect-ratio">Aspect Ratio:</label>
            <select
              id="background-aspect-ratio"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
            >
              {ASPECT_RATIOS.map(ar => (
                <option key={ar.value} value={ar.value}>{ar.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={isLoading}>
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
        {taskStatus === 'done' && generatedImageReadUrl ? (
          <img
            src={generatedImageReadUrl}
            alt="Generated Background"
            className="result-image"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        ) : (
          <div className="image-placeholder">
            {isLoading ? 'Generating background...' : 'Your generated background will appear here.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step2Background;
