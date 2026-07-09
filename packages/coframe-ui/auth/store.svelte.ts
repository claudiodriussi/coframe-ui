/**
 * Auth store — Svelte 5 runes.
 *
 * Usage:
 *   import { authStore } from '$coframe/auth/store.svelte';
 *
 *   authStore.checkAuth()           // call in onMount to restore session from token
 *   await authStore.login(creds)    // returns true on success
 *   authStore.logout()
 *   await authStore.updateContext({ tenant_prefix: 'test' })
 *
 *   authStore.user                  // UserContext | null
 *   authStore.isAuthenticated       // boolean (derived)
 *   authStore.isLoading             // boolean
 *   authStore.error                 // string | null
 */

import { jwtDecode } from 'jwt-decode';
import { goto } from '$app/navigation';
import { api } from '../api/client';
import type { UserContext, LoginCredentials } from '../api/types';

class AuthStore {
  user = $state<UserContext | null>(null);
  isAuthenticated = $derived(this.user !== null);
  isLoading = $state(false);
  error = $state<string | null>(null);

  constructor() {
    if (typeof window !== 'undefined') {
      // 401 — session expired or token rejected by server
      window.addEventListener('coframe:unauthorized', () => {
        this.user = null;
        this.error = 'Session expired. Please sign in again.';
        goto('/');
      });
    }
  }

  // Decode JWT and update user state (client-side only — no signature check)
  private _applyToken(token: string): void {
    try {
      type JwtPayload = UserContext & { exp?: number; iat?: number };
      const { exp: _exp, iat: _iat, ...user } = jwtDecode<JwtPayload>(token);
      this.user = user as UserContext;
    } catch {
      this.user = null;
    }
  }

  /**
   * Restore session from localStorage on app startup.
   * Call from onMount in the root layout.
   */
  checkAuth(): void {
    const token = api.getToken();
    if (token) {
      this._applyToken(token);
    } else {
      this.user = null;
    }
  }

  async login(credentials: LoginCredentials): Promise<boolean> {
    this.isLoading = true;
    this.error = null;
    try {
      const res = await api.login(credentials);
      if (res.status === 'success' && res.token) {
        this._applyToken(res.token);
        return true;
      }
      this.error = res.message ?? 'Login failed';
      return false;
    } catch (err: any) {
      this.error = err.message ?? 'Network error';
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  logout(): void {
    api.logout();
    this.user = null;
    this.error = null;
  }

  /**
   * Switch context (e.g. change tenant).
   * Requests a new JWT from the server with the updated payload.
   */
  async updateContext(context: Partial<UserContext>): Promise<boolean> {
    try {
      const res = await api.updateContext(context);
      if (res.status === 'success' && res.token) {
        this._applyToken(res.token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const authStore = new AuthStore();
