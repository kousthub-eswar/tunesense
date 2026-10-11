import { apiRequest } from './apiClient';
import type { SafeUser, AuthResponse, SignupData, LoginData } from '../types';

interface RawAuthApiResponse {
  status?: string;
  data?: {
    user: SafeUser;
    token?: string;
  };
  user?: SafeUser;
  token?: string;
}

export const authService = {
  async signup(data: SignupData): Promise<AuthResponse> {
    const res = await apiRequest<RawAuthApiResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const user = res.data?.user || res.user;
    if (!user) {
      throw new Error('Registration succeeded but user profile was not returned.');
    }
    return { user };
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const res = await apiRequest<RawAuthApiResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const user = res.data?.user || res.user;
    if (!user) {
      throw new Error('Login succeeded but user profile was not returned.');
    }
    return { user };
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>('/auth/logout', {
      method: 'POST',
    });
  },

  async getCurrentUser(): Promise<{ user: SafeUser }> {
    const res = await apiRequest<RawAuthApiResponse>('/auth/me', {
      method: 'GET',
    });
    const user = res.data?.user || res.user;
    if (!user) {
      throw new Error('Unauthenticated session');
    }
    return { user };
  },
};
