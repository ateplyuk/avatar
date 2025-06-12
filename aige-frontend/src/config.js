export const API_BASE_URL = 'http://176.99.135.55:8000/api/v1';

export const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '3:4', value: '3:4' },
  { label: '4:3', value: '4:3' }
];

export const OVERLAY_ASPECT_RATIOS = [
  { label: 'Square HD', value: 'square_hd' },
  { label: 'Square', value: 'square' },
  { label: 'Portrait 4:3', value: 'portrait_4_3' },
  { label: 'Portrait 16:9', value: 'portrait_16_9' },
  { label: 'Landscape 4:3', value: 'landscape_4_3' },
  { label: 'Landscape 16:9', value: 'landscape_16_9' }
];

export const DEFAULT_ASPECT_RATIO = ASPECT_RATIOS[0].value;
export const DEFAULT_OVERLAY_ASPECT_RATIO = OVERLAY_ASPECT_RATIOS[0].value;

// Interval in milliseconds for polling task status
export const TASK_STATUS_POLL_INTERVAL = 5000;

// Default source images (usually empty as per user feedback, but required by API)
export const DEFAULT_SOURCE_IMAGES = [];

export const DEFAULT_FINETUNE_IMAGE_URL = 'https://teplyuk-test.t3.storage.dev/test-2025-06-12T07-37-22-382901Z-d78c9c9d-a004-4511-b759-c9081d7b3e3a?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=tid_WrWfNMUMkkcLlXKaelojGZnOjXiUccpw_exgnyEBWvJzlGqfWF%2F20250612%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250612T073722Z&X-Amz-Expires=3600000&X-Amz-SignedHeaders=host&X-Amz-Signature=202d11ef23bab06733c97673e7b2292fa900b21336c04ce76546553a5fd30a47';
export const DEFAULT_FINETUNE_IMAGE_URLS = [
  DEFAULT_FINETUNE_IMAGE_URL,
  DEFAULT_FINETUNE_IMAGE_URL,
  DEFAULT_FINETUNE_IMAGE_URL,
  DEFAULT_FINETUNE_IMAGE_URL
];

const generateS3Urls = async () => {
  try {
    console.log('Attempting to fetch URLs from:', `${API_BASE_URL}/generate-urls`);
    const response = await fetch(`${API_BASE_URL}/generate-urls`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to generate URLs: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Received URLs:', data);
    return data;
  } catch (error) {
    console.error('Error generating URLs:', error);
    throw error;
  }
};

export const generateAvatarUrls = () => generateS3Urls();
export const generateBackgroundUrls = () => generateS3Urls();
export const generateOverlayUrls = () => generateS3Urls();

