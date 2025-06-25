import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as api from '../services/api';
import { OVERLAY_USER_ASPECT_RATIOS, DEFAULT_OVERLAY_ASPECT_RATIO, generateOverlayUrls, TASK_STATUS_POLL_INTERVAL } from '../config';
import './Step3Overlay.css';

// Маппинг value -> [width, height] для aspect ratio
const ASPECT_RATIO_MAP = {
  square_hd: [1, 1],
  square: [1, 1],
  portrait_4_3: [3, 4],
  portrait_16_9: [9, 16],
  landscape_4_3: [4, 3],
  landscape_16_9: [16, 9],
};

const Step3Overlay = ({ onOverlaySuccess, avatarId, aigeTaskId, personImageUrl, backgroundImageUrl }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState(OVERLAY_USER_ASPECT_RATIOS[0].value);
  const [overlayId, setOverlayId] = useState('');
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
  const [position, setPosition] = useState({ x: 0, y: 0, scale: 1 });
  const [previewContainerRef, setPreviewContainerRef] = useState(null);
  const [backgroundLoadError, setBackgroundLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Вычисляем размеры превью-контейнера
  const PREVIEW_WIDTH = 300; // px, фиксированная ширина
  const [w, h] = ASPECT_RATIO_MAP[aspectRatio] || [1, 1];
  const previewHeight = PREVIEW_WIDTH * (h / w);

  // Calculate scale factor between preview and actual image
  // Assuming actual image dimensions (you may need to adjust these based on your aspect ratios)
  const getActualImageDimensions = () => {
    const [w, h] = ASPECT_RATIO_MAP[aspectRatio] || [1, 1];
    // Assuming a base size of 1024px for the larger dimension
    const baseSize = 1024;
    if (w >= h) {
      return { width: baseSize, height: Math.round(baseSize * h / w) };
    } else {
      return { width: Math.round(baseSize * w / h), height: baseSize };
    }
  };

  const getScaleFactor = () => {
    const actual = getActualImageDimensions();
    return {
      x: actual.width / PREVIEW_WIDTH,
      y: actual.height / previewHeight
    };
  };

  // useEffect(() => {
  //   setOverlayId(uuidv4());
  // }, []);

  useEffect(() => {
    setImageLoadError(false);
  }, [generatedImageReadUrl]);

  useEffect(() => {
    let intervalId;

    const pollTaskStatus = async () => {
      if (!currentTaskId) return;

      try {
        const status = await api.getTaskStatus(currentTaskId);
        setTaskStatus(status.status);
        
        if (status.status === 'done') {
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
      pollTaskStatus();
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentTaskId, initialReadUrl]);

  useEffect(() => {
    setBackgroundLoadError(false);
    setReloadKey(0);
  }, [backgroundImageUrl]);

  useEffect(() => {
    let retryTimeout;
    if (backgroundLoadError && backgroundImageUrl) {
      retryTimeout = setTimeout(() => {
        setReloadKey(k => k + 1);
        setBackgroundLoadError(false);
      }, 2000); // 2 секунды между попытками
    }
    return () => clearTimeout(retryTimeout);
  }, [backgroundLoadError, backgroundImageUrl]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!personImageUrl || !backgroundImageUrl) {
      setError('Person and background images are required. Please complete previous steps first.');
      return;
    }

    setIsLoading(true);
    setError('');
    setErrorObject(null);
    setResponseBody(null);
    setImageLoadError(false);
    setTaskStatus(null);
    setInitialReadUrl(null);
    setGeneratedImageReadUrl('');

    try {
      const urls = await generateOverlayUrls();
      const payload = {
        prompt,
        aspect_ratio: aspectRatio,
        avatar_id: avatarId,
        writeUrl: urls.writeUrl,
        readUrl: urls.readUrl,
        params: {
          person: personImageUrl,
          background: backgroundImageUrl,
          position: {
            x: position.x,
            y: position.y,
            scale: position.scale
          }
        }
      };
      setRequestBody(payload);
      setInitialReadUrl(urls.readUrl);

      const response = await api.generateOverlay(avatarId, payload);
      setResponseBody({
        aige_task_id: response.aige_task_id,
        avatar_id: avatarId
      });

      const currentTaskID = response.aige_task_id || response.taskId || null;
      setCurrentTaskId(currentTaskID);
      
      if (onOverlaySuccess) {
        onOverlaySuccess({
          aigeTaskId: currentTaskID,
          readUrl: urls.readUrl
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
    if (field === 'x' || field === 'y') {
      // For absolute values, we don't need to clamp to 0-100
      // Just ensure they're reasonable numbers
      value = Math.max(-1000, Math.min(1000, value));
    }
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
      const xPx = e.clientX - rect.left;
      const yPx = e.clientY - rect.top;
      
      // Convert preview coordinates to absolute image coordinates
      const scaleFactor = getScaleFactor();
      const xAbsolute = Math.round((xPx - rect.width / 2) * scaleFactor.x);
      const yAbsolute = Math.round((yPx - rect.height / 2) * scaleFactor.y);
      
      setPosition(prev => ({
        ...prev,
        x: xAbsolute,
        y: yAbsolute
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
        <div style={{fontSize: '0.95em', color: '#1976d2', marginBottom: 8}}>
          {`PUT /api/v1/avatar/${avatarId}/overlay`}
        </div>
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
              {OVERLAY_USER_ASPECT_RATIOS.map(ar => (
                <option key={ar.value} value={ar.value}>{ar.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Position:</label>
            <div>
              <label htmlFor="position-x">X (px):</label>
              <input
                type="number"
                id="position-x"
                value={position.x}
                onChange={(e) => handlePositionChange('x', Number(e.target.value))}
                step={1}
              />
            </div>
            <div>
              <label htmlFor="position-y">Y (px):</label>
              <input
                type="number"
                id="position-y"
                value={position.y}
                onChange={(e) => handlePositionChange('y', Number(e.target.value))}
                step={1}
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
          <button type="submit" disabled={isLoading || !personImageUrl || !backgroundImageUrl}>
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
          style={{ position: 'relative', width: PREVIEW_WIDTH, height: previewHeight, border: '1px solid #ccc', margin: '0 auto', background: '#f5f5f5' }}
        >
          {/* Background image с повторной попыткой отображения при появлении URL */}
          {backgroundImageUrl && !backgroundLoadError && (
            <img
              key={backgroundImageUrl + reloadKey}
              src={backgroundImageUrl}
              alt="Background"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 1
              }}
              draggable={false}
              onError={() => setBackgroundLoadError(true)}
              onLoad={() => setBackgroundLoadError(false)}
            />
          )}
          {backgroundImageUrl && backgroundLoadError && (
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              background: '#fff',
              color: '#d32f2f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              fontSize: '1em',
              border: '1px dashed #d32f2f'
            }}>
              Не удалось загрузить фон
            </div>
          )}
          {/* Person image overlay */}
          {personImageUrl && (
            <img
              src={personImageUrl}
              alt="Person"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: `${position.scale * 100}%`,
                height: 'auto',
                zIndex: 2,
                cursor: 'move',
                pointerEvents: 'auto',
                maxWidth: 'none',
                maxHeight: 'none',
                transform: `translate(calc(-50% + ${position.x / getScaleFactor().x}px), calc(-50% + ${position.y / getScaleFactor().y}px))`,
              }}
              draggable
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          )}
        </div>

        <h3>Generated Overlay Preview</h3>
        {taskStatus === 'done' && generatedImageReadUrl ? (
          <img
            src={generatedImageReadUrl}
            alt="Generated Overlay"
            className="result-image"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        ) : (
          <div className="image-placeholder">
            {isLoading ? 'Generating overlay...' : 'Your generated overlay will appear here.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step3Overlay; 