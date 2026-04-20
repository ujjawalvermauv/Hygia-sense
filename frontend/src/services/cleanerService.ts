import { API_ENDPOINTS, apiCall } from '@/lib/api';

export interface CleanerAccount {
  _id: string;
  name: string;
  email?: string;
  mobileNumber?: string;
  updatedAt?: string;
  lastShiftStartedAt?: string;
  lastShiftEndedAt?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  accountStatus?: 'active' | 'inactive';
  status?: 'available' | 'busy' | 'off-shift';
  shift?: 'morning' | 'afternoon' | 'night';
  shiftLabel?: string;
  assignedTasks?: number;
  completedTasks?: number;
  createdAt?: string;
  approvalHistory?: Array<{
    action: 'requested' | 'approved' | 'rejected' | 'activated' | 'deactivated' | 'shift-updated';
    actor: string;
    note?: string;
    createdAt: string;
  }>;
}

export const requestCleanerSignup = async (
  name: string,
  email: string,
  password: string,
  mobileNumber: string
) => {
  return await apiCall(API_ENDPOINTS.CLEANERS.SIGNUP_REQUEST, {
    method: 'POST',
    body: JSON.stringify({ name, email, password, mobileNumber }),
  });
};

export const loginCleaner = async (email: string, password: string) => {
  return await apiCall(API_ENDPOINTS.CLEANERS.LOGIN, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const getAllCleaners = async (): Promise<CleanerAccount[]> => {
  return await apiCall(API_ENDPOINTS.CLEANERS.GET_ALL, {
    method: 'GET',
  });
};

export const getPendingCleanerRequests = async (): Promise<CleanerAccount[]> => {
  return await apiCall(API_ENDPOINTS.CLEANERS.GET_PENDING, {
    method: 'GET',
  });
};

export const approveCleanerRequest = async (cleanerId: string, approvedBy: string, note = '') => {
  return await apiCall(API_ENDPOINTS.CLEANERS.APPROVE(cleanerId), {
    method: 'PUT',
    body: JSON.stringify({ approvedBy, note }),
  });
};

export const rejectCleanerRequest = async (cleanerId: string, rejectedBy: string, reason = '') => {
  return await apiCall(API_ENDPOINTS.CLEANERS.REJECT(cleanerId), {
    method: 'PUT',
    body: JSON.stringify({ rejectedBy, reason }),
  });
};

export const updateCleanerRoster = async (
  cleanerId: string,
  payload: {
    actor: string;
    accountStatus?: 'active' | 'inactive';
    shift?: 'morning' | 'afternoon' | 'night';
    note?: string;
  }
) => {
  return await apiCall(API_ENDPOINTS.CLEANERS.ROSTER_UPDATE(cleanerId), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const updateCleanerSelfShift = async (
  cleanerId: string,
  payload: {
    onShift: boolean;
    actor?: string;
    email?: string;
    note?: string;
  }
) => {
  return await apiCall(API_ENDPOINTS.CLEANERS.SELF_SHIFT(cleanerId), {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};
