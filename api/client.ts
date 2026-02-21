/**
 * Coframe API client — Axios-based, JWT-aware.
 *
 * Design:
 * - Two dedicated routes handle JWT generation (login, update_context).
 * - All other operations go through POST /{endpointPrefix}/{op}.
 * - Auto-injects Bearer token from localStorage on every request.
 * - Handles X-New-Token header: server silently refreshes token every ~20 min.
 * - Dispatches 'coframe:unauthorized' on 401 (token expired/invalid).
 */

import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config';
import type { LoginCredentials, AuthResponse, APIResponse, UserContext } from './types';

const TOKEN_KEY = 'coframe_token';
const TIMEOUT = 10000;

class CoframeAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.api.root,
      timeout: TIMEOUT,
      headers: { 'Content-Type': 'application/json' }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request: inject Bearer token
    this.client.interceptors.request.use((req) => {
      const token = this.getToken();
      if (token && req.headers) {
        req.headers.Authorization = `Bearer ${token}`;
      }
      return req;
    });

    // Response: handle token refresh + 401
    this.client.interceptors.response.use(
      (res) => {
        const newToken = res.headers['x-new-token'];
        if (newToken) {
          this.setToken(newToken);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('coframe:token-refreshed', { detail: newToken }));
          }
        }
        return res;
      },
      (err: AxiosError) => {
        if (err.response?.status === 401) {
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('coframe:unauthorized'));
          }
        }
        return Promise.reject(err);
      }
    );
  }

  // ── Token management ──────────────────────────────────────────────────────

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
  }

  // ── Authentication — dedicated routes (server needs SECRET_KEY for JWT) ──

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const res = await this.client.post<any>('/auth/login', credentials);
      const d = res.data;
      if (d?.status === 'success' && d?.data?.token) {
        this.setToken(d.data.token);
        return { status: 'success', token: d.data.token, user: d.data.user };
      }
      return { status: 'error', message: d?.message ?? 'Login failed' };
    } catch (err: any) {
      return { status: 'error', message: err.response?.data?.message ?? 'Login failed' };
    }
  }

  /**
   * Switch context (e.g. change tenant).
   * The server validates the request and returns a new JWT with updated payload.
   */
  async updateContext(context: Partial<UserContext>): Promise<AuthResponse> {
    try {
      const res = await this.client.post<any>('/auth/update_context', context);
      const d = res.data;
      if (d?.status === 'success' && d?.data?.token) {
        this.setToken(d.data.token);
        return { status: 'success', token: d.data.token, user: d.data.user };
      }
      return { status: 'error', message: d?.message ?? 'Context update failed' };
    } catch (err: any) {
      return { status: 'error', message: err.response?.data?.message ?? 'Context update failed' };
    }
  }

  logout() {
    this.clearToken();
  }

  // ── Generic endpoint dispatcher — all data operations ─────────────────────
  //
  // All Coframe operations (db CRUD, query, read_file, get_type_schema, ...)
  // go through POST /{endpointPrefix}/{operation}.
  //
  // Examples:
  //   api.endpoint('db', { table: 'User', method: 'get' })
  //   api.endpoint('db', { table: 'User', method: 'get', id: 1 })
  //   api.endpoint('db', { table: 'User', method: 'create', data: {...} })
  //   api.endpoint('db', { table: 'User', method: 'update', id: 1, data: {...} })
  //   api.endpoint('db', { table: 'User', method: 'delete', id: 1 })
  //   api.endpoint('query', { format: 'dict', query: { table: 'User', ... } })
  //   api.endpoint('read_file', { file_path: 'hello.yaml', base_dir: 'data' })
  //   api.endpoint('get_type_schema', { include_builtin: false })

  async endpoint<T>(operation: string, data: unknown = {}): Promise<APIResponse<T>> {
    try {
      const res = await this.client.post<any>(
        `/${config.api.endpointPrefix}/${operation}`,
        data
      );
      const d = res.data;
      return {
        status: d?.status === 'success' ? 'success' : 'error',
        data: d?.data,
        message: d?.message
      };
    } catch (err: any) {
      return { status: 'error', message: err.response?.data?.message ?? 'Request failed' };
    }
  }
}

export const api = new CoframeAPI();
