// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Main Application & Financial Data Context
// ---------------------------------------------------------------------------

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { useAuth } from './AuthContext';
import {
  Wallet,
  Transaction,
  InsightsSummary,
  Category,
  TransactionCreateInput,
  TransactionUpdateInput,
  WalletCreateInput,
  WalletUpdateInput,
} from '../types';
import {
  MonthState,
  getCurrentMonthState,
  getMonthKey,
  getPreviousMonth,
  getNextMonth,
} from '../utils/dateUtils';

interface AppContextValue {
  // Financial Records
  wallets: Wallet[];
  transactions: Transaction[];
  insights: InsightsSummary | null;
  categories: Category[];
  currency: string;

  // Month navigation
  monthState: MonthState;
  monthKey: string;
  setMonthState: (state: MonthState) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;

  // Aggregate Metrics
  totalBalance: number;
  totalIncome: number;
  totalSpent: number;
  netCashFlow: number;

  // Loading & Error States
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Data Refresh Actions
  refreshAll: () => Promise<void>;
  refreshWallets: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshInsights: () => Promise<void>;
  refreshCategories: () => Promise<void>;

  // Wallet Operations
  createWallet: (data: WalletCreateInput) => Promise<Wallet>;
  updateWallet: (id: number, data: WalletUpdateInput) => Promise<Wallet>;
  deleteWallet: (id: number) => Promise<void>;

  // Transaction Operations
  createTransaction: (data: TransactionCreateInput) => Promise<Transaction>;
  updateTransaction: (id: number, data: TransactionUpdateInput) => Promise<Transaction>;
  deleteTransaction: (id: number, type?: string) => Promise<void>;

  // Currency Operations
  updateCurrency: (code: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<InsightsSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrencyState] = useState<string>('INR');

  const [monthState, setMonthState] = useState<MonthState>(getCurrentMonthState());
  const monthKey = useMemo(() => getMonthKey(monthState), [monthState]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load currency preference
  useEffect(() => {
    async function loadCurrency() {
      if (user?.currency) {
        setCurrencyState(user.currency);
        return;
      }
      const saved = await storage.getCurrency();
      if (saved) {
        setCurrencyState(saved);
      }
    }
    loadCurrency();
  }, [user]);

  // Fetch wallets
  const refreshWallets = useCallback(async () => {
    try {
      const data = await api.wallets.getAll();
      setWallets(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('[AppContext] Failed to fetch wallets:', err.message);
    }
  }, []);

  // Fetch transactions (all months so custom date ranges can search across months, matching Web)
  const refreshTransactions = useCallback(async () => {
    try {
      const data = await api.transactions.getAll({ limit: 5000 });
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        const dateDiff = dateB.localeCompare(dateA);
        if (dateDiff !== 0) return dateDiff;
        return (b.id || 0) - (a.id || 0);
      });
      setTransactions(list);
    } catch (err: any) {
      console.warn('[AppContext] Failed to fetch transactions:', err.message);
    }
  }, []);

  // Fetch financial insights
  const refreshInsights = useCallback(async () => {
    try {
      const insightsData = await api.insights.getSummary(monthKey).catch(() => null);
      if (insightsData) setInsights(insightsData);
    } catch (err: any) {
      console.warn('[AppContext] Failed to fetch insights:', err.message);
    }
  }, [monthKey]);

  // Fetch categories
  const refreshCategories = useCallback(async () => {
    try {
      const data = await api.categories.getAll();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('[AppContext] Failed to fetch categories:', err.message);
    }
  }, []);

  // Master refresh function
  const refreshAll = useCallback(async () => {
    setError(null);
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshWallets(),
        refreshTransactions(),
        refreshInsights(),
        refreshCategories(),
      ]);
    } catch (err: any) {
      setError(err?.message || 'Failed to sync with server');
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [refreshWallets, refreshTransactions, refreshInsights, refreshCategories]);

  // Trigger sync when authentication or monthKey changes
  useEffect(() => {
    refreshAll();
  }, [refreshAll, isAuthenticated, monthKey]);

  // Computed financial KPIs
  const totalBalance = useMemo(() => {
    return wallets.reduce((sum, w) => sum + Number(w.current_balance ?? w.initial_balance ?? 0), 0);
  }, [wallets]);

  // Transactions belonging to the currently selected month
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => (t.date || '').startsWith(monthKey));
  }, [transactions, monthKey]);

  const totalIncome = useMemo(() => {
    if (insights?.total_income !== undefined && insights?.total_income !== null) {
      return Number(insights.total_income);
    }
    return monthTransactions
      .filter((t) => (t.type || '').toLowerCase() === 'income')
      .reduce((sum, t) => sum + Number(t.amount || t.amt || 0), 0);
  }, [insights, monthTransactions]);

  const totalSpent = useMemo(() => {
    if (insights?.total_spent !== undefined && insights?.total_spent !== null) {
      return Number(insights.total_spent);
    }
    if (insights?.total_expenses !== undefined && insights?.total_expenses !== null) {
      return Number(insights.total_expenses);
    }
    return monthTransactions
      .filter((t) => (t.type || '').toLowerCase() === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || t.amt || 0), 0);
  }, [insights, monthTransactions]);

  const netCashFlow = useMemo(() => {
    return totalIncome - totalSpent;
  }, [totalIncome, totalSpent]);

  // Month navigation helpers
  const goToPreviousMonth = () => {
    setMonthState((prev) => getPreviousMonth(prev));
  };

  const goToNextMonth = () => {
    setMonthState((prev) => getNextMonth(prev));
  };

  // Wallet operations
  const createWallet = async (data: WalletCreateInput): Promise<Wallet> => {
    const created = await api.wallets.create(data);
    await refreshWallets();
    return created;
  };

  const updateWallet = async (id: number, data: WalletUpdateInput): Promise<Wallet> => {
    const updated = await api.wallets.update(id, data);
    await refreshWallets();
    return updated;
  };

  const deleteWallet = async (id: number): Promise<void> => {
    await api.wallets.delete(id);
    await refreshWallets();
  };

  // Transaction operations
  const createTransaction = async (data: TransactionCreateInput): Promise<Transaction> => {
    const created = await api.transactions.create(data);
    // Refresh wallets and transactions since backend balances update
    await Promise.all([refreshTransactions(), refreshWallets(), refreshInsights()]);
    return created;
  };

  const updateTransaction = async (id: number, data: TransactionUpdateInput): Promise<Transaction> => {
    const updated = await api.transactions.update(id, data);
    await Promise.all([refreshTransactions(), refreshWallets(), refreshInsights()]);
    return updated;
  };

  const deleteTransaction = async (id: number, type?: string): Promise<void> => {
    await api.transactions.delete(id, type);
    await Promise.all([refreshTransactions(), refreshWallets(), refreshInsights()]);
  };

  // Currency operation
  const updateCurrency = async (code: string): Promise<void> => {
    setCurrencyState(code);
    await storage.setCurrency(code);
    if (isAuthenticated) {
      try {
        await api.settings.updateCurrency(code);
      } catch (err) {
        console.warn('[AppContext] Failed to sync currency setting with server:', err);
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        wallets,
        transactions,
        insights,
        categories,
        currency,
        monthState,
        monthKey,
        setMonthState,
        goToPreviousMonth,
        goToNextMonth,
        totalBalance,
        totalIncome,
        totalSpent,
        netCashFlow,
        isLoading,
        isRefreshing,
        error,
        refreshAll,
        refreshWallets,
        refreshTransactions,
        refreshInsights,
        refreshCategories,
        createWallet,
        updateWallet,
        deleteWallet,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        updateCurrency,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
