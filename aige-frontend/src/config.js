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
  key: "test-2025-05-29T11-18-22-774012Z-05d6ff61-91ea-4701-9ab0-493d7209c9f6",
  writeUrl: "https://teplyuk-test.t3.storage.dev/test-2025-05-29T11-18-22-774012Z-05d6ff61-91ea-4701-9ab0-493d7209c9f6?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=tid_WrWfNMUMkkcLlXKaelojGZnOjXiUccpw_exgnyEBWvJzlGqfWF%2F20250529%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250529T111822Z&X-Amz-Expires=3600000&X-Amz-SignedHeaders=host&X-Amz-Signature=58ce3206da951d016ef9527dc9429544ca215e84651649cceab5e48072ebfade",
  readUrl: "https://teplyuk-test.t3.storage.dev/test-2025-05-29T11-18-22-774012Z-05d6ff61-91ea-4701-9ab0-493d7209c9f6?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=tid_WrWfNMUMkkcLlXKaelojGZnOjXiUccpw_exgnyEBWvJzlGqfWF%2F20250529%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250529T111822Z&X-Amz-Expires=3600000&X-Amz-SignedHeaders=host&X-Amz-Signature=25685d60717b227f90fb49e4f1f72a96553c457dd36de69e89d15d2eef5d416e"
};

// Presigned URLs for Step 2 Background
export const BACKGROUND_URLS = {
  key: "test-2025-05-29T11-18-22-781076Z-c2aecdb1-2a48-4730-8907-7cd93f37fef7",
  writeUrl: "https://teplyuk-test.t3.storage.dev/test-2025-05-29T11-18-22-781076Z-c2aecdb1-2a48-4730-8907-7cd93f37fef7?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=tid_WrWfNMUMkkcLlXKaelojGZnOjXiUccpw_exgnyEBWvJzlGqfWF%2F20250529%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250529T111822Z&X-Amz-Expires=3600000&X-Amz-SignedHeaders=host&X-Amz-Signature=f483cd2f6e8916bd108d785a84b97effda86e196cb1c2875f85f1f5920b11c8b",
  readUrl: "https://teplyuk-test.t3.storage.dev/test-2025-05-29T11-18-22-781076Z-c2aecdb1-2a48-4730-8907-7cd93f37fef7?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=tid_WrWfNMUMkkcLlXKaelojGZnOjXiUccpw_exgnyEBWvJzlGqfWF%2F20250529%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250529T111822Z&X-Amz-Expires=3600000&X-Amz-SignedHeaders=host&X-Amz-Signature=71530e3af699a00300b05e1c6d9fa57d8ece1243b3fe56211b67fa68d2fe972b"
};
