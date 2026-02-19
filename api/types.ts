// TODO: port from svelte-playground/src/lib/api/types.ts
// APIResponse, AuthResponse, LoginCredentials, etc.

export interface APIResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}
