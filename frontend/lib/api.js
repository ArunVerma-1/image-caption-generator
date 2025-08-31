const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 60000,
  maxFileSize: 10 * 1024 * 1024,
  maxBatchSize: 3
};

class APIError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

export async function makeRequest(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
  
  try {
    const response = await fetch(`${API_CONFIG.baseURL}${url}`, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.detail || `HTTP ${response.status}`,
        response.status
      );
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new APIError('Request timeout', 408);
    }
    throw error;
  }
}

export function validateFile(file) {
  const errors = [];
  
  if (file.size > API_CONFIG.maxFileSize) {
    errors.push(`File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max: 10MB`);
  }
  
  if (!file.type.startsWith('image/')) {
    errors.push('File must be an image');
  }
  
  return errors;
}

export async function generateCaption(file, options = {}) {
  const validationErrors = validateFile(file);
  if (validationErrors.length > 0) {
    throw new APIError(validationErrors.join(', '), 400);
  }
  
  const formData = new FormData();
  formData.append('file', file);
  
  if (options.method) formData.append('method', options.method);
  if (options.beamWidth) formData.append('beam_width', options.beamWidth.toString());
  
  return makeRequest('/generate-caption', {
    method: 'POST',
    body: formData,
  });
}

export async function batchGenerateCaptions(files) {
  if (files.length > API_CONFIG.maxBatchSize) {
    throw new APIError(`Max ${API_CONFIG.maxBatchSize} files allowed`, 400);
  }
  
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  
  return makeRequest('/batch-generate', {
    method: 'POST',
    body: formData,
  });
}

export async function checkHealth() {
  return makeRequest('/health');
}