// aige-frontend/src/config.js
export const API_BASE_URL = 'http://176.99.135.55:8000/api/v1'; // As per api.js

export const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '3:4', value: '3:4' },
  { label: '4:3', value: '4:3' },
];

export const DEFAULT_ASPECT_RATIO = ASPECT_RATIOS[0].value;

// Interval in milliseconds for polling task status
export const TASK_STATUS_POLL_INTERVAL = 5000;
