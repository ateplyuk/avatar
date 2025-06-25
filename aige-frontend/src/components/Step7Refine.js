import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { REFINEMENT_ASPECT_RATIOS, DEFAULT_REFINEMENT_ASPECT_RATIO, generateRefineUrls, TASK_STATUS_POLL_INTERVAL } from '../config';

const Step7Refine = ({ onRefineSuccess, avatarId, inputImageUrl }) => {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState(inputImageUrl || '');
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_REFINEMENT_ASPECT_RATIO);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [numImages, setNumImages] = useState(1);
  const [safetyTolerance, setSafetyTolerance] = useState('2');
  const [outputFormat, setOutputFormat] = useState('jpeg');
  const [seed, setSeed] = useState('');
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
      const urls = await generateRefineUrls();
      const payload = {
        prompt,
        image_url: imageUrl,
        aspect_ratio: aspectRatio,
        guidance_scale: Number(guidanceScale),
        num_images: Number(numImages),
        safety_tolerance: safetyTolerance,
        output_format: outputFormat,
        avatar_id: avatarId,
        writeUrl: urls.writeUrl,
        readUrl: urls.readUrl,
      };
      if (seed !== '') payload.seed = Number(seed);
      setRequestBody(payload);
      setInitialReadUrl(urls.readUrl);
      const response = await api.generateRefine(avatarId, payload);
      setResponseBody({
        aige_task_id: response.aige_task_id,
        avatar_id: avatarId
      });
      const currentTaskID = response.aige_task_id;
      setCurrentTaskId(currentTaskID);
      if (onRefineSuccess) {
        onRefineSuccess({
          aigeTaskId: currentTaskID,
          readUrl: urls.readUrl
        });
      }
    } catch (err) {
      console.error('Error in Step7Refine handleSubmit:', err);
      const errorMessage = err.message || (typeof err === 'string' ? err : 'Failed to refine image. Check console/API error details.');
      setError(errorMessage);
      setErrorObject(err);
      setResponseBody(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageError = () => {
    setImageLoadError(true);
  };
  const handleImageLoad = () => {
    setImageLoadError(false);
  };

  return (
    <div className="step-container step-layout-container">
      <div className="form-and-debug-column">
        <h2>Step 7: Refine Image (Kontext Max)</h2>
        <div style={{fontSize: '0.95em', color: '#1976d2', marginBottom: 8}}>
          {`PUT /api/v1/avatar/${avatarId}/refine`}
        </div>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="refine-prompt">Prompt:</label>
            <input
              type="text"
              id="refine-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="refine-image-url">Image URL:</label>
            <input
              type="url"
              id="refine-image-url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              required
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <div>
            <label htmlFor="refine-aspect-ratio">Aspect Ratio:</label>
            <select
              id="refine-aspect-ratio"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
            >
              {REFINEMENT_ASPECT_RATIOS.map(ar => (
                <option key={ar.value} value={ar.value}>{ar.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="refine-guidance-scale">Guidance Scale:</label>
            <input
              type="number"
              id="refine-guidance-scale"
              value={guidanceScale}
              onChange={(e) => setGuidanceScale(e.target.value)}
              step="0.1"
              min="1"
              max="20"
            />
          </div>
          <div>
            <label htmlFor="refine-num-images">Num Images:</label>
            <input
              type="number"
              id="refine-num-images"
              value={numImages}
              onChange={(e) => setNumImages(e.target.value)}
              min="1"
              max="4"
            />
          </div>
          <div>
            <label htmlFor="refine-safety-tolerance">Safety Tolerance:</label>
            <select
              id="refine-safety-tolerance"
              value={safetyTolerance}
              onChange={(e) => setSafetyTolerance(e.target.value)}
            >
              {["1","2","3","4","5","6"].map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="refine-output-format">Output Format:</label>
            <select
              id="refine-output-format"
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
            >
              <option value="jpeg">jpeg</option>
              <option value="png">png</option>
            </select>
          </div>
          <div>
            <label htmlFor="refine-seed">Seed (optional):</label>
            <input
              type="number"
              id="refine-seed"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              min="0"
              step="1"
              placeholder="Random if empty"
            />
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Refining...' : 'Refine Image'}
          </button>
        </form>
        {isLoading && <p>Refining image...</p>}
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
        <h3>Refined Image Preview</h3>
        {taskStatus === 'done' && generatedImageReadUrl ? (
          <img
            src={generatedImageReadUrl}
            alt="Refined"
            className="result-image"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        ) : (
          <div className="image-placeholder">
            {isLoading ? 'Refining image...' : 'Your refined image will appear here.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step7Refine; 