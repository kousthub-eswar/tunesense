import { apiRequest } from './apiClient';
import type { SafeUser, AuthResponse, SignupData, LoginData } from '../types';

export const authService = {
  async signup(data: SignupData): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data: LoginData): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>('/auth/logout', {
      method: 'POST',
    });
  },

  async getCurrentUser(): Promise<{ user: SafeUser }> {
    return apiRequest<{ user: SafeUser }>('/auth/me', {
      method: 'GET',
    });
  },
};
