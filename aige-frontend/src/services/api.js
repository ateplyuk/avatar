// aige-frontend/src/services/api.js
import axios from 'axios';
import { API_BASE_URL } from '../config'; // Import from config

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Generates an avatar by calling the backend API.
 * @param {object} avatarData - The data for avatar generation.
 * @param {string} avatarData.prompt - The text prompt.
 * @param {string} avatarData.aspect_ratio - The desired aspect ratio (e.g., "1:1", "16:9").
 * @param {string} avatarData.avatar_id - The client-generated avatar ID.
 * @param {string} avatarData.writeUrl - The pre-signed URL to write the result.
 * @param {string} avatarData.readUrl - The URL to read the result from.
 * @param {string[]} avatarData.source_images - Array of source image URLs.
 * @returns {Promise<object>} The response from the API.
 */
export const generateAvatar = async (avatarData) => {
  // Destructure to ensure only expected fields are sent, and all required ones are present
  const { prompt, aspect_ratio, avatar_id, writeUrl, readUrl, source_images } = avatarData;
  const payload = { prompt, aspect_ratio, avatar_id, writeUrl, readUrl, source_images };
  try {
    const response = await apiClient.post('/avatar', payload);
    return response.data;
  } catch (error) {
    console.error('Error generating avatar:', error.response ? error.response.data : error.message);
    // Propagate the error object for detailed feedback in the component
    throw error.response ? error.response.data : new Error('Network error or server issue while generating avatar');
  }
};

/**
 * Generates a background for a given avatar by calling the backend API.
 * @param {string} avatarIdFromPath - The ID of the avatar for which to generate the background (used in URL path).
 * @param {object} backgroundData - The data for background generation.
 * @param {string} backgroundData.prompt - The text prompt.
 * @param {string} backgroundData.aspect_ratio - The desired aspect ratio.
 * @param {string} backgroundData.avatar_id - The avatar_id (repeated in body for backend validation).
 * @param {string} backgroundData.writeUrl - The pre-signed URL to write the result.
 * @param {string} backgroundData.readUrl - The URL to read the result from.
 * @returns {Promise<object>} The response from the API.
 */
export const generateBackground = async (avatarIdFromPath, backgroundData) => {
  const { prompt, aspect_ratio, avatar_id, writeUrl, readUrl, source_images } = backgroundData;
  const payload = { prompt, aspect_ratio, avatar_id, writeUrl, readUrl };
  try {
    const response = await apiClient.put(`/avatar/${avatarIdFromPath}/background`, payload);
    return response.data;
  } catch (error) {
    console.error('Error generating background:', error.response ? error.response.data : error.message);
    // Propagate the error object
    throw error.response ? error.response.data : new Error('Network error or server issue while generating background');
  }
};

/**
 * Generates an overlay for a given avatar by calling the backend API.
 * @param {string} avatarIdFromPath - The ID of the avatar for which to generate the overlay (used in URL path).
 * @param {object} overlayData - The data for overlay generation.
 * @param {string} overlayData.prompt - The text prompt.
 * @param {string} overlayData.aspect_ratio - The desired aspect ratio.
 * @param {object} overlayData.params - The overlay parameters.
 * @param {string} overlayData.params.person - URL of the person image.
 * @param {string} overlayData.params.background - URL of the background image.
 * @param {object} overlayData.params.position - Position parameters for the person image.
 * @param {number} overlayData.params.position.x - X coordinate.
 * @param {number} overlayData.params.position.y - Y coordinate.
 * @param {number} overlayData.params.position.scale - Scale factor.
 * @param {string} overlayData.avatar_id - The avatar_id (repeated in body for backend validation).
 * @param {string} overlayData.writeUrl - The pre-signed URL to write the result.
 * @param {string} overlayData.readUrl - The URL to read the result from.
 * @returns {Promise<object>} The response from the API.
 */
export const generateOverlay = async (avatarIdFromPath, overlayData) => {
  // Destructure for clarity and to ensure all required fields are present
  const { prompt, aspect_ratio, params, avatar_id, writeUrl, readUrl } = overlayData;
  const payload = { prompt, aspect_ratio, params, avatar_id, writeUrl, readUrl };
  try {
    const response = await apiClient.put(`/avatar/${avatarIdFromPath}/overlay`, payload);
    return response.data;
  } catch (error) {
    console.error('Error generating overlay:', error.response ? error.response.data : error.message);
    // Propagate the error object
    throw error.response ? error.response.data : new Error('Network error or server issue while generating overlay');
  }
};

/**
 * Fetches the status of a task from the backend API.
 * @param {string} aigeTaskId - The AIGE task ID.
 * @returns {Promise<object>} The task status response from the API.
 */
export const getTaskStatus = async (aigeTaskId) => {
  try {
    const response = await apiClient.get(`/task/${aigeTaskId}/status`);
    return response.data;
  } catch (error) {
    console.error('Error fetching task status for ID', aigeTaskId, ':', error.response ? error.response.data : error.message);
    if (error.response && error.response.status === 404) {
        // Using 'error_message' key as per provided code for consistency in this function's error objects
        return { aige_task_id: aigeTaskId, status: 'not_found', error_message: 'Task ID not found or processing not initiated.', details: error.response.data };
    }
    // For other errors, let's return a generic error status with more details
    return { aige_task_id: aigeTaskId, status: 'error_fetching_status', error_message: error.message, details: error.response ? error.response.data : null };
  }
};
