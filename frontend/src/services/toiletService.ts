import { API_ENDPOINTS, apiCall } from '@/lib/api';

// Get all toilets
export const getAllToilets = async () => {
  return await apiCall(API_ENDPOINTS.TOILETS.GET_ALL, {
    method: 'GET',
  });
};

// Get all cleaners
export const getAllCleaners = async () => {
  return await apiCall(API_ENDPOINTS.CLEANERS.GET_ALL, {
    method: 'GET',
  });
};
