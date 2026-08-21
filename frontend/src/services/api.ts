export class ApiError extends Error {
  code: string;
  status: number;
  details?: any[];

  constructor(message: string, status: number, code: string = 'API_ERROR', details?: any[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api/v1';

interface RequestOptions extends RequestInit {
  timeout?: number;
}

export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeout = 30000, headers = {}, ...customConfig } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const token = localStorage.getItem('zentronyx_token');

  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (!(customConfig.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method: 'GET',
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    signal: controller.signal,
  };


  try {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const response = await fetch(url, config);
    clearTimeout(id);

    if (response.status === 401) {
      // Clear token and trigger auth logout event if unauthorized
      localStorage.removeItem('zentronyx_token');
      window.dispatchEvent(new Event('zentronyx_unauthorized'));
    }

    let data: any = {};
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }

    if (!response.ok) {
      const errorMessage = data?.error?.message || data?.detail || `HTTP Error ${response.status}: ${response.statusText}`;
      const errorCode = data?.error?.code || `HTTP_${response.status}`;
      const errorDetails = data?.error?.details || null;
      throw new ApiError(errorMessage, response.status, errorCode, errorDetails);
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(id);
    if (error instanceof ApiError) {
      throw error;
    }
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out. Please verify server connectivity.', 408, 'REQUEST_TIMEOUT');
    }
    throw new ApiError(error.message || 'Failed to connect to backend service', 500, 'NETWORK_ERROR');
  }
}
