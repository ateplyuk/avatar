import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { generateAvatarUrls, TASK_STATUS_POLL_INTERVAL } from '../config';

const UPSCALE_MODELS = [
  { label: 'RealESRGAN_x4plus', value: 'RealESRGAN_x4plus' },
  { label: 'RealESRGAN_x2plus', value: 'RealESRGAN_x2plus' },
  { label: 'RealESRGAN_x4plus_anime_6B', value: 'RealESRGAN_x4plus_anime_6B' },
  { label: 'RealESRGAN_x4_v3', value: 'RealESRGAN_x4_v3' },
  { label: 'RealESRGAN_x4_wdn_v3', value: 'RealESRGAN_x4_wdn_v3' },
  { label: 'RealESRGAN_x4_anime_v3', value: 'RealESRGAN_x4_anime_v3' },
];
const OUTPUT_FORMATS = [
  { label: 'PNG', value: 'png' },
  { label: 'JPEG', value: 'jpeg' },
];

const Step4Upscale = ({ avatarId, onUpscaleSuccess }) => {
  const [form, setForm] = useState({
    image_url: '',
    scale: 2,
    model: 'RealESRGAN_x4plus',
    output_format: 'png',
  });
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

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

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
        ...form,
        avatar_id: avatarId,
        writeUrl: urls.writeUrl,
        readUrl: urls.readUrl,
      };
      setRequestBody(payload);
      setInitialReadUrl(urls.readUrl);
      const response = await api.upscaleAvatar(avatarId, payload);
      setResponseBody({
        aige_task_id: response.aige_task_id,
        avatar_id: avatarId,
      });
      const currentTaskID = response.aige_task_id;
      setCurrentTaskId(currentTaskID);
      if (onUpscaleSuccess) {
        onUpscaleSuccess({
          aigeTaskId: currentTaskID,
          readUrl: urls.readUrl,
        });
      }
    } catch (err) {
      console.error('Error in Step4Upscale handleSubmit:', err);
      const errorMessage = err.message || (typeof err === 'string' ? err : 'Failed to upscale. Check console/API error details.');
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
        <h2>Step 4: Upscale</h2>
        <p>Please complete previous steps first. Avatar ID is required.</p>
      </div>
    );
  }

  return (
    <div className="step-container step-layout-container">
      <div className="form-and-debug-column">
        <h2>Step 4: Upscale (for Avatar ID: {avatarId})</h2>
        <div style={{fontSize: '0.95em', color: '#1976d2', marginBottom: 8}}>
          {`PUT /api/v1/avatar/${avatarId}/upscaled`}
        </div>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="upscale-image-url">Image URL:</label>
            <input
              type="text"
              id="upscale-image-url"
              name="image_url"
              value={form.image_url}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="upscale-scale">Scale:</label>
            <input
              type="number"
              id="upscale-scale"
              name="scale"
              value={form.scale}
              onChange={handleChange}
              min={1}
              max={4}
              step={0.1}
              required
            />
          </div>
          <div>
            <label htmlFor="upscale-model">Model:</label>
            <select
              id="upscale-model"
              name="model"
              value={form.model}
              onChange={handleChange}
            >
              {UPSCALE_MODELS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="upscale-output-format">Output Format:</label>
            <select
              id="upscale-output-format"
              name="output_format"
              value={form.output_format}
              onChange={handleChange}
            >
              {OUTPUT_FORMATS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Upscaling...' : 'Upscale'}
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
        <h3>Upscaled Image Preview</h3>
        {taskStatus === 'done' && generatedImageReadUrl ? (
          <img
            src={generatedImageReadUrl}
            alt="Upscaled"
            className="result-image"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        ) : (
          <div className="image-placeholder">
            {isLoading ? 'Upscaling...' : 'Your upscaled image will appear here.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step4Upscale; 