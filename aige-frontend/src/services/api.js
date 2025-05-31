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
 * @returns {Promise<object>} The response from the API, expecting fields like readUrl, writeUrl, aige_task_id.
 */
export const generateAvatar = async (avatarData) => {
  // Destructure to ensure only expected fields are sent
  const { prompt, aspect_ratio, avatar_id } = avatarData;
  const payload = { prompt, aspect_ratio, avatar_id };
  try {
    const response = await apiClient.post('/avatar', payload);
    return response.data;
  } catch (error) {
    console.error('Error generating avatar:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server issue');
  }
};

/**
 * Generates a background for a given avatar by calling the backend API.
 * @param {string} avatarIdFromPath - The ID of the avatar for which to generate the background (used in URL path).
 * @param {object} backgroundData - The data for background generation.
 * @param {string} backgroundData.prompt - The text prompt.
 * @param {string} backgroundData.aspect_ratio - The desired aspect ratio.
 * @param {string} backgroundData.avatar_id - The avatar_id (repeated in body for backend validation).
 * @returns {Promise<object>} The response from the API, expecting fields like readUrl, writeUrl, aige_task_id.
 */
export const generateBackground = async (avatarIdFromPath, backgroundData) => {
  // Destructure to ensure only expected fields are sent
  const { prompt, aspect_ratio, avatar_id } = backgroundData;
  const payload = { prompt, aspect_ratio, avatar_id };
  try {
    // Note: avatarIdFromPath is used in the URL, backgroundData.avatar_id is in the body.
    const response = await apiClient.put(`/avatar/${avatarIdFromPath}/background`, payload);
    return response.data;
  } catch (error) {
    console.error('Error generating background:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server issue');
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
    console.error('Error fetching task status:', error.response ? error.response.data : error.message);
    if (error.response && error.response.status === 404) {
        return { aige_task_id: aigeTaskId, status: 'not_found', error: 'Task ID not found or processing not initiated.' };
    }
    // For other errors, let's return a generic error status with the message
    return { aige_task_id: aigeTaskId, status: 'error_fetching_status', error: error.message };
  }
};
