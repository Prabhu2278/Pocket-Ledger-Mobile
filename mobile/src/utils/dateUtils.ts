// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Date Formatting & Month Shifting Utilities
// ---------------------------------------------------------------------------

export interface MonthState {
  year: number;
  month: number; // 0-indexed (0 = Jan, 11 = Dec)
}

export function getCurrentMonthState(): MonthState {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function getMonthKey(monthState: MonthState): string {
  const m = String(monthState.month + 1).padStart(2, '0');
  return `${monthState.year}-${m}`;
}

export function parseMonthKey(monthKey: string): MonthState {
  const parts = (monthKey || '').split('-');
  if (parts.length === 2) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    if (!isNaN(y) && !isNaN(m)) {
      return { year: y, month: m };
    }
  }
  return getCurrentMonthState();
}

export function getPreviousMonth(monthState: MonthState): MonthState {
  if (monthState.month === 0) {
    return { year: monthState.year - 1, month: 11 };
  }
  return { year: monthState.year, month: monthState.month - 1 };
}

export function getNextMonth(monthState: MonthState): MonthState {
  if (monthState.month === 11) {
    return { year: monthState.year + 1, month: 0 };
  }
  return { year: monthState.year, month: monthState.month + 1 };
}

export function formatMonthLabel(monthState: MonthState): string {
  const date = new Date(monthState.year, monthState.month, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (dateStr === todayStr) return 'Today';

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (dateStr === yesterdayStr) return 'Yesterday';

  return formatDisplayDate(dateStr);
}

export function getTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
