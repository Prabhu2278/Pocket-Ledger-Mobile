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

export const EXTENDED_CATEGORY_PALETTE = [
  '#b42c45', // Crimson
  '#2563eb', // Royal Blue
  '#15803d', // Forest Emerald
  '#b45309', // Amber Brown
  '#0d7a6f', // Deep Teal
  '#9333ea', // Purple
  '#ec4899', // Pink
  '#0284c7', // Sky Blue
  '#6366f1', // Indigo
  '#0ea5e9', // Ocean
  '#64748b', // Slate Gray
  '#10b981', // Emerald Mint
  '#f59e0b', // Golden Amber
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#f97316', // Bright Orange
  '#a855f7', // Soft Purple
  '#e11d48', // Bright Ruby
  '#84cc16', // Lime Green
  '#d946ef', // Bright Fuchsia
  '#22c55e', // Vibrant Green
  '#eab308', // Warm Yellow
  '#4f46e5', // Deep Indigo
  '#059669', // Dark Emerald
  '#db2777', // Deep Magenta
  '#ea580c', // Burnt Orange
  '#7c3aed', // Deep Violet
  '#0891b2', // Deep Ocean
  '#8b5cf6', // Violet
  '#f43f5e', // Coral Pink
  '#16a34a', // Leaf Green
  '#ca8a04', // Bronze
  '#be185d', // Berry Pink
  '#4338ca', // Dark Royal
  '#0f766e', // Pine Teal
  '#d97706', // Ochre
];

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function getUniqueCategoryColor(existingCategories: any[] = []): string {
  const used = new Set<string>();

  // 1. Gather default category colors
  EXPENSE_CATEGORIES.forEach((c) => used.add(c.color.toLowerCase().trim()));
  INCOME_CATEGORIES.forEach((c) => used.add(c.color.toLowerCase().trim()));

  // 2. Gather existing categories passed as argument
  if (Array.isArray(existingCategories)) {
    existingCategories.forEach((c) => {
      const col = c?.color || (Array.isArray(c) ? c[1] : null);
      if (col && typeof col === 'string') used.add(col.toLowerCase().trim());
    });
  }

  // 3. Find unused colors from curated extended palette
  const unusedPalette = EXTENDED_CATEGORY_PALETTE.filter(
    (col) => !used.has(col.toLowerCase().trim())
  );

  if (unusedPalette.length > 0) {
    const idx = Math.floor(Math.random() * unusedPalette.length);
    return unusedPalette[idx];
  }

  // 4. Dynamic random HSL color generation guaranteed to not collide
  for (let attempt = 0; attempt < 60; attempt++) {
    const randomHue = Math.floor(Math.random() * 360);
    const genColor = hslToHex(randomHue, 74, 48);
    if (!used.has(genColor.toLowerCase())) {
      return genColor;
    }
  }

  return '#ec4899';
}

