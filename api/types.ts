/**
 * Core API types for Coframe backend.
 * UserContext mirrors the JWT payload configured in config.yaml → authentication.context_fields
 */

export interface UserContext {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  // Multi-tenancy (optional — only present when multi_tenant.enabled)
  tenant_id?: number;
  tenant_prefix?: string | null;
  // Arbitrary extra context — the backend merges any fields sent via update_context
  // into the JWT payload, so wizard state, UI preferences, etc. can be stored here.
  [key: string]: unknown;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface APIResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  /** Exception class name from Python (e.g. "ValueError", "ScannerError") */
  error_type?: string;
  /** Full Python traceback — always present on server-side errors */
  traceback?: string;
}

export interface AuthResponse {
  status: 'success' | 'error';
  token?: string;
  user?: UserContext;
  message?: string;
}
