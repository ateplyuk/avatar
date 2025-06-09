import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { OVERLAY_ASPECT_RATIOS, DEFAULT_OVERLAY_ASPECT_RATIO, OVERLAY_URLS } from '../config';
import './Step3Overlay.css';

const Step3Overlay = ({ avatarId, personImageUrl, backgroundImageUrl, onOverlaySuccess }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_OVERLAY_ASPECT_RATIO);
  const [position, setPosition] = useState({ x: 0, y: 0, scale: 1 });
  const [requestBody, setRequestBody] = useState(null);
  const [responseBody, setResponseBody] = useState(null);
  const [error, setError] = useState('');
  const [errorObject, setErrorObject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImageReadUrl, setGeneratedImageReadUrl] = useState('');
  const [imageLoadError, setImageLoadError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewContainerRef, setPreviewContainerRef] = useState(null);

  useEffect(() => {
    setImageLoadError(false);
  }, [generatedImageReadUrl]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!avatarId) {
      setError('Avatar ID is missing. Please complete previous steps first.');
      return;
    }

    if (!personImageUrl || !backgroundImageUrl) {
      setError('Person and background images are required. Please complete previous steps first.');
      return;
    }

    setIsLoading(true);
    setError('');
    setErrorObject(null);
    setResponseBody(null);
    setImageLoadError(false);

    const payload = {
      prompt,
      aspect_ratio: aspectRatio,
      params: {
        person: personImageUrl,
        background: backgroundImageUrl,
        position
      },
      avatar_id: avatarId,
      writeUrl: OVERLAY_URLS.writeUrl,
      readUrl: OVERLAY_URLS.readUrl
    };
    setRequestBody(payload);

    try {
      const response = await api.generateOverlay(avatarId, payload);
      setResponseBody({
        aige_task_id: response.aige_task_id,
        avatar_id: response.avatar_id,
        status: response.status
      });
      if (response && payload.readUrl) {
        setGeneratedImageReadUrl(payload.readUrl);
      }
      const currentTaskID = response.aige_task_id || response.taskId || null;
      if (onOverlaySuccess) {
        onOverlaySuccess({
          aigeTaskId: currentTaskID,
          readUrl: payload.readUrl
        });
      }
    } catch (err) {
      console.error("Error in Step3Overlay handleSubmit:", err);
      const errorMessage = err.message || (typeof err === 'string' ? err : 'Failed to generate overlay. Check console/API error details.');
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

  const handlePositionChange = (field, value) => {
    setPosition(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', ''); // Required for Firefox
    e.target.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    if (previewContainerRef) {
      const rect = previewContainerRef.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setPosition(prev => ({
        ...prev,
        x: Math.round(x),
        y: Math.round(y)
      }));
    }
  };

  if (!avatarId) {
    return (
      <div className="step-container disabled-step">
        <h2>Step 3: Generate Overlay</h2>
        <p>Please complete previous steps first. Avatar ID is required.</p>
      </div>
    );
  }

  return (
    <div className="step-container step-layout-container">
      <div className="form-and-debug-column">
        <h2>Step 3: Generate Overlay (for Avatar ID: {avatarId})</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="overlay-prompt">Prompt:</label>
            <input
              type="text"
              id="overlay-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="overlay-aspect-ratio">Aspect Ratio:</label>
            <select
              id="overlay-aspect-ratio"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
            >
              {OVERLAY_ASPECT_RATIOS.map(ar => (
                <option key={ar.value} value={ar.value}>{ar.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Position:</label>
            <div>
              <label htmlFor="position-x">X:</label>
              <input
                type="number"
                id="position-x"
                value={position.x}
                onChange={(e) => handlePositionChange('x', Number(e.target.value))}
              />
            </div>
            <div>
              <label htmlFor="position-y">Y:</label>
              <input
                type="number"
                id="position-y"
                value={position.y}
                onChange={(e) => handlePositionChange('y', Number(e.target.value))}
              />
            </div>
            <div>
              <label htmlFor="position-scale">Scale:</label>
              <input
                type="number"
                id="position-scale"
                value={position.scale}
                onChange={(e) => handlePositionChange('scale', Number(e.target.value))}
                step="0.1"
                min="0.1"
                max="10"
              />
            </div>
          </div>
          <button type="submit" disabled={isLoading || !avatarId || !personImageUrl || !backgroundImageUrl}>
            {isLoading ? 'Generating...' : 'Generate Overlay'}
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
        <h3>Position Preview</h3>
        <div 
          className="preview-container"
          ref={setPreviewContainerRef}
          style={{ position: 'relative', width: '100%', height: '400px', border: '1px solid #ccc' }}
        >
          {backgroundImageUrl && (
            <img
              src={backgroundImageUrl}
              alt="Background"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          {personImageUrl && (
            <img
              src={personImageUrl}
              alt="Person"
              draggable="true"
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: `scale(${position.scale})`,
                cursor: 'move',
                maxWidth: '200px',
                maxHeight: '200px',
                objectFit: 'contain'
              }}
            />
          )}
        </div>

        <h3>Generated Overlay Preview</h3>
        {generatedImageReadUrl ? (
          <>
            {!imageLoadError ? (
              <img
                key={refreshKey}
                src={generatedImageReadUrl}
                alt="Generated Overlay"
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
            Your generated overlay will appear here.
          </div>
        )}
      </div>
    </div>
  );
};

export default Step3Overlay; 