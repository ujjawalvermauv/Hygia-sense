// API Configuration
const rawApiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const resolveApiBaseUrl = (value: string) => {
  if (!value) return 'http://localhost:5000/api';

  if (value.startsWith('/')) {
    return `http://localhost:5000${value.startsWith('/api') ? value : `/api${value}`}`.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && value.includes(window.location.host) && window.location.port === '8080') {
    return value.replace(window.location.origin, 'http://localhost:5000');
  }

  return value.replace(/\/$/, '');
};

const API_BASE_URL = resolveApiBaseUrl(rawApiBaseUrl);

console.log('API Base URL:', API_BASE_URL);
console.log('Environment Variables:', import.meta.env);

export const API_ENDPOINTS = {
  // Sensors
  SENSORS: {
    GET_ALL: `${API_BASE_URL}/sensor`,
    GET_BY_TOILET: (toiletId: string) => `${API_BASE_URL}/sensor/${toiletId}/latest`,
    GET_HISTORY: (toiletId: string) => `${API_BASE_URL}/sensor/${toiletId}/history`,
  },
  
  // Tasks
  TASKS: {
    GET_ALL: `${API_BASE_URL}/admin-tasks`,
    GET_PENDING: `${API_BASE_URL}/admin-tasks/pending-approval`,
    GET_BY_ID: (taskId: string) => `${API_BASE_URL}/admin-tasks/${taskId}`,
    ASSIGN: `${API_BASE_URL}/admin-tasks/assign`,
    UPLOAD_PHOTOS: (taskId: string) => `${API_BASE_URL}/admin-tasks/${taskId}/photos`,
    APPROVE: (taskId: string) => `${API_BASE_URL}/admin-tasks/${taskId}/approve`,
    REJECT: (taskId: string) => `${API_BASE_URL}/admin-tasks/${taskId}/reject`,
    DELETE_PHOTO: (taskId: string, photoId: string) => `${API_BASE_URL}/admin-tasks/${taskId}/photos/${photoId}`,
    START: (taskId: string) => `${API_BASE_URL}/tasks/${taskId}/start`,
    COMPLETE: (taskId: string) => `${API_BASE_URL}/tasks/${taskId}/complete`,
    REPORT_ISSUE: (taskId: string) => `${API_BASE_URL}/tasks/${taskId}/issue`,
  },
  
  // Toilets
  TOILETS: {
    GET_ALL: `${API_BASE_URL}/toilets`,
  },
  
  // Cleaners
  CLEANERS: {
    GET_ALL: `${API_BASE_URL}/cleaners`,
    SIGNUP_REQUEST: `${API_BASE_URL}/cleaners/signup-request`,
    LOGIN: `${API_BASE_URL}/cleaners/login`,
    GET_PENDING: `${API_BASE_URL}/cleaners/pending`,
    APPROVE: (cleanerId: string) => `${API_BASE_URL}/cleaners/${cleanerId}/approve`,
    REJECT: (cleanerId: string) => `${API_BASE_URL}/cleaners/${cleanerId}/reject`,
    ROSTER_UPDATE: (cleanerId: string) => `${API_BASE_URL}/cleaners/${cleanerId}/roster`,
    SELF_SHIFT: (cleanerId: string) => `${API_BASE_URL}/cleaners/${cleanerId}/self-shift`,
  },

  // AI
  AI: {
    OVERVIEW: `${API_BASE_URL}/ai/overview`,
    AUTO_ASSIGN: `${API_BASE_URL}/ai/auto-assign`,
  },

  // Admin
  ADMIN: {
    ALERTS: `${API_BASE_URL}/admin/alerts`,
    ALERT_SETTINGS: `${API_BASE_URL}/admin/alert-settings`,
  },
};

// Helper function for API calls
export const apiCall = async (
  url: string,
  options?: RequestInit
): Promise<any> => {
  try {
    console.log(`API Call: ${options?.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    console.log(`API Response: ${response.status} from ${url}`);

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;

      if (contentType.includes('application/json')) {
        const errorJson = await response.json();
        if (errorJson?.message) {
          errorMessage = errorJson.message;
        }
      } else {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      }

      console.error(`API Error: ${response.statusText}`, errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`API Data received:`, data);
    return data;
  } catch (error) {
    console.error('API Call Error:', error);
    throw error;
  }
};
