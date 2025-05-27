import axios from 'axios';

// TODO: This should be in a configuration file (e.g., src/config.js or environment variables)
const API_BASE_URL = 'http://176.99.135.55:8000/api/v1';

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
 * @param {string} avatarData.resolution - The desired resolution (e.g., "256", "1024").
 * @param {string} avatarData.avatar_id - The client-generated avatar ID.
 * @param {string} avatarData.writeUrl - The pre-signed URL to write the result.
 * @param {string} avatarData.readUrl - The URL to read the result from.
 * @param {string[]} avatarData.source_images - Array of source image URLs (currently unused by backend).
 * @returns {Promise<object>} The response from the API.
 */
export const generateAvatar = async (avatarData) => {
  try {
    const response = await apiClient.post('/avatar', avatarData);
    return response.data;
  } catch (error) {
    console.error('Error generating avatar:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server issue');
  }
};

/**
 * Generates a background for a given avatar by calling the backend API.
 * @param {string} avatarId - The ID of the avatar for which to generate the background.
 * @param {object} backgroundData - The data for background generation.
 * @param {string} backgroundData.prompt - The text prompt.
 * @param {string} backgroundData.resolution - The desired resolution.
 * @param {string} backgroundData.writeUrl - The pre-signed URL to write the result.
 * @param {string} backgroundData.readUrl - The URL to read the result from.
 * @param {string} backgroundData.avatar_id - The avatar_id (repeated in body for backend validation).
 * @returns {Promise<object>} The response from the API.
 */
export const generateBackground = async (avatarId, backgroundData) => {
  try {
    const response = await apiClient.put(`/avatar/${avatarId}/background`, backgroundData);
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
    // Do not throw for polling, allow component to handle not found or error statuses
    // If status is 404, it means task_id might not be in DB yet, or an error.
    if (error.response && error.response.status === 404) {
        return { aige_task_id: aigeTaskId, status: 'not_found' };
    }
    // For other errors, let's return a generic error status
    return { aige_task_id: aigeTaskId, status: 'error_fetching_status' };
  }
};
