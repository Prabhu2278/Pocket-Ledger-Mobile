// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Bank Statement CSV Import Modal
// With Wallet Verification, Low Fund Alerts, and Pop-up Income Form to
// seamlessly record income transactions into the ledger before importing.
// ---------------------------------------------------------------------------

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../../src/context/ThemeContext';
import { useApp } from '../../src/context/AppContext';
import { Button } from '../../src/components/ui/Button';
import { api } from '../../src/api/api';
import { Wallet, TransactionCreateInput } from '../../src/types';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { getTodayIso } from '../../src/utils/dateUtils';
import { INCOME_CATEGORIES } from '../../src/constants/categories';
import { DatePickerModal } from '../../src/components/modals/DatePickerModal';
import { CustomAlertDialog, AlertType } from '../../src/components/modals/CustomAlertDialog';
import { Spacing, Radii, Typography } from '../../src/theme';

interface ParsedImportRow {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string;
  date: string;
  rawWalletName: string;
  wallet_id?: number;
}

interface EvaluatedRow extends ParsedImportRow {
  targetWalletId: number | null;
  targetWalletName: string;
  canRecord: boolean;
  isNewWallet: boolean;
  isInsufficientFunds: boolean;
  availableBalanceBefore: number;
  balanceAfter: number;
  shortage: number;
}

type IssueType = 'NEW_WALLET_INCOME' | 'NEW_WALLET_EXPENSE' | 'LOW_FUNDS';

interface WalletIssue {
  id: string;
  type: IssueType;
  walletName: string;
  matchedWallet?: Wallet;
  currentBalance: number;
  totalIncomeInBatch: number;
  totalExpenseInBatch: number;
  shortageAmount: number;
}

interface AlertDialogState {
  isOpen: boolean;
  type?: AlertType;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  message: string;
  primaryButton?: {
    text: string;
    onPress: () => void | Promise<void>;
    variant?: 'primary' | 'danger' | 'success' | 'secondary';
    loading?: boolean;
  };
  secondaryButton?: {
    text: string;
    onPress: () => void;
  };
}

export default function CsvImportModal() {
  const router = useRouter();
  const { theme } = useTheme();
  const { wallets, createWallet, createTransaction, refreshAll, currency } = useApp();

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Target wallet fallback when statement has no wallet column
  const [targetWalletId, setTargetWalletId] = useState<number | null>(
    wallets.length > 0 ? wallets[0].id : null
  );

  // -------------------------------------------------------------------------
  // Custom Alert Dialog State (Replaces native unstyled Alert.alert)
  // -------------------------------------------------------------------------
  const [alertDialog, setAlertDialog] = useState<AlertDialogState>({
    isOpen: false,
    title: '',
    message: '',
  });

  const showAlert = (config: Omit<AlertDialogState, 'isOpen'>) => {
    setAlertDialog({ ...config, isOpen: true });
  };

  const closeAlert = () => {
    setAlertDialog((prev) => ({ ...prev, isOpen: false }));
  };

  // -------------------------------------------------------------------------
  // Income Form Popup State (pops up when imported row has low funds or needs income)
  // -------------------------------------------------------------------------
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [incomeFormWallet, setIncomeFormWallet] = useState<Wallet | null>(null);
  const [incomeFormWalletName, setIncomeFormWalletName] = useState('');
  const [incomeMinRequired, setIncomeMinRequired] = useState(0);
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('Salary');
  const [incomeNote, setIncomeNote] = useState('');
  const [incomeDate, setIncomeDate] = useState(getTodayIso());
  const [incomeFormReason, setIncomeFormReason] = useState<'LOW_FUNDS' | 'NEW_WALLET'>('LOW_FUNDS');
  const [showIncomeDatePicker, setShowIncomeDatePicker] = useState(false);
  const [showIncomeCategoryDropdown, setShowIncomeCategoryDropdown] = useState(false);
  const [incomeCategorySearch, setIncomeCategorySearch] = useState('');
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [incomeFormError, setIncomeFormError] = useState<string | null>(null);

  // Splits a CSV line handling quoted values with commas
  const splitCsvLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^["']|["']$/g, ''));
    return values;
  };

  // Month name lookup for bank statement date formats (e.g. 15-Oct-2024, 15 Oct 2024)
  const MONTHS: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };

  // Normalizes dates (e.g. YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-Mon-YYYY)
  const normalizeDate = (raw: string): string => {
    if (!raw) return getTodayIso();
    const clean = raw.trim().replace(/^["']|["']$/g, '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

    const parts = clean.split(/[/\-\s,]+/).filter(Boolean);
    if (parts.length >= 3) {
      let day: number | null = null;
      let month: string | null = null;
      let year: number | null = null;

      for (const p of parts) {
        if (/^\d{4}$/.test(p)) {
          year = parseInt(p, 10);
        } else if (MONTHS[p.toLowerCase().slice(0, 3)]) {
          month = MONTHS[p.toLowerCase().slice(0, 3)];
        }
      }

      if (year) {
        const nonYears = parts.filter((p) => !/^\d{4}$/.test(p));
        if (month) {
          const numPart = nonYears.find((p) => !MONTHS[p.toLowerCase().slice(0, 3)] && !isNaN(Number(p)));
          if (numPart) day = parseInt(numPart, 10);
        } else if (nonYears.length >= 2) {
          const n1 = parseInt(nonYears[0], 10);
          const n2 = parseInt(nonYears[1], 10);
          if (!isNaN(n1) && !isNaN(n2)) {
            if (n1 > 12) {
              day = n1;
              month = String(n2).padStart(2, '0');
            } else if (n2 > 12) {
              day = n2;
              month = String(n1).padStart(2, '0');
            } else {
              day = n1;
              month = String(n2).padStart(2, '0');
            }
          }
        }
      }

      if (year && month && day && !isNaN(day)) {
        return `${year}-${month}-${String(day).padStart(2, '0')}`;
      }
    }

    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return getTodayIso();
  };

  // Pick CSV Document
  const handlePickDocument = async () => {
    try {
      setError(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/comma-separated-values',
          'text/plain',
          'application/vnd.ms-excel',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setFileName(file.name);

        let content = '';
        if (Platform.OS === 'web') {
          if ((file as any).file && typeof (file as any).file.text === 'function') {
            content = await (file as any).file.text();
          } else {
            const res = await fetch(file.uri);
            content = await res.text();
          }
        } else {
          try {
            content = await FileSystem.readAsStringAsync(file.uri, {
              encoding: 'utf8',
            });
          } catch {
            try {
              const res = await fetch(file.uri);
              content = await res.text();
            } catch {
              if ((file as any).file && typeof (file as any).file.text === 'function') {
                content = await (file as any).file.text();
              } else {
                throw new Error('Unable to read chosen file. Please select a valid CSV file.');
              }
            }
          }
        }

        if (!content || content.trim().length === 0) {
          setError('The selected file is empty.');
          return;
        }

        parseCsvString(content, file.name);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to open file.');
    }
  };

  // Parse CSV string into Transaction items with smart header detection
  const parseCsvString = (text: string, currentFileName?: string) => {
    const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (rawLines.length < 2) {
      setError('CSV file appears to be empty or missing headers.');
      return;
    }

    // Smart header finder: search first 10 rows for columns like date, amount, debit, credit
    let headerIdx = -1;
    let headers: string[] = [];
    for (let i = 0; i < Math.min(rawLines.length, 10); i++) {
      const candidateHeaders = splitCsvLine(rawLines[i]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const hasAmount = candidateHeaders.some((h) =>
        h.includes('amount') || h.includes('amt') || h.includes('total') || h.includes('value') ||
        h.includes('debit') || h.includes('credit') || h === 'dr' || h === 'cr'
      );
      const hasDate = candidateHeaders.some((h) =>
        h.includes('date') || h.includes('time') || h.includes('spent') || h.includes('txn')
      );
      if (hasAmount || hasDate) {
        headerIdx = i;
        headers = candidateHeaders;
        break;
      }
    }

    if (headerIdx === -1) {
      headerIdx = 0;
      headers = splitCsvLine(rawLines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }

    const dateIdx = headers.findIndex((h) => h.includes('date') || h.includes('time') || h.includes('spent') || h.includes('txn'));
    const amountIdx = headers.findIndex(
      (h) => h.includes('amount') || h.includes('amt') || h.includes('total') || h.includes('value')
    );
    const debitIdx = headers.findIndex((h) => h.includes('debit') || h === 'dr' || h.includes('withdrawal'));
    const creditIdx = headers.findIndex((h) => h.includes('credit') || h === 'cr' || h.includes('deposit'));
    const noteIdx = headers.findIndex(
      (h) =>
        h.includes('note') ||
        h.includes('desc') ||
        h.includes('title') ||
        h.includes('narration') ||
        h.includes('particulars')
    );
    const catIdx = headers.findIndex((h) => h.includes('cat') || h.includes('tag'));
    const typeIdx = headers.findIndex((h) => h.includes('type'));
    const walletIdx = headers.findIndex(
      (h) =>
        h.includes('wallet') ||
        h.includes('account') ||
        h.includes('bank') ||
        h.includes('method') ||
        h.includes('source') ||
        h.includes('mode')
    );

    const items: ParsedImportRow[] = [];
    const isIncomeFile = (currentFileName || '').toLowerCase().includes('income');

    for (let i = headerIdx + 1; i < rawLines.length; i++) {
      const cols = splitCsvLine(rawLines[i]);
      if (cols.length <= 1) continue;

      let amtVal = 0;
      let typeVal: 'income' | 'expense' = isIncomeFile ? 'income' : 'expense';

      // 1. Debit/Credit columns
      if (debitIdx !== -1 && cols[debitIdx] && !isNaN(parseFloat(cols[debitIdx].replace(/,/g, '')))) {
        const d = parseFloat(cols[debitIdx].replace(/,/g, ''));
        if (d > 0) {
          amtVal = d;
          typeVal = 'expense';
        }
      }
      if (creditIdx !== -1 && cols[creditIdx] && !isNaN(parseFloat(cols[creditIdx].replace(/,/g, '')))) {
        const c = parseFloat(cols[creditIdx].replace(/,/g, ''));
        if (c > 0) {
          amtVal = c;
          typeVal = 'income';
        }
      }

      // 2. Standard Amount column
      if (amtVal === 0 && amountIdx !== -1 && cols[amountIdx]) {
        const rawAmt = parseFloat(cols[amountIdx].replace(/,/g, ''));
        if (!isNaN(rawAmt)) {
          if (rawAmt < 0) {
            amtVal = Math.abs(rawAmt);
            typeVal = 'expense';
          } else {
            amtVal = rawAmt;
            if (typeIdx !== -1 && cols[typeIdx]) {
              typeVal = cols[typeIdx].toLowerCase().includes('inc') ? 'income' : 'expense';
            } else if (isIncomeFile) {
              typeVal = 'income';
            }
          }
        }
      }

      // 3. Fallback: check 2nd column
      if (amtVal === 0 && cols[1]) {
        const fallbackAmt = parseFloat(cols[1].replace(/,/g, ''));
        if (!isNaN(fallbackAmt) && fallbackAmt > 0) {
          amtVal = fallbackAmt;
        }
      }

      if (amtVal <= 0) continue;

      const dateVal =
        dateIdx !== -1 && cols[dateIdx] ? normalizeDate(cols[dateIdx]) : getTodayIso();
      const noteVal =
        noteIdx !== -1 && cols[noteIdx]
          ? cols[noteIdx]
          : typeVal === 'income'
          ? 'Income Deposit'
          : 'Bank Expense';
      const catVal =
        catIdx !== -1 && cols[catIdx] ? cols[catIdx] : typeVal === 'income' ? 'Salary' : 'Other';

      let rawWalletName = '';
      if (walletIdx !== -1 && cols[walletIdx] && cols[walletIdx].trim()) {
        rawWalletName = cols[walletIdx].trim().replace(/^(wallet|account|bank)\s*:\s*/i, '');
      }

      items.push({
        id: `row-${i}-${Date.now()}`,
        type: typeVal,
        amount: amtVal,
        category: catVal,
        note: noteVal,
        date: dateVal,
        rawWalletName,
      });
    }

    if (items.length === 0) {
      setError(
        'Could not identify transactions in the CSV. Please ensure columns include Date, Amount, and Note/Description.'
      );
    } else {
      setParsedRows(items);
    }
  };

  // ---------------------------------------------------------------------------
  // Sequential Running Balance Evaluation Engine:
  // Processes rows in chronological/statement order.
  // - Starts with current wallet balance.
  // - Deducts expenses sequentially.
  // - If a wallet name does not exist in the app, flags it as isNewWallet.
  // - If an expense exceeds remaining balance, flags isInsufficientFunds.
  // ---------------------------------------------------------------------------
  const evaluatedRows = useMemo<EvaluatedRow[]>(() => {
    if (parsedRows.length === 0) return [];

    const runningBalances: Record<number, number> = {};
    wallets.forEach((w) => {
      runningBalances[w.id] = Number(w.current_balance ?? w.balance ?? w.initial_balance ?? 0);
    });

    return parsedRows.map((row) => {
      const rawWalletTrimmed = (row.rawWalletName || '').trim();
      let matchedW: Wallet | undefined;

      if (rawWalletTrimmed) {
        matchedW = wallets.find(
          (w) =>
            w.name.toLowerCase() === rawWalletTrimmed.toLowerCase() ||
            String(w.id) === rawWalletTrimmed
        );
      } else {
        // Only fallback to selected default wallet if row did NOT specify a wallet
        matchedW =
          (targetWalletId ? wallets.find((w) => w.id === targetWalletId) : null) ||
          wallets[0];
      }

      // If a wallet was explicitly in the row, but does not match any existing wallet in the app:
      const isNewWallet = Boolean(rawWalletTrimmed && !matchedW);
      const targetWId = matchedW?.id ?? null;
      const targetWName = matchedW ? matchedW.name : rawWalletTrimmed || 'Unassigned';

      let canRecord = false;
      let isInsufficientFunds = false;
      let shortage = 0;
      let availableBefore = 0;
      let balanceAfter = 0;

      if (isNewWallet) {
        // The wallet does not exist in the app yet. Cannot record until created.
        canRecord = false;
        availableBefore = 0;
        balanceAfter = 0;
        if (row.type === 'expense') {
          isInsufficientFunds = true;
          shortage = row.amount;
        }
      } else if (matchedW && targetWId !== null) {
        if (!(targetWId in runningBalances)) {
          runningBalances[targetWId] = Number(
            matchedW.current_balance ?? matchedW.balance ?? matchedW.initial_balance ?? 0
          );
        }
        availableBefore = runningBalances[targetWId];

        if (row.type === 'income') {
          runningBalances[targetWId] = availableBefore + row.amount;
          balanceAfter = runningBalances[targetWId];
          canRecord = true;
        } else {
          // Expense: check against remaining running balance
          if (row.amount <= availableBefore) {
            runningBalances[targetWId] = availableBefore - row.amount;
            balanceAfter = runningBalances[targetWId];
            canRecord = true;
          } else {
            // Insufficient funds! Exceeds available balance.
            // Wallet balance stays untouched so it will NOT go negative!
            canRecord = false;
            isInsufficientFunds = true;
            shortage = row.amount - availableBefore;
            balanceAfter = availableBefore;
          }
        }
      }

      return {
        ...row,
        targetWalletId: targetWId,
        targetWalletName: targetWName,
        canRecord,
        isNewWallet,
        isInsufficientFunds,
        availableBalanceBefore: availableBefore,
        balanceAfter,
        shortage,
      };
    });
  }, [parsedRows, wallets, targetWalletId]);

  const { recordableRows, insufficientFundRows, newWalletRows, totalShortage } = useMemo(() => {
    const recordable = evaluatedRows.filter((r) => r.canRecord);
    const insufficient = evaluatedRows.filter((r) => r.isInsufficientFunds);
    const newWallets = evaluatedRows.filter((r) => r.isNewWallet);
    const totalShort = insufficient.reduce((sum, r) => sum + r.shortage, 0);
    return {
      recordableRows: recordable,
      insufficientFundRows: insufficient,
      newWalletRows: newWallets,
      totalShortage: totalShort,
    };
  }, [evaluatedRows]);

  const walletIssues = useMemo<WalletIssue[]>(() => {
    if (parsedRows.length === 0) return [];

    const issues: WalletIssue[] = [];

    // 1. Group new wallet rows (wallets that don't exist in the app)
    const newWalletGroups: Record<string, EvaluatedRow[]> = {};
    newWalletRows.forEach((r) => {
      const wName = (r.rawWalletName || r.targetWalletName || '').trim();
      if (!newWalletGroups[wName]) newWalletGroups[wName] = [];
      newWalletGroups[wName].push(r);
    });

    Object.keys(newWalletGroups).forEach((wName) => {
      const rows = newWalletGroups[wName];
      const totalInc = rows.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0);
      const totalExp = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
      const hasExpense = totalExp > 0;

      issues.push({
        id: `issue-${wName}-new`,
        type: hasExpense ? 'NEW_WALLET_EXPENSE' : 'NEW_WALLET_INCOME',
        walletName: wName,
        currentBalance: 0,
        totalIncomeInBatch: totalInc,
        totalExpenseInBatch: totalExp,
        shortageAmount: Math.max(0, totalExp - totalInc),
      });
    });

    // 2. Group existing wallet low funds (wallets that already exist but don't have enough money)
    const lowFundByWallet: Record<string, EvaluatedRow[]> = {};
    insufficientFundRows.forEach((r) => {
      if (r.isNewWallet) return;
      const wName = r.targetWalletName;
      if (!lowFundByWallet[wName]) lowFundByWallet[wName] = [];
      lowFundByWallet[wName].push(r);
    });

    Object.keys(lowFundByWallet).forEach((wName) => {
      const rows = lowFundByWallet[wName];
      const maxShortage = Math.max(...rows.map((r) => r.shortage));
      const targetW =
        wallets.find((w) => w.id === rows[0]?.targetWalletId) ||
        wallets.find((w) => w.name.toLowerCase() === wName.toLowerCase());
      const currentBal = Number(targetW?.current_balance ?? targetW?.balance ?? 0);
      const totalExp = rows.reduce((s, r) => s + r.amount, 0);

      issues.push({
        id: `issue-${wName}-low-funds`,
        type: 'LOW_FUNDS',
        walletName: wName,
        matchedWallet: targetW,
        currentBalance: currentBal,
        totalIncomeInBatch: 0,
        totalExpenseInBatch: totalExp,
        shortageAmount: maxShortage,
      });
    });

    return issues;
  }, [parsedRows, wallets, insufficientFundRows, newWalletRows]);

  // ---------------------------------------------------------------------------
  // Action: Open Income Form when low funds are detected for an existing wallet
  // ---------------------------------------------------------------------------
  const handleOpenIncomeFormForExistingWallet = (issue: WalletIssue) => {
    const targetW =
      wallets.find((w) => w.name.toLowerCase() === issue.walletName.toLowerCase()) ||
      issue.matchedWallet;

    setIncomeFormWallet(targetW || null);
    setIncomeFormWalletName(issue.walletName);
    setIncomeMinRequired(issue.shortageAmount);
    setIncomeAmount(String(Math.ceil(issue.shortageAmount)));
    setIncomeCategory('Salary');
    setIncomeNote(`Deposit to cover ${issue.walletName} expense`);
    setIncomeDate(getTodayIso());
    setIncomeFormReason('LOW_FUNDS');
    setIncomeFormError(null);
    setShowIncomeForm(true);
  };

  // ---------------------------------------------------------------------------
  // Action: Handle New Wallet Flow (Income or 2-Step Expense Requirement)
  // ---------------------------------------------------------------------------
  const handleOpenNewWalletFlow = (issue: WalletIssue) => {
    if (issue.type === 'NEW_WALLET_INCOME') {
      // Income-only new wallet: Prompt user if they want to create the new wallet
      showAlert({
        type: 'confirm',
        icon: 'wallet-outline',
        title: 'New Wallet Detected',
        subtitle: issue.walletName,
        message: `The imported data has a wallet named "${issue.walletName}" that does not exist in the app.\n\nDo you want to create a new wallet for that?`,
        secondaryButton: {
          text: 'Cancel',
          onPress: closeAlert,
        },
        primaryButton: {
          text: 'Yes, Create Wallet',
          variant: 'primary',
          onPress: async () => {
            closeAlert();
            try {
              setLoading(true);
              await createWallet({
                name: issue.walletName,
                wallet_type: 'BANK',
                initial_balance: 0,
                color: '#10b981',
              });
              await refreshAll();
              showAlert({
                type: 'success',
                icon: 'checkmark-circle',
                title: 'Wallet Created',
                subtitle: issue.walletName,
                message: `Wallet "${issue.walletName}" has been created in your app and database! The incoming transaction (+${formatCurrency(issue.totalIncomeInBatch, currency)}) will now be deposited directly into it.`,
                primaryButton: {
                  text: 'OK',
                  variant: 'primary',
                  onPress: closeAlert,
                },
              });
            } catch (err: any) {
              showAlert({
                type: 'danger',
                title: 'Error',
                message: err?.message || 'Failed to create new wallet',
                primaryButton: { text: 'OK', onPress: closeAlert },
              });
            } finally {
              setLoading(false);
            }
          },
        },
      });
    } else {
      // New Wallet with Expense: Requires 2 Requirements:
      // Requirement 1: Prompt user to create new wallet (initial balance 0 cash).
      // Requirement 2: Detect 0 cash, alert low funds ("Did you forget to add the income?"),
      // and pop up the Income Form to deposit funds before recording the expense!
      showAlert({
        type: 'warning',
        icon: 'wallet-outline',
        title: 'New Wallet Detected',
        subtitle: `Requirement 1 of 2: ${issue.walletName}`,
        message: `This is a new wallet "${issue.walletName}" that doesn't exist in the app wallets.\n\nDo you want to create a new wallet for this record?\n\nNote: Newly created wallets start with 0 cash, so an income will be required to cover the statement expenses.`,
        secondaryButton: {
          text: 'Cancel',
          onPress: closeAlert,
        },
        primaryButton: {
          text: 'Yes, Create Wallet',
          variant: 'primary',
          onPress: async () => {
            closeAlert();
            try {
              setLoading(true);
              const newW = await createWallet({
                name: issue.walletName,
                wallet_type: 'BANK',
                initial_balance: 0,
                color: '#10b981',
              });
              await refreshAll();

              // Requirement 2: Immediately pop up the Income Form with "Did you forget to add the income?"
              const minNeeded = issue.shortageAmount > 0 ? issue.shortageAmount : issue.totalExpenseInBatch;
              setIncomeFormWallet(newW);
              setIncomeFormWalletName(issue.walletName);
              setIncomeMinRequired(minNeeded);
              setIncomeAmount(String(Math.ceil(minNeeded)));
              setIncomeCategory('Salary');
              setIncomeNote(`Opening Income Deposit for ${issue.walletName}`);
              setIncomeDate(getTodayIso());
              setIncomeFormReason('NEW_WALLET');
              setIncomeFormError(null);
              setShowIncomeForm(true);
            } catch (err: any) {
              showAlert({
                type: 'danger',
                title: 'Error',
                message: err?.message || 'Failed to create new wallet',
                primaryButton: { text: 'OK', onPress: closeAlert },
              });
            } finally {
              setLoading(false);
            }
          },
        },
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Submit Income Form: Records the Income transaction into the ledger
  // ---------------------------------------------------------------------------
  const handleSubmitIncomeForm = async () => {
    const numAmt = parseFloat(incomeAmount);

    if (isNaN(numAmt) || numAmt <= 0) {
      setIncomeFormError('Please enter a valid amount greater than 0.');
      return;
    }

    if (numAmt < incomeMinRequired) {
      setIncomeFormError(
        `Income amount must be at least ${formatCurrency(incomeMinRequired, currency)} to cover the low fund expense.`
      );
      return;
    }

    // Resolve target wallet
    const targetW =
      incomeFormWallet ||
      wallets.find((w) => w.name.toLowerCase() === incomeFormWalletName.toLowerCase()) ||
      wallets[0];

    if (!targetW) {
      setIncomeFormError('Target wallet not found. Please create the wallet first.');
      return;
    }

    setIncomeLoading(true);
    setIncomeFormError(null);

    try {
      // Record the income transaction directly into the database / transaction ledger
      await createTransaction({
        type: 'income',
        amount: numAmt,
        category: incomeCategory,
        note: incomeNote.trim() || `Income deposit to ${targetW.name}`,
        date: incomeDate,
        wallet_id: targetW.id,
      });

      // Synchronize latest balances and transactions
      await refreshAll();

      setShowIncomeForm(false);
      showAlert({
        type: 'success',
        icon: 'checkmark-circle',
        title: 'Income Transaction Added!',
        subtitle: `Deposit to ${targetW.name}`,
        message: `Successfully recorded +${formatCurrency(numAmt, currency)} to "${targetW.name}" in your transactions! The wallet now has sufficient funds for your statement expenses.`,
        primaryButton: {
          text: 'Continue Import',
          variant: 'success',
          onPress: closeAlert,
        },
      });
    } catch (err: any) {
      setIncomeFormError(err?.message || 'Failed to record income transaction.');
    } finally {
      setIncomeLoading(false);
    }
  };

  // Submit Bulk Import to Backend
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;

    // Check 1: If there are unresolved new wallets, prompt user to create them first!
    if (newWalletRows.length > 0) {
      const firstNew = newWalletRows[0];
      const issue = walletIssues.find((i) => i.walletName === firstNew.rawWalletName) || walletIssues[0];
      showAlert({
        type: 'warning',
        icon: 'wallet-outline',
        title: 'Action Required: New Wallet',
        subtitle: firstNew.rawWalletName || firstNew.targetWalletName,
        message: `The imported data has a wallet named "${firstNew.rawWalletName || firstNew.targetWalletName}" that doesn't exist in your app wallets.\n\nDo you want to create a new wallet for this record first?`,
        secondaryButton: {
          text: 'Cancel',
          onPress: closeAlert,
        },
        primaryButton: {
          text: 'Create New Wallet',
          variant: 'primary',
          onPress: () => {
            closeAlert();
            if (issue) handleOpenNewWalletFlow(issue);
          },
        },
      });
      return;
    }

    // Check 2: If no transactions are recordable due to low funds
    if (recordableRows.length === 0) {
      if (insufficientFundRows.length > 0) {
        const first = insufficientFundRows[0];
        showAlert({
          type: 'danger',
          icon: 'alert-circle',
          title: 'Low Funds Alert',
          subtitle: `Wallet: ${first.targetWalletName}`,
          message: `Cannot record transaction(s) because wallet "${first.targetWalletName}" only has ${formatCurrency(first.availableBalanceBefore, currency)} available (needs ${formatCurrency(first.amount, currency)}).\n\nDid you forget to add the income? Please add income first so your balance won't drop below 0.`,
          secondaryButton: {
            text: 'Cancel',
            onPress: closeAlert,
          },
          primaryButton: {
            text: 'Add Income Now',
            variant: 'success',
            onPress: () => {
              closeAlert();
              const issue = walletIssues.find((i) => i.walletName === first.targetWalletName);
              if (issue) {
                handleOpenIncomeFormForExistingWallet(issue);
              } else {
                const targetW = wallets.find((w) => w.id === first.targetWalletId) || wallets[0];
                setIncomeFormWallet(targetW || null);
                setIncomeFormWalletName(first.targetWalletName);
                setIncomeMinRequired(first.shortage);
                setIncomeAmount(String(Math.ceil(first.shortage)));
                setIncomeCategory('Salary');
                setIncomeNote(`Deposit to cover ${first.targetWalletName} expenses`);
                setIncomeDate(getTodayIso());
                setIncomeFormReason('LOW_FUNDS');
                setIncomeFormError(null);
                setShowIncomeForm(true);
              }
            },
          },
        });
      } else {
        showAlert({
          type: 'warning',
          title: 'Cannot Import',
          message: 'No valid transactions found to record.',
          primaryButton: { text: 'OK', onPress: closeAlert },
        });
      }
      return;
    }

    // Check 3: If some rows will be skipped due to insufficient funds, prompt user
    if (insufficientFundRows.length > 0) {
      showAlert({
        type: 'confirm',
        icon: 'document-text-outline',
        title: 'Import Valid Transactions?',
        message: `${recordableRows.length} of ${evaluatedRows.length} transactions will be recorded.\n\n${insufficientFundRows.length} transaction(s) cannot be recorded because wallet funds are insufficient (preventing your wallet balance from going under 0).\n\nDid you forget to add the income? You can add income now or proceed to import the ${recordableRows.length} valid transaction(s).`,
        secondaryButton: {
          text: 'Add Income First',
          onPress: () => {
            closeAlert();
            const first = insufficientFundRows[0];
            const issue = walletIssues.find((i) => i.walletName === first.targetWalletName);
            if (issue) {
              handleOpenIncomeFormForExistingWallet(issue);
            } else {
              const targetW = wallets.find((w) => w.id === first.targetWalletId) || wallets[0];
              setIncomeFormWallet(targetW || null);
              setIncomeFormWalletName(first.targetWalletName);
              setIncomeMinRequired(first.shortage);
              setIncomeAmount(String(Math.ceil(first.shortage)));
              setIncomeCategory('Salary');
              setIncomeNote(`Deposit to cover ${first.targetWalletName} expenses`);
              setIncomeDate(getTodayIso());
              setIncomeFormReason('LOW_FUNDS');
              setIncomeFormError(null);
              setShowIncomeForm(true);
            }
          },
        },
        primaryButton: {
          text: `Import ${recordableRows.length} Transactions`,
          variant: 'primary',
          onPress: () => {
            closeAlert();
            executeBulkImport(recordableRows);
          },
        },
      });
      return;
    }

    // All rows are recordable
    executeBulkImport(recordableRows);
  };

  const executeBulkImport = async (rowsToSave: EvaluatedRow[]) => {
    setLoading(true);
    setError(null);

    try {
      const rowsToImport: TransactionCreateInput[] = rowsToSave.map((r) => ({
        type: r.type,
        amount: r.amount,
        category: r.category,
        note: r.note,
        date: r.date,
        wallet_id: r.targetWalletId,
      }));

      const res = await api.transactions.bulkImport(rowsToImport);
      await refreshAll();

      let msg = `Successfully imported ${res.imported} transaction(s) into your ledger.`;
      if (insufficientFundRows.length > 0) {
        msg += `\n\n${insufficientFundRows.length} transaction(s) were skipped to prevent your wallet from going under 0.`;
      }

      showAlert({
        type: 'success',
        icon: 'checkmark-done-circle',
        title: 'Import Successful',
        message: msg,
        primaryButton: {
          text: 'View Ledger',
          variant: 'primary',
          onPress: () => {
            closeAlert();
            router.back();
          },
        },
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to import transactions.');
    } finally {
      setLoading(false);
    }
  };

  // Selected Income Category Object for Drop Box
  const selectedIncomeCategoryObj =
    INCOME_CATEGORIES.find((c) => c.name.toLowerCase() === incomeCategory.toLowerCase()) ||
    INCOME_CATEGORIES[0];

  const filteredIncomeCategories = INCOME_CATEGORIES.filter((c) =>
    c.name.toLowerCase().includes(incomeCategorySearch.toLowerCase().trim())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Hero Card */}
        <View style={[styles.headerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.iconBox, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="document-text-outline" size={24} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Import Bank Statement</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Upload a CSV statement to verify wallets, check funds, and import transactions into Pocket Ledger.
          </Text>
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}>
            <Ionicons name="alert-circle" size={18} color={theme.danger} style={{ marginRight: 6 }} />
            <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
          </View>
        ) : null}

        {/* Upload Trigger Area */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handlePickDocument}
          style={[styles.pickerArea, { borderColor: theme.primary, backgroundColor: theme.surface }]}
        >
          <Ionicons name="cloud-upload-outline" size={38} color={theme.primary} />
          <Text style={[styles.pickerText, { color: theme.text }]}>
            {fileName ? fileName : 'Tap to select CSV file from device'}
          </Text>
          <Text style={[styles.pickerSub, { color: theme.textMuted }]}>
            Supports Bank & Ledger CSVs (Date, Amount, Note, Category, Wallet)
          </Text>
        </TouchableOpacity>

        {/* Target Wallet Selection if CSV doesn't have wallet column */}
        {parsedRows.length > 0 && wallets.length > 0 && parsedRows.some((r) => !r.rawWalletName) ? (
          <View style={[styles.targetWalletSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.targetWalletLabel, { color: theme.textSecondary }]}>
              Default Wallet (for rows without specified wallet):
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {wallets.map((w) => {
                const isSelected = targetWalletId === w.id;
                return (
                  <TouchableOpacity
                    key={w.id}
                    activeOpacity={0.7}
                    onPress={() => setTargetWalletId(w.id)}
                    style={[
                      styles.walletSelectChip,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.surfaceMuted,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.walletSelectChipText,
                        { color: isSelected ? '#ffffff' : theme.text },
                      ]}
                    >
                      {w.name} ({formatCurrency(w.current_balance ?? w.balance ?? 0, currency)})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* -------------------------------------------------------------------
            Wallet Requirements & Issues Action Cards
            ------------------------------------------------------------------- */}
        {parsedRows.length > 0 ? (
          <View style={{ marginTop: Spacing.lg }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeading, { color: theme.text }]}>
                Sequential Balance & Requirements Check
              </Text>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      insufficientFundRows.length === 0 && newWalletRows.length === 0
                        ? theme.successSoft
                        : theme.warningSoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color:
                        insufficientFundRows.length === 0 && newWalletRows.length === 0
                          ? theme.success
                          : theme.warning,
                    },
                  ]}
                >
                  {insufficientFundRows.length === 0 && newWalletRows.length === 0
                    ? `✓ All ${recordableRows.length} Ready to Record`
                    : newWalletRows.length > 0
                    ? `${newWalletRows.length} New Wallet • ${insufficientFundRows.length} Low Funds`
                    : `${recordableRows.length} Ready • ${insufficientFundRows.length} Low Funds`}
                </Text>
              </View>
            </View>

            {walletIssues.length > 0 ? (
              <View style={{ gap: Spacing.sm }}>
                {walletIssues.map((issue) => {
                  const isNewWalletIncome = issue.type === 'NEW_WALLET_INCOME';
                  const isNewWalletExpense = issue.type === 'NEW_WALLET_EXPENSE';
                  const isLowFunds = issue.type === 'LOW_FUNDS';

                  return (
                    <View
                      key={issue.id}
                      style={[
                        styles.issueCard,
                        {
                          backgroundColor: theme.surface,
                          borderColor: isLowFunds ? theme.danger : theme.warning,
                        },
                      ]}
                    >
                      <View style={styles.issueHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <Ionicons
                            name={isLowFunds ? 'alert-circle' : 'wallet'}
                            size={18}
                            color={isLowFunds ? theme.danger : theme.warning}
                          />
                          <Text style={[styles.issueTitle, { color: theme.text }]} numberOfLines={1}>
                            {isNewWalletIncome
                              ? `New Wallet: "${issue.walletName}"`
                              : isNewWalletExpense
                              ? `New Wallet with Expense: "${issue.walletName}"`
                              : `Low Fund Alert: "${issue.walletName}"`}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: isLowFunds ? theme.dangerSoft : theme.warningSoft },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              { color: isLowFunds ? theme.danger : theme.warning },
                            ]}
                          >
                            {isNewWalletIncome ? 'Create Wallet' : isNewWalletExpense ? '2 Requirements' : 'Add Income'}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.issueDescription, { color: theme.textSecondary }]}>
                        {isNewWalletIncome
                          ? `The imported data has a wallet named "${issue.walletName}" that does not exist in the app. Do you want to create a new wallet for that? (Income: +${formatCurrency(issue.totalIncomeInBatch, currency)})`
                          : isNewWalletExpense
                          ? `This is a new wallet that doesn't exist in the app wallet. Do you want to create a new wallet for this record?\n\nNote: Newly created wallets start with ₹0 cash, so an income will be required to cover the statement expenses.`
                          : `Wallet "${issue.walletName}" has low funds (${formatCurrency(issue.currentBalance, currency)} available, needs ${formatCurrency(issue.shortageAmount, currency)} more). Did you forget to add the income?`}
                      </Text>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          if (isLowFunds) {
                            handleOpenIncomeFormForExistingWallet(issue);
                          } else {
                            handleOpenNewWalletFlow(issue);
                          }
                        }}
                        style={[
                          styles.issueActionBtn,
                          {
                            backgroundColor: isLowFunds ? theme.danger : theme.primary,
                          },
                        ]}
                      >
                        <Ionicons
                          name={isNewWalletIncome ? 'add-circle-outline' : isNewWalletExpense ? 'wallet-outline' : 'cash-outline'}
                          size={16}
                          color="#ffffff"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.issueActionBtnText}>
                          {isNewWalletIncome
                            ? `Create New Wallet "${issue.walletName}"`
                            : isNewWalletExpense
                            ? `Requirement 1: Create Wallet "${issue.walletName}"`
                            : `Add Income (+${formatCurrency(issue.shortageAmount, currency)})`}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View
                style={[
                  styles.verifiedBanner,
                  { backgroundColor: theme.successSoft, borderColor: theme.success },
                ]}
              >
                <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.verifiedBannerTitle, { color: theme.success }]}>
                    All Wallets & Funds Verified
                  </Text>
                  <Text style={[styles.verifiedBannerText, { color: theme.textSecondary }]}>
                    All transactions match existing wallets and stay within available balances. You can proceed with import.
                  </Text>
                </View>
              </View>
            )}

            {/* Statement Preview Header */}
            <View style={[styles.sectionHeaderRow, { marginTop: Spacing.xl }]}>
              <Text style={[styles.sectionHeading, { color: theme.text }]}>
                Statement Preview ({evaluatedRows.length} Rows)
              </Text>
              <Text style={[styles.previewSubtext, { color: theme.textMuted }]}>
                {evaluatedRows.filter((r) => r.type === 'income').length} Incomes •{' '}
                {evaluatedRows.filter((r) => r.type === 'expense').length} Expenses
              </Text>
            </View>

            {/* Rows Preview List */}
            {evaluatedRows.slice(0, 10).map((row, idx) => {
              return (
                <View
                  key={`preview-${idx}`}
                  style={[
                    styles.previewItem,
                    {
                      backgroundColor: theme.surface,
                      borderColor: row.isNewWallet
                        ? theme.warning
                        : row.isInsufficientFunds
                        ? theme.danger
                        : theme.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.previewNote, { color: theme.text }]} numberOfLines={1}>
                        {row.note}
                      </Text>
                      {row.isNewWallet ? (
                        <View style={[styles.miniBadge, { backgroundColor: theme.warningSoft }]}>
                          <Text style={[styles.miniBadgeText, { color: theme.warning }]}>New Wallet</Text>
                        </View>
                      ) : row.isInsufficientFunds ? (
                        <View style={[styles.miniBadge, { backgroundColor: theme.dangerSoft }]}>
                          <Text style={[styles.miniBadgeText, { color: theme.danger }]}>
                            Low Funds (Avail: {formatCurrency(row.availableBalanceBefore, currency)})
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.miniBadge, { backgroundColor: theme.successSoft }]}>
                          <Text style={[styles.miniBadgeText, { color: theme.success }]}>
                            ✓ Will Record (Bal: {formatCurrency(row.balanceAfter, currency)})
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.previewMeta, { color: theme.textMuted }]}>
                      {row.date} • {row.category} • Wallet: {row.targetWalletName}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.previewAmount,
                      { color: row.type === 'income' ? theme.success : theme.danger },
                    ]}
                  >
                    {row.type === 'income' ? '+' : '-'}
                    {formatCurrency(row.amount, currency)}
                  </Text>
                </View>
              );
            })}

            {evaluatedRows.length > 10 ? (
              <Text style={[styles.moreText, { color: theme.textMuted }]}>
                ... and {evaluatedRows.length - 10} more transactions in statement
              </Text>
            ) : null}

            {/* Confirm & Import Action Button */}
            <Button
              title={
                newWalletRows.length > 0
                  ? `Action Required: Create Wallet "${newWalletRows[0].targetWalletName}"`
                  : insufficientFundRows.length > 0 && recordableRows.length === 0
                  ? 'Add Income to Record Transactions'
                  : recordableRows.length === 0
                  ? 'No Transactions Can Be Recorded'
                  : insufficientFundRows.length > 0
                  ? `Import ${recordableRows.length} Valid Transaction${recordableRows.length > 1 ? 's' : ''} (${insufficientFundRows.length} low funds skipped)`
                  : `Confirm & Import ${recordableRows.length} Transactions`
              }
              onPress={handleConfirmImport}
              loading={loading}
              disabled={recordableRows.length === 0 && newWalletRows.length === 0 && insufficientFundRows.length === 0}
              variant={recordableRows.length === 0 ? 'secondary' : 'primary'}
              size="lg"
              style={{ marginTop: Spacing.lg }}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* ---------------------------------------------------------------------
          Interactive Pop-up Income Form Modal
          Pops up when imported data has low funds so the user can enter and
          add the income transaction directly into the ledger!
          --------------------------------------------------------------------- */}
      <Modal
        visible={showIncomeForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIncomeForm(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowIncomeForm(false)}
          />

          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.modalIconBox, { backgroundColor: theme.successSoft }]}>
                  <Ionicons name="arrow-down-circle" size={22} color={theme.success} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Add Income Transaction</Text>
                  <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                    Deposit to {incomeFormWalletName}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowIncomeForm(false)}
                style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceMuted }]}
              >
                <Ionicons name="close" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.incomeFormBody}>
              {/* Context Banner */}
              <View
                style={[
                  styles.promptHighlightBox,
                  {
                    backgroundColor: incomeFormReason === 'NEW_WALLET' ? theme.primarySoft : theme.warningSoft,
                    borderColor: incomeFormReason === 'NEW_WALLET' ? theme.primary : theme.warning,
                  },
                ]}
              >
                <Ionicons
                  name={incomeFormReason === 'NEW_WALLET' ? 'help-circle' : 'alert-circle'}
                  size={20}
                  color={incomeFormReason === 'NEW_WALLET' ? theme.primary : theme.warning}
                  style={{ marginTop: 2 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.promptHighlightText, { color: theme.text }]}>
                    Did you forget to add the income?
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                    {incomeFormReason === 'NEW_WALLET'
                      ? `The newly created wallet "${incomeFormWalletName}" has 0 cash. Please add an income of at least `
                      : `Wallet "${incomeFormWalletName}" has insufficient funds. Please add an income of at least `}
                    <Text style={{ fontWeight: Typography.weights.bold, color: theme.danger }}>
                      {formatCurrency(incomeMinRequired, currency)}
                    </Text>{' '}
                    to cover your statement expense so the transaction can be recorded.
                  </Text>
                </View>
              </View>

              {incomeFormError ? (
                <View style={[styles.resolutionErrorBox, { backgroundColor: theme.dangerSoft }]}>
                  <Ionicons name="alert-circle" size={16} color={theme.danger} style={{ marginRight: 6 }} />
                  <Text style={[styles.resolutionErrorText, { color: theme.danger }]}>{incomeFormError}</Text>
                </View>
              ) : null}

              {/* 1. Amount Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputFieldLabel, { color: theme.textSecondary }]}>
                  Income Amount ({currency}) *
                </Text>
                <View
                  style={[
                    styles.amountInputContainer,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.currencyPrefix, { color: theme.success }]}>+</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                    value={incomeAmount}
                    onChangeText={setIncomeAmount}
                    style={[styles.amountTextInput, { color: theme.text }]}
                  />
                </View>
              </View>

              {/* 2. Category Drop Box */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputFieldLabel, { color: theme.textSecondary }]}>
                  Category *
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setIncomeCategorySearch('');
                    setShowIncomeCategoryDropdown(true);
                  }}
                  style={[
                    styles.categoryDropBox,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={[
                        styles.categoryIconBadge,
                        { backgroundColor: `${selectedIncomeCategoryObj.color}20` },
                      ]}
                    >
                      <Ionicons
                        name={selectedIncomeCategoryObj.icon as any}
                        size={17}
                        color={selectedIncomeCategoryObj.color}
                      />
                    </View>
                    <Text style={[styles.categoryDropBoxText, { color: theme.text }]}>
                      {selectedIncomeCategoryObj.name}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* 3. Target Wallet Indicator */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputFieldLabel, { color: theme.textSecondary }]}>
                  Deposit to Account / Wallet
                </Text>
                <View
                  style={[
                    styles.walletIndicatorCard,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="wallet-outline" size={18} color={theme.primary} />
                    <Text style={[styles.walletIndicatorName, { color: theme.text }]}>
                      {incomeFormWalletName}
                    </Text>
                  </View>
                  <Text style={[styles.walletIndicatorBalance, { color: theme.textMuted }]}>
                    Current: {formatCurrency(incomeFormWallet?.current_balance ?? incomeFormWallet?.balance ?? 0, currency)}
                  </Text>
                </View>
              </View>

              {/* 4. Date Picker Trigger */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputFieldLabel, { color: theme.textSecondary }]}>
                  Transaction Date
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowIncomeDatePicker(true)}
                  style={[
                    styles.dateTrigger,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                    <Text style={[styles.dateTriggerText, { color: theme.text }]}>{incomeDate}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: theme.primary, fontWeight: Typography.weights.semibold }}>
                    Change
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 5. Note / Description Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputFieldLabel, { color: theme.textSecondary }]}>
                  Note / Description
                </Text>
                <TextInput
                  placeholder="e.g. Salary, Opening Deposit"
                  placeholderTextColor={theme.textMuted}
                  value={incomeNote}
                  onChangeText={setIncomeNote}
                  style={[
                    styles.dialogTextInput,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                />
              </View>

              {/* Submit Buttons */}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowIncomeForm(false)}
                  style={[
                    styles.modalCancelBtn,
                    { borderColor: theme.border, backgroundColor: theme.surfaceMuted },
                  ]}
                >
                  <Text style={[styles.modalCancelBtnText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleSubmitIncomeForm}
                  disabled={incomeLoading}
                  style={[styles.modalPrimaryBtn, { backgroundColor: theme.success }]}
                >
                  <Ionicons name="add-circle" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.modalPrimaryBtnText}>
                    {incomeLoading ? 'Recording...' : 'Add Income to Transactions'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker for Income Form */}
      <DatePickerModal
        isOpen={showIncomeDatePicker}
        onClose={() => setShowIncomeDatePicker(false)}
        title="Select Income Date"
        selectedDate={incomeDate}
        onSelectDate={(d) => setIncomeDate(d || getTodayIso())}
      />

      {/* Category Dropdown Selection Modal for Income Form */}
      <Modal
        visible={showIncomeCategoryDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIncomeCategoryDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowIncomeCategoryDropdown(false)}
          />

          <View style={[styles.categoryDropdownModalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.modalIconBox, { backgroundColor: theme.primarySoft }]}>
                  <Ionicons name="pricetags-outline" size={16} color={theme.primary} />
                </View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Select Income Category</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowIncomeCategoryDropdown(false)}
                style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceMuted }]}
              >
                <Ionicons name="close" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Category Search */}
            <View style={[styles.searchWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={16} color={theme.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                placeholder="Search income categories..."
                placeholderTextColor={theme.textMuted}
                value={incomeCategorySearch}
                onChangeText={setIncomeCategorySearch}
                style={[styles.searchInput, { color: theme.text }]}
                autoCapitalize="none"
              />
              {incomeCategorySearch ? (
                <TouchableOpacity onPress={() => setIncomeCategorySearch('')}>
                  <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Category List */}
            <ScrollView style={{ maxHeight: 280, paddingHorizontal: Spacing.sm }} showsVerticalScrollIndicator={false}>
              {filteredIncomeCategories.map((cat) => {
                const isSelected = incomeCategory.toLowerCase() === cat.name.toLowerCase();
                return (
                  <TouchableOpacity
                    key={cat.name}
                    activeOpacity={0.7}
                    onPress={() => {
                      setIncomeCategory(cat.name);
                      setShowIncomeCategoryDropdown(false);
                    }}
                    style={[
                      styles.categoryListItem,
                      { borderBottomColor: theme.border },
                      isSelected && { backgroundColor: theme.primarySoft },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[styles.categoryItemBadge, { backgroundColor: `${cat.color}20` }]}>
                        <Ionicons name={cat.icon as any} size={18} color={cat.color} />
                      </View>
                      <Text
                        style={[
                          styles.categoryListItemText,
                          { color: theme.text },
                          isSelected && { fontWeight: Typography.weights.bold, color: theme.primary },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Styled Alert Dialog (replaces unstyled native alerts) */}
      <CustomAlertDialog
        isOpen={alertDialog.isOpen}
        onClose={closeAlert}
        type={alertDialog.type}
        icon={alertDialog.icon}
        title={alertDialog.title}
        subtitle={alertDialog.subtitle}
        message={alertDialog.message}
        primaryButton={alertDialog.primaryButton}
        secondaryButton={alertDialog.secondaryButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  headerCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  subtitle: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    flex: 1,
    fontWeight: Typography.weights.medium,
  },
  pickerArea: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderRadius: Radii.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: Spacing.md,
  },
  pickerText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  pickerSub: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
    textAlign: 'center',
  },
  targetWalletSection: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  targetWalletLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  walletSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  walletSelectChipText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionHeading: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
  },
  issueCard: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.md,
  },
  issueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  issueTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  issueDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: Spacing.sm,
  },
  issueActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  issueActionBtnText: {
    color: '#ffffff',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  verifiedBannerTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  verifiedBannerText: {
    fontSize: 11,
    marginTop: 2,
  },
  previewSubtext: {
    fontSize: 11,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  previewNote: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radii.xs,
  },
  miniBadgeText: {
    fontSize: 9,
    fontWeight: Typography.weights.bold,
  },
  previewMeta: {
    fontSize: 11,
    marginTop: 3,
  },
  previewAmount: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    marginLeft: Spacing.sm,
  },
  moreText: {
    textAlign: 'center',
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: Radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeFormBody: {
    padding: Spacing.lg,
  },
  promptHighlightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  promptHighlightText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    lineHeight: 19,
    flex: 1,
  },
  resolutionErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  resolutionErrorText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    flex: 1,
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  inputFieldLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    marginBottom: 6,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
  },
  currencyPrefix: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginRight: 6,
  },
  amountTextInput: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    paddingVertical: 10,
  },
  categoryDropBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  categoryIconBadge: {
    width: 30,
    height: 30,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryDropBoxText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  walletIndicatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  walletIndicatorName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  walletIndicatorBalance: {
    fontSize: Typography.sizes.xs,
  },
  dateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  dateTriggerText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  dialogTextInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: Typography.sizes.sm,
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalCancelBtnText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  modalPrimaryBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryBtnText: {
    color: '#ffffff',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  categoryDropdownModalContent: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: Radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    paddingVertical: 2,
  },
  categoryListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    marginVertical: 2,
  },
  categoryItemBadge: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryListItemText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
});
