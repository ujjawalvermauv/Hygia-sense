import { API_ENDPOINTS, apiCall } from '@/lib/api';

// Get all latest sensor data
export const getAllSensorData = async () => {
  return await apiCall(API_ENDPOINTS.SENSORS.GET_ALL, {
    method: 'GET',
  });
};

// Get sensor data for a specific toilet
export const getSensorDataByToilet = async (toiletId: string) => {
  return await apiCall(API_ENDPOINTS.SENSORS.GET_BY_TOILET(toiletId), {
    method: 'GET',
  });
};

// Get sensor data history for a toilet
export const getSensorDataHistory = async (toiletId: string, limit = 100) => {
  return await apiCall(
    `${API_ENDPOINTS.SENSORS.GET_HISTORY(toiletId)}?limit=${limit}`,
    {
      method: 'GET',
    }
  );
};

// Setup polling for real-time sensor data
export const setupSensorPolling = (
  callback: (data: any) => void,
  interval = 5000
) => {
  const poll = async () => {
    try {
      const data = await getAllSensorData();
      callback(data);
    } catch (error) {
      console.error('Error polling sensor data:', error);
    }
  };

  // Initial call
  poll();

  // Setup interval
  const intervalId = setInterval(poll, interval);

  // Return cleanup function
  return () => clearInterval(intervalId);
};
