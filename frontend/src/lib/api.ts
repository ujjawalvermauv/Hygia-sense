// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
  },
  
  // Toilets
  TOILETS: {
    GET_ALL: `${API_BASE_URL}/toilets`,
  },
  
  // Cleaners
  CLEANERS: {
    GET_ALL: `${API_BASE_URL}/cleaners`,
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
      const errorText = await response.text();
      console.error(`API Error: ${response.statusText}`, errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`API Data received:`, data);
    return data;
  } catch (error) {
    console.error('API Call Error:', error);
    throw error;
  }
};
