// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Core TypeScript Definitions
// ---------------------------------------------------------------------------

export type TransactionType = 'expense' | 'income' | 'transfer';

export interface User {
  id: number;
  full_name?: string | null;
  email?: string | null;
  currency?: string | null;
  theme?: string | null;
  created_at?: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Wallet {
  id: number;
  name: string;
  wallet_type: 'BANK' | 'WALLET' | 'UPI' | 'DIGITAL' | 'CASH' | 'CREDIT_CARD' | string;
  initial_balance?: number;
  current_balance: number;
  color?: string;
  user_id?: number | null;
  created_at?: string;
}

export interface WalletCreateInput {
  name: string;
  wallet_type?: string;
  initial_balance?: number;
  color?: string;
}

export interface WalletUpdateInput {
  name?: string;
  wallet_type?: string;
  initial_balance?: number;
  color?: string;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  amt?: number;
  category: string;
  cat?: string;
  note: string;
  title?: string;
  date: string;
  spent_on?: string;
  received_on?: string;
  payment_method?: string;
  wallet_id?: number | null;
  wallet_name?: string | null;
  to_wallet_id?: number | null;
  to_wallet_name?: string | null;
  user_id?: number | null;
  created_at?: string | null;
}

export interface TransactionCreateInput {
  type: TransactionType;
  amount: number;
  category: string;
  category_color?: string;
  note?: string;
  date: string;
  payment_method?: string;
  wallet_id?: number | null;
  to_wallet_id?: number | null;
}

export interface TransactionUpdateInput {
  type?: TransactionType;
  amount?: number;
  category?: string;
  category_color?: string;
  note?: string;
  date?: string;
  payment_method?: string;
  wallet_id?: number | null;
  to_wallet_id?: number | null;
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  count: number;
  color: string;
}

export interface DaySpending {
  index: number;
  date: string;
  day_name: string;
  amount: number;
  is_today: boolean;
}

export interface ActivityLog {
  t: number;
  txt: string;
}

export interface InsightsSummary {
  month_key: string;
  total_spent: number;
  total_expenses: number;
  total_income: number;
  net_cash_flow: number;
  budget_target: number;
  budget: number;
  remaining_budget: number;
  budget_percentage_used: number;
  expense_count: number;
  income_count: number;
  top_category?: string | null;
  top_income_category?: string | null;
  category_breakdown: CategorySpending[];
  income_category_breakdown: CategorySpending[];
  last_7_days: DaySpending[];
  recent_activity: ActivityLog[];
}

export interface Budget {
  id?: number;
  month_key: string;
  target_amount: number;
  budget?: number;
  user_id?: number | null;
}

export interface Category {
  id: number;
  name: string;
  type: 'expense' | 'income';
  icon?: string;
  color?: string;
  is_default: boolean;
  is_active: boolean;
  user_id?: number | null;
}

export interface CategoryCreateInput {
  name: string;
  type: 'expense' | 'income';
  icon?: string;
  color?: string;
}

export interface UserSetting {
  id?: number;
  user_id?: number | null;
  theme: string;
  currency: string;
  updated_at?: string | null;
}

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  locale: string;
  label: string;
}
