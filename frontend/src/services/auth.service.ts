import { apiFetch } from './api';
import { LoginPayload, RegisterPayload, User } from '../types/user.types';
import { TokenResponse } from '../types/auth.types';

export const authService = {
  async login(payload: LoginPayload): Promise<TokenResponse> {
    return apiFetch<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async register(payload: RegisterPayload): Promise<User> {
    return apiFetch<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMe(): Promise<User> {
    return apiFetch<User>('/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem('zentronyx_token');
    }
  }
};
