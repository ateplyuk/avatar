import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { REFRAME_ASPECT_RATIOS, DEFAULT_REFRAME_ASPECT_RATIO, generateReframeUrls, TASK_STATUS_POLL_INTERVAL } from '../config';

const Step6Reframe = ({ onReframeSuccess, avatarId, inputImageUrl }) => {
  const [imageUrl, setImageUrl] = useState(inputImageUrl || '');
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_REFRAME_ASPECT_RATIO);
  const [prompt, setPrompt] = useState('');
  const [gridPositionX, setGridPositionX] = useState('');
  const [gridPositionY, setGridPositionY] = useState('');
  const [xStart, setXStart] = useState('');
  const [xEnd, setXEnd] = useState('');
  const [yStart, setYStart] = useState('');
  const [yEnd, setYEnd] = useState('');
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

  // Update imageUrl when inputImageUrl prop changes
  useEffect(() => {
    if (inputImageUrl) {
      setImageUrl(inputImageUrl);
    }
  }, [inputImageUrl]);

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
      const urls = await generateReframeUrls();
      const payload = {
        image_url: imageUrl,
        aspect_ratio: aspectRatio,
        avatar_id: avatarId,
        writeUrl: urls.writeUrl,
        readUrl: urls.readUrl,
      };

      // Add optional parameters if they are provided
      if (prompt.trim()) {
        payload.prompt = prompt.trim();
      }
      if (gridPositionX !== '') {
        payload.grid_position_x = parseInt(gridPositionX);
      }
      if (gridPositionY !== '') {
        payload.grid_position_y = parseInt(gridPositionY);
      }
      if (xStart !== '') {
        payload.x_start = parseInt(xStart);
      }
      if (xEnd !== '') {
        payload.x_end = parseInt(xEnd);
      }
      if (yStart !== '') {
        payload.y_start = parseInt(yStart);
      }
      if (yEnd !== '') {
        payload.y_end = parseInt(yEnd);
      }

      setRequestBody(payload);
      setInitialReadUrl(urls.readUrl);

      const response = await api.generateReframe(avatarId, payload);
      setResponseBody({
        aige_task_id: response.aige_task_id,
        avatar_id: avatarId
      });

      const currentTaskID = response.aige_task_id;
      setCurrentTaskId(currentTaskID);
      
      if (onReframeSuccess) {
        onReframeSuccess({
          aigeTaskId: currentTaskID,
          readUrl: urls.readUrl
        });
      }
    } catch (err) {
      console.error("Error in Step6Reframe handleSubmit:", err);
      const errorMessage = err.message || (typeof err === 'string' ? err : 'Failed to reframe image. Check console/API error details.');
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
        <h2>Step 6: Reframe Image</h2>
        <div style={{fontSize: '0.95em', color: '#1976d2', marginBottom: 8}}>
          {`PUT /api/v1/avatar/${avatarId}/reframe`}
        </div>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="reframe-image-url">Image URL:</label>
            <input
              type="url"
              id="reframe-image-url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              required
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <div>
            <label htmlFor="reframe-aspect-ratio">Aspect Ratio:</label>
            <select
              id="reframe-aspect-ratio"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
            >
              {REFRAME_ASPECT_RATIOS.map(ar => (
                <option key={ar.value} value={ar.value}>{ar.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="reframe-prompt">Prompt (Optional):</label>
            <input
              type="text"
              id="reframe-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Optional prompt for reframing"
            />
          </div>
          <div>
            <label htmlFor="reframe-grid-x">Grid Position X (Optional):</label>
            <input
              type="number"
              id="reframe-grid-x"
              value={gridPositionX}
              onChange={(e) => setGridPositionX(e.target.value)}
              placeholder="X position of the grid"
            />
          </div>
          <div>
            <label htmlFor="reframe-grid-y">Grid Position Y (Optional):</label>
            <input
              type="number"
              id="reframe-grid-y"
              value={gridPositionY}
              onChange={(e) => setGridPositionY(e.target.value)}
              placeholder="Y position of the grid"
            />
          </div>
          <div>
            <label htmlFor="reframe-x-start">X Start (Optional):</label>
            <input
              type="number"
              id="reframe-x-start"
              value={xStart}
              onChange={(e) => setXStart(e.target.value)}
              placeholder="Start X coordinate"
            />
          </div>
          <div>
            <label htmlFor="reframe-x-end">X End (Optional):</label>
            <input
              type="number"
              id="reframe-x-end"
              value={xEnd}
              onChange={(e) => setXEnd(e.target.value)}
              placeholder="End X coordinate"
            />
          </div>
          <div>
            <label htmlFor="reframe-y-start">Y Start (Optional):</label>
            <input
              type="number"
              id="reframe-y-start"
              value={yStart}
              onChange={(e) => setYStart(e.target.value)}
              placeholder="Start Y coordinate"
            />
          </div>
          <div>
            <label htmlFor="reframe-y-end">Y End (Optional):</label>
            <input
              type="number"
              id="reframe-y-end"
              value={yEnd}
              onChange={(e) => setYEnd(e.target.value)}
              placeholder="End Y coordinate"
            />
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Reframing...' : 'Reframe Image'}
          </button>
        </form>

        {isLoading && <p>Reframing image...</p>}

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
        <h3>Reframed Image Preview</h3>
        {taskStatus === 'done' && generatedImageReadUrl ? (
          <img
            src={generatedImageReadUrl}
            alt="Reframed Image"
            className="result-image"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        ) : (
          <div className="image-placeholder">
            {isLoading ? 'Reframing image...' : 'Your reframed image will appear here.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step6Reframe; 