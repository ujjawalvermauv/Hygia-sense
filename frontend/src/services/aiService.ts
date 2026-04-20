import { API_ENDPOINTS, apiCall } from '@/lib/api';

export interface AiToiletInsight {
  toiletId: string;
  toiletName: string;
  latestSensorAt?: string | null;
  riskScore: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  nextCleaningAt: string;
  nextCleaningInMins: number;
  pendingTasksCount: number;
  recommendation: string[];
  metrics: {
    avgAqi: number;
    avgHumidity: number;
    avgUsagePerHour: number;
    recentFeedbackCount: number;
    recentLowRatingRatio: number;
    latestWaterQuality: string;
    latestWaterLevel: number | null;
    latestOccupancy: boolean;
  };
  recommendedCleaner: {
    cleanerId: string;
    name: string;
    status: string;
    confidence: number;
  } | null;
}

export interface AiOverviewResponse {
  summary: {
    monitoredToilets: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    averageRiskScore: number;
    generatedAt: string;
  };
  alerts: Array<{
    toiletId: string;
    toiletName: string;
    riskScore: number;
    priority: string;
    message: string;
  }>;
  insights: AiToiletInsight[];
}

export const getAiOverview = async (): Promise<AiOverviewResponse> => {
  return await apiCall(API_ENDPOINTS.AI.OVERVIEW, {
    method: 'GET',
  });
};

export const autoAssignAiTasks = async (minimumRisk = 60, maxAssignments = 5) => {
  return await apiCall(API_ENDPOINTS.AI.AUTO_ASSIGN, {
    method: 'POST',
    body: JSON.stringify({ minimumRisk, maxAssignments }),
  });
};
