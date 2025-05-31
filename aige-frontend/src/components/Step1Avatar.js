// aige-frontend/src/components/Step1Avatar.js
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as api from '../services/api';
import { ASPECT_RATIOS, DEFAULT_ASPECT_RATIO, AVATAR_URLS, DEFAULT_SOURCE_IMAGES } from '../config'; // Added AVATAR_URLS, DEFAULT_SOURCE_IMAGES

const Step1Avatar = ({ onAvatarSuccess }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO);
  const [avatarId, setAvatarId] = useState('');
  const [requestBody, setRequestBody] = useState(null);
  const [responseBody, setResponseBody] = useState(null);
  const [error, setError] = useState(''); // For general errors or string messages
  const [errorObject, setErrorObject] = useState(null); // For detailed error object from API
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImageReadUrl, setGeneratedImageReadUrl] = useState('');

  useEffect(() => {
    setAvatarId(uuidv4());
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setErrorObject(null); // Clear previous detailed error
    setResponseBody(null);
    setGeneratedImageReadUrl('');

    const payload = {
      prompt,
      aspect_ratio: aspectRatio,
      avatar_id: avatarId,
      writeUrl: AVATAR_URLS.writeUrl, // Use from config
      readUrl: AVATAR_URLS.readUrl,   // Use from config
      source_images: DEFAULT_SOURCE_IMAGES, // Use from config
    };
    setRequestBody(payload);

    try {
      const response = await api.generateAvatar(payload);
      setResponseBody(response);
      // The backend response itself contains the actual readUrl for the *generated* image
      // The readUrl in AVATAR_URLS.readUrl is for the *upload location*, not the final image.
      // So, we should use response.readUrl for displaying the image.
      if (response && response.readUrl) {
        setGeneratedImageReadUrl(response.readUrl);
      }

      const currentTaskID = response.aige_task_id || response.taskId || null;

      if (onAvatarSuccess) {
        onAvatarSuccess({
          avatarId: avatarId,
          aigeTaskId: currentTaskID,
          // Pass the actual readUrl of the generated image from the response
          readUrl: response.readUrl
        });
      }

    } catch (err) {
      // err should now be the detailed error object from the backend (thanks to api.js update)
      console.error("Error in Step1Avatar handleSubmit:", err);
      // err might be an object (from backend) or an Error instance (network issue)
      const errorMessage = err.message || (typeof err === 'string' ? err : 'Failed to generate avatar. Check console/API error details.');
      setError(errorMessage);
      setErrorObject(err);
      setResponseBody(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="step-container">
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
          <h3>Generated Avatar:</h3>
          <img src={generatedImageReadUrl} alt="Generated Avatar" style={{ maxWidth: '100%', height: 'auto' }} />
        </div>
      )}
    </div>
  );
};

export default Step1Avatar;
