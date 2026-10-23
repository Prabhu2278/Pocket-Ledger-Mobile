// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Category Definitions & Color Palette
// ---------------------------------------------------------------------------

export interface CategoryDefinition {
  name: string;
  color: string;
  icon: string;
  type: 'expense' | 'income';
}

export const EXPENSE_CATEGORIES: CategoryDefinition[] = [
  { name: 'Food', color: '#b42c45', icon: 'restaurant-outline', type: 'expense' },
  { name: 'Transport', color: '#2563eb', icon: 'car-outline', type: 'expense' },
  { name: 'Shopping', color: '#b45309', icon: 'cart-outline', type: 'expense' },
  { name: 'Bills', color: '#0284c7', icon: 'receipt-outline', type: 'expense' },
  { name: 'Home', color: '#0d7a6f', icon: 'home-outline', type: 'expense' },
  { name: 'Health', color: '#15803d', icon: 'medical-outline', type: 'expense' },
  { name: 'Education', color: '#6366f1', icon: 'school-outline', type: 'expense' },
  { name: 'Entertainment', color: '#9333ea', icon: 'film-outline', type: 'expense' },
  { name: 'Fun', color: '#9333ea', icon: 'game-controller-outline', type: 'expense' },
  { name: 'Travel', color: '#0ea5e9', icon: 'airplane-outline', type: 'expense' },
  { name: 'Other', color: '#64748b', icon: 'ellipsis-horizontal-outline', type: 'expense' },
];

export const INCOME_CATEGORIES: CategoryDefinition[] = [
  { name: 'Salary', color: '#15803d', icon: 'cash-outline', type: 'income' },
  { name: 'Freelance', color: '#2563eb', icon: 'briefcase-outline', type: 'income' },
  { name: 'Business', color: '#b45309', icon: 'trending-up-outline', type: 'income' },
  { name: 'Investments', color: '#9333ea', icon: 'pie-chart-outline', type: 'income' },
  { name: 'Gifts', color: '#ec4899', icon: 'gift-outline', type: 'income' },
  { name: 'Other', color: '#64748b', icon: 'wallet-outline', type: 'income' },
];

export const TRANSFER_CATEGORY: CategoryDefinition = {
  name: 'Transfer',
  color: '#2563eb',
  icon: 'swap-horizontal-outline',
  type: 'expense',
};

const CATEGORY_MAP: Record<string, CategoryDefinition> = {};
[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, TRANSFER_CATEGORY].forEach((c) => {
  CATEGORY_MAP[c.name.toLowerCase()] = c;
});

export function getCategoryDefinition(name: string): CategoryDefinition {
  if (!name) return { name: 'Other', color: '#64748b', icon: 'ellipsis-horizontal-outline', type: 'expense' };
  const found = CATEGORY_MAP[name.trim().toLowerCase()];
  if (found) return found;

  // Fallback hash color for custom user-created categories
  const fallbackColors = ['#0284c7', '#0d9488', '#16a34a', '#ca8a04', '#ea580c', '#e11d48', '#9333ea', '#4f46e5'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = fallbackColors[Math.abs(hash) % fallbackColors.length];
  return {
    name,
    color,
    icon: 'pricetag-outline',
    type: 'expense',
  };
}

export function getCategoryColor(name: string): string {
  return getCategoryDefinition(name).color;
}

export function getCategoryIcon(name: string): string {
  return getCategoryDefinition(name).icon;
}
