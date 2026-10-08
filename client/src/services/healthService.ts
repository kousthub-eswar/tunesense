import { apiRequest } from './apiClient.js';
import { HealthResponse } from '../types/index.js';

export async function fetchHealthStatus(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/health');
}
