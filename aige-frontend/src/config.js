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

