import { API_ENDPOINTS, apiCall } from '@/lib/api';

// Get all tasks
export const getAllTasks = async () => {
  return await apiCall(API_ENDPOINTS.TASKS.GET_ALL, {
    method: 'GET',
  });
};

// Get tasks pending approval
export const getPendingTasks = async () => {
  return await apiCall(API_ENDPOINTS.TASKS.GET_PENDING, {
    method: 'GET',
  });
};

// Get single task by ID
export const getTaskById = async (taskId: string) => {
  return await apiCall(API_ENDPOINTS.TASKS.GET_BY_ID(taskId), {
    method: 'GET',
  });
};

// Assign a task
export const assignTask = async (toiletId: string, cleanerId: string) => {
  return await apiCall(API_ENDPOINTS.TASKS.ASSIGN, {
    method: 'POST',
    body: JSON.stringify({ toiletId, cleanerId }),
  });
};

// Start a cleaner task after QR scan
export const startTask = async (
  taskId: string,
  qrValue: string,
  location?: { latitude: number; longitude: number; accuracy?: number }
) => {
  return await apiCall(API_ENDPOINTS.TASKS.START(taskId), {
    method: 'POST',
    body: JSON.stringify({
      qrValue,
      location,
    }),
  });
};

// Complete a task with before/after photos
export const completeTask = async (taskId: string, photos: File[]) => {
  if (photos.length < 2) {
    throw new Error('Please upload both before and after photos before submitting.');
  }

  const formData = new FormData();
  photos.forEach((photo) => formData.append('photos', photo));

  const response = await fetch(API_ENDPOINTS.TASKS.COMPLETE(taskId), {
    method: 'PUT',
    body: formData,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    throw new Error(data?.message || 'Task completion failed');
  }

  return data;
};

export const reportTaskIssue = async (
  taskId: string,
  note: string,
  severity: 'low' | 'medium' | 'high' = 'medium',
  reportedVia: 'text' | 'voice' = 'text'
) => {
  return await apiCall(API_ENDPOINTS.TASKS.REPORT_ISSUE(taskId), {
    method: 'POST',
    body: JSON.stringify({ note, severity, reportedVia }),
  });
};

// Backwards-compatible alias for older screens
export const uploadPhotos = completeTask;

// Approve a task
export const approveTask = async (
  taskId: string,
  adminId: string,
  approvalNotes = ''
) => {
  return await apiCall(API_ENDPOINTS.TASKS.APPROVE(taskId), {
    method: 'PUT',
    body: JSON.stringify({ adminId, approvalNotes }),
  });
};

// Reject a task
export const rejectTask = async (
  taskId: string,
  adminId: string,
  rejectionReason = ''
) => {
  return await apiCall(API_ENDPOINTS.TASKS.REJECT(taskId), {
    method: 'PUT',
    body: JSON.stringify({ adminId, rejectionReason }),
  });
};

// Delete a photo from task
export const deletePhoto = async (taskId: string, photoId: string) => {
  return await apiCall(API_ENDPOINTS.TASKS.DELETE_PHOTO(taskId, photoId), {
    method: 'DELETE',
  });
};

// Setup polling for pending tasks
export const setupTaskPolling = (
  callback: (tasks: any[]) => void,
  interval = 10000
) => {
  const poll = async () => {
    try {
      const tasks = await getPendingTasks();
      callback(tasks);
    } catch (error) {
      console.error('Error polling tasks:', error);
    }
  };

  // Initial call
  poll();

  // Setup interval
  const intervalId = setInterval(poll, interval);

  // Return cleanup function
  return () => clearInterval(intervalId);
};
