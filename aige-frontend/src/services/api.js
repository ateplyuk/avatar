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

/**
 * Starts a finetune job by calling the backend API.
 * @param {object} finetuneData - The data for finetune.
 * @param {string} finetuneData.data_url - URL to the training data (S3 bucket with images).
 * @param {string} [finetuneData.finetune_comment] - Optional comment for the finetune job.
 * @param {string} [finetuneData.mode] - Finetune mode (default: 'character').
 * @param {string} [finetuneData.trigger_word] - Trigger word (default: 'TOM4S').
 * @param {number} [finetuneData.iterations] - Number of iterations (default: 300).
 * @param {string} [finetuneData.priority] - Priority (default: 'quality').
 * @param {boolean} [finetuneData.captioning] - Enable captioning (default: true).
 * @param {number} [finetuneData.lora_rank] - LoRA rank (default: 32).
 * @param {string} [finetuneData.finetune_type] - Finetune type (default: 'full').
 * @returns {Promise<object>} The response from the API (finetune_id).
 */
export const startFinetune = async (finetuneData) => {
  try {
    const response = await apiClient.post('/finetune', finetuneData);
    return response.data;
  } catch (error) {
    console.error('Error starting finetune:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server issue while starting finetune');
  }
};

/**
 * Получить результат fine-tune по request_id.
 * @param {string} requestId - Идентификатор запроса (request_id).
 * @returns {Promise<object>} Результат fine-tune (например, {finetune_id: ...})
 */
export const getFinetuneResult = async (requestId) => {
  try {
    const response = await apiClient.get(`/finetune/result/${requestId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching finetune result:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server issue while fetching finetune result');
  }
};

/**
 * Генерация изображения через FLUX Ultra (fal-ai/flux-pro/v1.1-ultra-finetuned).
 * @param {object} data - Данные для генерации.
 * @param {string} data.prompt - Промпт для генерации.
 * @param {string} data.finetune_id - ID fine-tuned модели.
 * @param {string} [data.aspect_ratio] - Соотношение сторон.
 * @param {string} [data.output_format] - Формат вывода.
 * @param {number} [data.num_images] - Количество изображений.
 * @param {string} [data.safety_tolerance] - Уровень толерантности.
 * @param {number} [data.seed] - Seed.
 * @param {number} [data.finetune_strength] - Сила fine-tune (0.0-1.0).
 * @returns {Promise<object>} task_id
 */
export const generateFluxUltra = async (data) => {
  try {
    const response = await apiClient.post('/flux-ultra', data);
    return response.data;
  } catch (error) {
    console.error('Error generating FLUX Ultra image:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server issue while generating FLUX Ultra image');
  }
};

/**
 * Получить результат FLUX Ultra по request_id.
 * @param {string} requestId - Идентификатор запроса (request_id).
 * @returns {Promise<object>} Результат генерации (например, {images: [...]})
 */
export const getFluxUltraResult = async (requestId) => {
  try {
    const response = await apiClient.get(`/flux-ultra/result/${requestId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching FLUX Ultra result:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server issue while fetching FLUX Ultra result');
  }
};

/**
 * Upscales an image for a given avatar by calling the backend API.
 * @param {string} avatarIdFromPath - The ID of the avatar (used in URL path).
 * @param {object} upscaleData - The data for upscaling.
 * @param {string} upscaleData.image_url - The image URL to upscale.
 * @param {number} upscaleData.scale - The scale factor.
 * @param {string} upscaleData.model - The model to use.
 * @param {string} upscaleData.output_format - Output format ('png' or 'jpeg').
 * @param {string} upscaleData.avatar_id - The avatar_id (repeated in body for backend validation).
 * @param {string} upscaleData.writeUrl - The pre-signed URL to write the result.
 * @param {string} upscaleData.readUrl - The URL to read the result from.
 * @returns {Promise<object>} The response from the API.
 */
export const upscaleAvatar = async (avatarIdFromPath, upscaleData) => {
  const { image_url, scale, model, output_format, avatar_id, writeUrl, readUrl } = upscaleData;
  const payload = { image_url, scale, model, output_format, avatar_id, writeUrl, readUrl };
  try {
    const response = await apiClient.put(`/avatar/${avatarIdFromPath}/upscaled`, payload);
    return response.data;
  } catch (error) {
    console.error('Error upscaling image:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server issue while upscaling image');
  }
};

/**
 * Generates a video for a given avatar by calling the backend API.
 * @param {string} avatarIdFromPath - The ID of the avatar (used in URL path).
 * @param {object} videoData - The data for video generation.
 * @param {string} videoData.prompt - The text prompt for video generation.
 * @param {string} videoData.input_img - The input image URL.
 * @param {string} videoData.duration - Duration in seconds ("5" or "10").
 * @param {string} videoData.negative_prompt - Negative prompt.
 * @param {number} videoData.cfg_scale - CFG scale.
 * @param {string} videoData.avatar_id - The avatar_id (repeated in body for backend validation).
 * @param {string} videoData.writeUrl - The pre-signed URL to write the result.
 * @param {string} videoData.readUrl - The URL to read the result from.
 * @returns {Promise<object>} The response from the API.
 */
export const generateVideo = async (avatarIdFromPath, videoData) => {
  const { prompt, input_img, duration, negative_prompt, cfg_scale, avatar_id, writeUrl, readUrl } = videoData;
  const payload = { prompt, input_img, duration, negative_prompt, cfg_scale, avatar_id, writeUrl, readUrl };
  try {
    const response = await apiClient.put(`/avatar/${avatarIdFromPath}/video`, payload);
    return response.data;
  } catch (error) {
    console.error('Error generating video:', error.response ? error.response.data : error.message);
    throw error.response ? error.response.data : new Error('Network error or server issue while generating video');
  }
};
