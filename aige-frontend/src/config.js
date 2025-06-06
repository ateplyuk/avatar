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

// Default source images (usually empty as per user feedback, but required by API)
export const DEFAULT_SOURCE_IMAGES = [];

// Presigned URLs for Step 1 Avatar
export const AVATAR_URLS = {
  "key": "test-2025-06-06T06-50-06-798789Z-4f212c30-9960-42d6-88c4-02edcda83821",
  "writeUrl": "https://teplyuk-test.t3.storage.dev/test-2025-06-06T06-50-06-798789Z-4f212c30-9960-42d6-88c4-02edcda83821?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=tid_WrWfNMUMkkcLlXKaelojGZnOjXiUccpw_exgnyEBWvJzlGqfWF%2F20250606%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250606T065006Z&X-Amz-Expires=3600000&X-Amz-SignedHeaders=host&X-Amz-Signature=aa55010ec10eb1d0f2d061b888c210dd2b8a247b39968ade72fe0e752b96de35",
  "readUrl": "https://teplyuk-test.t3.storage.dev/test-2025-06-06T06-50-06-798789Z-4f212c30-9960-42d6-88c4-02edcda83821?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=tid_WrWfNMUMkkcLlXKaelojGZnOjXiUccpw_exgnyEBWvJzlGqfWF%2F20250606%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250606T065006Z&X-Amz-Expires=3600000&X-Amz-SignedHeaders=host&X-Amz-Signature=2e283be0de1aeb45b95b803214bc3fb4efa11f642f806a9e8c3db751e7f266d8"
};

// Presigned URLs for Step 2 Background
export const BACKGROUND_URLS = {
  "key": "test-2025-06-06T06-50-06-802526Z-dd7c97cb-92ee-4e3a-a27b-3a3807d0df97",
  "writeUrl": "https://teplyuk-test.t3.storage.dev/test-2025-06-06T06-50-06-802526Z-dd7c97cb-92ee-4e3a-a27b-3a3807d0df97?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=tid_WrWfNMUMkkcLlXKaelojGZnOjXiUccpw_exgnyEBWvJzlGqfWF%2F20250606%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250606T065006Z&X-Amz-Expires=3600000&X-Amz-SignedHeaders=host&X-Amz-Signature=ac472249bd39b8eba923c9b5fd250491b55f84f0eecff4a1faa11aa487f80e90",
  "readUrl": "https://teplyuk-test.t3.storage.dev/test-2025-06-06T06-50-06-802526Z-dd7c97cb-92ee-4e3a-a27b-3a3807d0df97?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=tid_WrWfNMUMkkcLlXKaelojGZnOjXiUccpw_exgnyEBWvJzlGqfWF%2F20250606%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250606T065006Z&X-Amz-Expires=3600000&X-Amz-SignedHeaders=host&X-Amz-Signature=ef4fc0874f15a256381ee672c70f6f9b419ca64c4ebe82453f152d76efdf10d6"
};
