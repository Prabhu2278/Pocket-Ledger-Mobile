// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Centralized API Client
// ---------------------------------------------------------------------------
// Seamlessly communicates with the existing FastAPI backend using standard JWT Bearer
// authentication and handles multi-environment address resolution (Android emulator,
// iOS simulator, physical devices on Wi-Fi, and Web).

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { storage } from './storage';
import {
  User,
  TokenResponse,
  Wallet,
  WalletCreateInput,
  WalletUpdateInput,
  Transaction,
  TransactionCreateInput,
  TransactionUpdateInput,
  InsightsSummary,
  Budget,
  Category,
  CategoryCreateInput,
  UserSetting,
} from '../types';

// Resolve Backend Base URL based on environment, platform, and device type
const DEFAULT_LAN_URL = 'http://192.168.1.37:8000';

export function getApiBaseUrl(): string {
  // If running in Expo Go on a physical phone, Constants.expoConfig?.hostUri has the PC's LAN IP
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost || '';
  const hostIp = hostUri ? hostUri.split(':')[0] : null;

  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    let cleanUrl = envUrl.trim().replace(/\/$/, '');

    // Never use 10.0.2.2 or localhost on a physical mobile device
    if (cleanUrl.includes('10.0.2.2') || cleanUrl.includes('localhost')) {
      const targetIp = hostIp || '192.168.1.37';
      cleanUrl = cleanUrl.replace('10.0.2.2', targetIp).replace('localhost', targetIp);
    }

    return cleanUrl;
  }

  // Automatic Fallbacks
  if (hostIp) {
    return `http://${hostIp}:8000`;
  }

  return DEFAULT_LAN_URL;
}

export const API_BASE_URL = getApiBaseUrl();

// Optional listener callback for session expiration (401)
let onUnauthorizedHandler: (() => void) | null = null;
export function setOnUnauthorizedHandler(handler: () => void) {
  onUnauthorizedHandler = handler;
}

// Low-level fetch wrapper with automatic JWT headers and JSON error parsing
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await storage.getToken();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${getApiBaseUrl()}${cleanEndpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      if (onUnauthorizedHandler) {
        onUnauthorizedHandler();
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Session expired. Please log in again.');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Request failed with status ${res.status}`);
    }

    if (res.status === 204) {
      return null as unknown as T;
    }

    return await res.json();
  } catch (err: any) {
    console.warn(`[API] Error calling ${endpoint}:`, err?.message || err);
    throw err;
  }
}

// High-level Domain API Client
export const api = {
  getBaseUrl(): string {
    return getApiBaseUrl();
  },

  // 1. Health Probe
  async health(): Promise<{ status: string; service: string }> {
    return request('/health');
  },

  // 2. Authentication
  auth: {
    async register(data: { name: string; email: string; password: string }): Promise<TokenResponse> {
      return request<TokenResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async login(data: { email: string; password: string }): Promise<TokenResponse> {
      return request<TokenResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async getMe(): Promise<User> {
      return request<User>('/api/v1/auth/me');
    },

    async updateMe(data: { full_name?: string; currency?: string; theme?: string }): Promise<User> {
      return request<User>('/api/v1/auth/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async changePassword(data: { current_password: string; new_password: string }): Promise<{ status: string; message: string }> {
      return request<{ status: string; message: string }>('/api/v1/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  },

  // 3. Wallets & Accounts
  wallets: {
    async getAll(): Promise<Wallet[]> {
      return request<Wallet[]>('/api/v1/wallets');
    },

    async create(data: WalletCreateInput): Promise<Wallet> {
      return request<Wallet>('/api/v1/wallets', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          wallet_type: data.wallet_type || 'BANK',
          initial_balance: Number(data.initial_balance || 0),
          color: data.color || '#10b981',
        }),
      });
    },

    async update(id: number, data: WalletUpdateInput): Promise<Wallet> {
      return request<Wallet>(`/api/v1/wallets/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: data.name,
          wallet_type: data.wallet_type,
          initial_balance: data.initial_balance !== undefined ? Number(data.initial_balance) : undefined,
          color: data.color,
        }),
      });
    },

    async delete(id: number): Promise<{ message: string; id: number }> {
      return request<{ message: string; id: number }>(`/api/v1/wallets/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // 4. Unified Transactions
  transactions: {
    async getAll(params: {
      month_key?: string;
      start_date?: string;
      end_date?: string;
      type?: string;
      category?: string;
      search?: string;
      wallet_id?: number;
      sort_by?: 'date' | 'amount';
      sort_order?: 'asc' | 'desc';
      limit?: number;
    } = {}): Promise<Transaction[]> {
      const q = new URLSearchParams();
      if (params.month_key) q.append('month_key', params.month_key);
      if (params.start_date) q.append('start_date', params.start_date);
      if (params.end_date) q.append('end_date', params.end_date);
      if (params.type && params.type !== 'all') q.append('type', params.type);
      if (params.category && params.category !== 'All') q.append('category', params.category);
      if (params.search) q.append('search', params.search);
      if (params.wallet_id) q.append('wallet_id', String(params.wallet_id));
      if (params.sort_by) q.append('sort_by', params.sort_by);
      if (params.sort_order) q.append('sort_order', params.sort_order);
      q.append('limit', String(params.limit || 500));

      return request<Transaction[]>(`/api/v1/transactions?${q.toString()}`);
    },

    async create(data: TransactionCreateInput): Promise<Transaction> {
      return request<Transaction>('/api/v1/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: data.type,
          amount: Number(data.amount),
          category: data.category,
          category_color: data.category_color,
          note: data.note || '',
          date: data.date,
          payment_method: data.payment_method || (data.type === 'transfer' ? 'Wallet Transfer' : 'UPI'),
          wallet_id: data.wallet_id ? Number(data.wallet_id) : undefined,
          to_wallet_id: data.to_wallet_id ? Number(data.to_wallet_id) : undefined,
        }),
      });
    },

    async update(id: number, data: TransactionUpdateInput): Promise<Transaction> {
      return request<Transaction>(`/api/v1/transactions/${id}?type=${data.type || ''}`, {
        method: 'PUT',
        body: JSON.stringify({
          type: data.type,
          amount: data.amount !== undefined ? Number(data.amount) : undefined,
          category: data.category,
          category_color: data.category_color,
          note: data.note,
          date: data.date,
          payment_method: data.payment_method,
          wallet_id: data.wallet_id !== undefined ? (data.wallet_id ? Number(data.wallet_id) : null) : undefined,
          to_wallet_id: data.to_wallet_id !== undefined ? (data.to_wallet_id ? Number(data.to_wallet_id) : null) : undefined,
        }),
      });
    },

    async delete(id: number, type?: string): Promise<{ message: string; id: number }> {
      const q = type ? `?type=${type}` : '';
      return request<{ message: string; id: number }>(`/api/v1/transactions/${id}${q}`, {
        method: 'DELETE',
      });
    },

    async bulkImport(transactions: TransactionCreateInput[]): Promise<{ success: boolean; imported: number; message: string }> {
      return request('/api/v1/transactions/bulk', {
        method: 'POST',
        body: JSON.stringify({ transactions }),
      });
    },

    async exportCsvText(monthKey?: string): Promise<string> {
      const token = await storage.getToken();
      const q = monthKey ? `?month_key=${monthKey}` : '';
      const url = `${getApiBaseUrl()}/api/v1/transactions/export-csv${q}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to export CSV');
      return await res.text();
    },
  },

  // 5. Insights & Budgets
  insights: {
    async getSummary(monthKey?: string): Promise<InsightsSummary> {
      const q = monthKey ? `?month_key=${monthKey}` : '';
      return request<InsightsSummary>(`/api/v1/insights${q}`);
    },

    async getBudget(monthKey?: string): Promise<Budget> {
      const q = monthKey ? `?month_key=${monthKey}` : '';
      return request<Budget>(`/api/v1/insights/budget${q}`);
    },

    async setBudget(monthKey: string, targetAmount: number): Promise<Budget> {
      return request<Budget>('/api/v1/insights/budget', {
        method: 'POST',
        body: JSON.stringify({
          month_key: monthKey,
          target_amount: Number(targetAmount),
        }),
      });
    },
  },

  // 6. Categories
  categories: {
    async getAll(type?: 'expense' | 'income'): Promise<Category[]> {
      const q = type ? `?type=${type}` : '';
      return request<Category[]>(`/api/v1/categories${q}`);
    },

    async create(data: CategoryCreateInput): Promise<Category> {
      return request<Category>('/api/v1/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id: number, data: Partial<CategoryCreateInput>): Promise<Category> {
      return request<Category>(`/api/v1/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async delete(id: number): Promise<{ status: string; message: string; category_id: number }> {
      return request(`/api/v1/categories/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // 7. Settings & Currency
  settings: {
    async getSettings(): Promise<UserSetting> {
      return request<UserSetting>('/api/v1/settings');
    },

    async updateSettings(data: { theme?: string; currency?: string }): Promise<UserSetting> {
      return request<UserSetting>('/api/v1/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async getCurrency(): Promise<{ currency_code: string; currency: string }> {
      return request('/api/v1/settings/currency');
    },

    async updateCurrency(currencyCode: string): Promise<{ currency_code: string; currency: string }> {
      return request('/api/v1/settings/currency', {
        method: 'PUT',
        body: JSON.stringify({ currency_code: currencyCode }),
      });
    },
  },
};

export default api;
