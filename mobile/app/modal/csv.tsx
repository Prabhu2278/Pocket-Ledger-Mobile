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
import { Button } from '../../src/components/Button';
import { api } from '../../src/services/api';
import { Wallet, TransactionCreateInput } from '../../src/types';
import { formatCurrency } from '../../src/utils/formatCurrency';
import { getTodayIso } from '../../src/utils/dateUtils';
import { INCOME_CATEGORIES } from '../../src/constants/categories';
import { DatePickerModal } from '../../src/components/DatePickerModal';
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

  // Normalizes dates (e.g. DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
  const normalizeDate = (raw: string): string => {
    const clean = raw.trim().replace(/^["']|["']$/g, '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    if (clean.includes('/') || clean.includes('-')) {
      const parts = clean.split(/[/-]/).map(Number);
      if (parts.length === 3) {
        if (parts[0] > 1000) {
          return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
        } else if (parts[2] > 1000) {
          const day = parts[0] > 12 ? parts[0] : parts[1];
          const month = parts[0] > 12 ? parts[1] : parts[0];
          return `${parts[2]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
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
        try {
          const res = await fetch(file.uri);
          content = await res.text();
        } catch {
          try {
            content = await FileSystem.readAsStringAsync(file.uri, {
              encoding: 'utf8',
            });
          } catch {
            if ((file as any).file && typeof (file as any).file.text === 'function') {
              content = await (file as any).file.text();
            } else {
              throw new Error('Unable to read chosen file. Please select a valid CSV file.');
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

  // Parse CSV string into Transaction items
  const parseCsvString = (text: string, currentFileName?: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setError('CSV file appears to be empty or missing headers.');
      return;
    }

    const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
    const dateIdx = headers.findIndex((h) => h.includes('date') || h.includes('time'));
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
    const walletIdx = headers.findIndex((h) => h.includes('wallet') || h.includes('account'));

    const items: ParsedImportRow[] = [];
    const isIncomeFile = (currentFileName || '').toLowerCase().includes('income');
    const defaultWallet = wallets.find((w) => w.id === targetWalletId) || wallets[0];
    const defaultWalletName = defaultWallet ? defaultWallet.name : 'Main Wallet';

    for (let i = 1; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i]);
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

      // Resolve Wallet Name specified in CSV, or default
      let rawWalletName = defaultWalletName;
      if (walletIdx !== -1 && cols[walletIdx] && cols[walletIdx].trim()) {
        rawWalletName = cols[walletIdx].trim();
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
        'Could not identify transactions in the CSV. Please ensure headers include Date, Amount, and Note/Description.'
      );
    } else {
      setParsedRows(items);
    }
  };

  // ---------------------------------------------------------------------------
  // Wallet Requirements & Validation Engine:
  // 1. Checks if wallet exists in app.
  // 2. Detects new wallet with income -> Prompts user can I add new wallet.
  // 3. Detects new wallet with expense -> Asks to create wallet, then pops up
  //    Income Form ("Did you forget to add the income?") to fund the wallet.
  // 4. Detects existing wallet with low funds -> Pops up Income Form to add income.
  // ---------------------------------------------------------------------------
  const walletIssues = useMemo<WalletIssue[]>(() => {
    if (parsedRows.length === 0) return [];

    const issues: WalletIssue[] = [];
    const walletGroups: Record<string, ParsedImportRow[]> = {};

    parsedRows.forEach((r) => {
      const wName = r.rawWalletName || (wallets[0]?.name || 'Main Wallet');
      if (!walletGroups[wName]) walletGroups[wName] = [];
      walletGroups[wName].push(r);
    });

    Object.keys(walletGroups).forEach((wName) => {
      const rows = walletGroups[wName];
      const matchedWallet = wallets.find(
        (w) => w.name.toLowerCase() === wName.toLowerCase()
      );

      const totalIncomeInBatch = rows
        .filter((r) => r.type === 'income')
        .reduce((sum, r) => sum + r.amount, 0);

      const totalExpenseInBatch = rows
        .filter((r) => r.type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0);

      // Condition A: New Wallet (not in app)
      if (!matchedWallet) {
        if (totalExpenseInBatch > 0) {
          const shortage = Math.max(0, totalExpenseInBatch - totalIncomeInBatch);
          issues.push({
            id: `issue-${wName}-new-expense`,
            type: 'NEW_WALLET_EXPENSE',
            walletName: wName,
            currentBalance: 0,
            totalIncomeInBatch,
            totalExpenseInBatch,
            shortageAmount: shortage > 0 ? shortage : totalExpenseInBatch,
          });
        } else {
          issues.push({
            id: `issue-${wName}-new-income`,
            type: 'NEW_WALLET_INCOME',
            walletName: wName,
            currentBalance: 0,
            totalIncomeInBatch,
            totalExpenseInBatch: 0,
            shortageAmount: 0,
          });
        }
      } else {
        // Condition B: Existing Wallet in app -> Check fund sufficiency
        const currentBal = Number(
          matchedWallet.current_balance ?? matchedWallet.balance ?? matchedWallet.initial_balance ?? 0
        );
        const availableFunds = currentBal + totalIncomeInBatch;

        if (totalExpenseInBatch > availableFunds) {
          const shortage = totalExpenseInBatch - availableFunds;
          issues.push({
            id: `issue-${wName}-low-funds`,
            type: 'LOW_FUNDS',
            walletName: matchedWallet.name,
            matchedWallet,
            currentBalance: currentBal,
            totalIncomeInBatch,
            totalExpenseInBatch,
            shortageAmount: shortage,
          });
        }
      }
    });

    return issues;
  }, [parsedRows, wallets]);

  // ---------------------------------------------------------------------------
  // Action: Open Income Form when low funds are detected
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

  // Action: Handle New Wallet Flow
  const handleOpenNewWalletFlow = (issue: WalletIssue) => {
    if (issue.type === 'NEW_WALLET_INCOME') {
      // Income-only new wallet: Prompt user if we can add it
      Alert.alert(
        'New Wallet Detected',
        `The imported data has income for new wallet "${issue.walletName}". Can I add this new wallet to your app?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Add Wallet',
            onPress: async () => {
              try {
                await createWallet({
                  name: issue.walletName,
                  wallet_type: 'BANK',
                  initial_balance: 0,
                  color: '#10b981',
                });
                await refreshAll();
                Alert.alert(
                  'Wallet Added',
                  `Wallet "${issue.walletName}" has been created! The incoming transaction will be deposited directly to it.`
                );
              } catch (err: any) {
                Alert.alert('Error', err?.message || 'Failed to create new wallet');
              }
            },
          },
        ]
      );
    } else {
      // New Wallet with Expense: Requires 2 steps: Create Wallet, then Pop up Income Form
      Alert.alert(
        'New Wallet with Expense',
        `The imported data has expenses of ${formatCurrency(issue.totalExpenseInBatch, currency)} for new wallet "${issue.walletName}". Can I create this new wallet first?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Create Wallet',
            onPress: async () => {
              try {
                const newW = await createWallet({
                  name: issue.walletName,
                  wallet_type: 'BANK',
                  initial_balance: 0,
                  color: '#10b981',
                });
                await refreshAll();

                // Immediately pop up the Income Form with "Did you forget to add the income?"
                setIncomeFormWallet(newW);
                setIncomeFormWalletName(issue.walletName);
                setIncomeMinRequired(issue.shortageAmount);
                setIncomeAmount(String(Math.ceil(issue.shortageAmount)));
                setIncomeCategory('Salary');
                setIncomeNote(`Opening Income Deposit for ${issue.walletName}`);
                setIncomeDate(getTodayIso());
                setIncomeFormReason('NEW_WALLET');
                setIncomeFormError(null);
                setShowIncomeForm(true);
              } catch (err: any) {
                Alert.alert('Error', err?.message || 'Failed to create new wallet');
              }
            },
          },
        ]
      );
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
      Alert.alert(
        'Income Transaction Added!',
        `Successfully recorded +${formatCurrency(numAmt, currency)} to "${targetW.name}" in your transactions! The wallet now has sufficient funds for your statement expenses.`
      );
    } catch (err: any) {
      setIncomeFormError(err?.message || 'Failed to record income transaction.');
    } finally {
      setIncomeLoading(false);
    }
  };

  // Submit Bulk Import to Backend
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;

    // Check if any requirements remain unresolved
    if (walletIssues.length > 0) {
      const first = walletIssues[0];
      if (first.type === 'LOW_FUNDS') {
        Alert.alert(
          'Low Funds Alert',
          `Wallet "${first.walletName}" has low funds (short by ${formatCurrency(first.shortageAmount, currency)}). Please add income before importing this data.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Add Income Now',
              onPress: () => handleOpenIncomeFormForExistingWallet(first),
            },
          ]
        );
      } else {
        Alert.alert(
          'Wallet Requirement Needed',
          first.type === 'NEW_WALLET_EXPENSE'
            ? `Wallet "${first.walletName}" is a new wallet with expenses. Please create the wallet and add income to cover it.`
            : `New wallet "${first.walletName}" detected. Can I add this new wallet to your app?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Resolve Now',
              onPress: () => handleOpenNewWalletFlow(first),
            },
          ]
        );
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Map rows with verified wallet_id
      const rowsToImport: TransactionCreateInput[] = parsedRows.map((r) => {
        const wMatch =
          wallets.find((w) => w.name.toLowerCase() === r.rawWalletName.toLowerCase()) ||
          wallets[0];
        return {
          type: r.type,
          amount: r.amount,
          category: r.category,
          note: r.note,
          date: r.date,
          wallet_id: wMatch?.id,
        };
      });

      const res = await api.transactions.bulkImport(rowsToImport);
      await refreshAll();

      Alert.alert(
        'Import Successful',
        `Successfully imported ${res.imported} transactions into your ledger.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
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
        {parsedRows.length > 0 && wallets.length > 0 ? (
          <View style={[styles.targetWalletSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.targetWalletLabel, { color: theme.textSecondary }]}>
              Default Wallet (when not specified in row):
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
                Import Requirements Check
              </Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: walletIssues.length === 0 ? theme.successSoft : theme.warningSoft },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: walletIssues.length === 0 ? theme.success : theme.warning },
                  ]}
                >
                  {walletIssues.length === 0 ? '✓ All Requirements Met' : `${walletIssues.length} Action Needed`}
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
                            {isNewWalletIncome ? 'New Wallet' : isNewWalletExpense ? 'Missing Income' : 'Low Funds'}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.issueDescription, { color: theme.textSecondary }]}>
                        {isNewWalletIncome
                          ? `This wallet is not in your app. Income of +${formatCurrency(issue.totalIncomeInBatch, currency)} can be recorded once the wallet is created.`
                          : isNewWalletExpense
                          ? `This wallet is not in your app and has expenses of -${formatCurrency(issue.totalExpenseInBatch, currency)}. Please create the wallet and add income to cover the expense.`
                          : `Wallet has ${formatCurrency(issue.currentBalance, currency)}, but imported expenses require ${formatCurrency(issue.totalExpenseInBatch, currency)}. Short by ${formatCurrency(issue.shortageAmount, currency)}.`}
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
                          name={isNewWalletIncome ? 'add-circle-outline' : 'cash-outline'}
                          size={16}
                          color="#ffffff"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.issueActionBtnText}>
                          {isNewWalletIncome
                            ? `Can I add "${issue.walletName}"? (Tap to Add)`
                            : isNewWalletExpense
                            ? `Create Wallet & Add Missing Income`
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
                    All transactions match existing wallets and have sufficient funds. You can proceed with import.
                  </Text>
                </View>
              </View>
            )}

            {/* Statement Preview Header */}
            <View style={[styles.sectionHeaderRow, { marginTop: Spacing.xl }]}>
              <Text style={[styles.sectionHeading, { color: theme.text }]}>
                Statement Preview ({parsedRows.length} Rows)
              </Text>
              <Text style={[styles.previewSubtext, { color: theme.textMuted }]}>
                {parsedRows.filter((r) => r.type === 'income').length} Incomes •{' '}
                {parsedRows.filter((r) => r.type === 'expense').length} Expenses
              </Text>
            </View>

            {/* Rows Preview List */}
            {parsedRows.slice(0, 6).map((row, idx) => {
              const matchedW = wallets.find(
                (w) => w.name.toLowerCase() === row.rawWalletName.toLowerCase()
              );
              const isLowFundRow =
                matchedW &&
                row.type === 'expense' &&
                row.amount > Number(matchedW.current_balance ?? matchedW.balance ?? 0);

              return (
                <View
                  key={`preview-${idx}`}
                  style={[
                    styles.previewItem,
                    {
                      backgroundColor: theme.surface,
                      borderColor: !matchedW ? theme.warning : isLowFundRow ? theme.danger : theme.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.previewNote, { color: theme.text }]} numberOfLines={1}>
                        {row.note}
                      </Text>
                      {!matchedW ? (
                        <View style={[styles.miniBadge, { backgroundColor: theme.warningSoft }]}>
                          <Text style={[styles.miniBadgeText, { color: theme.warning }]}>New Wallet</Text>
                        </View>
                      ) : isLowFundRow ? (
                        <View style={[styles.miniBadge, { backgroundColor: theme.dangerSoft }]}>
                          <Text style={[styles.miniBadgeText, { color: theme.danger }]}>Low Funds</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.previewMeta, { color: theme.textMuted }]}>
                      {row.date} • {row.category} • Wallet: {row.rawWalletName}
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

            {parsedRows.length > 6 ? (
              <Text style={[styles.moreText, { color: theme.textMuted }]}>
                ... and {parsedRows.length - 6} more transactions in statement
              </Text>
            ) : null}

            {/* Confirm & Import Action Button */}
            <Button
              title={
                walletIssues.length > 0
                  ? `Resolve ${walletIssues.length} Requirement${walletIssues.length > 1 ? 's' : ''} to Import`
                  : `Confirm & Import ${parsedRows.length} Transactions`
              }
              onPress={handleConfirmImport}
              loading={loading}
              variant={walletIssues.length > 0 ? 'secondary' : 'primary'}
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
                    {incomeFormReason === 'NEW_WALLET'
                      ? 'Did you forget to add the income?'
                      : 'Low Fund Alert! Add income to continue.'}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                    Please add an income of at least{' '}
                    <Text style={{ fontWeight: Typography.weights.bold, color: theme.danger }}>
                      {formatCurrency(incomeMinRequired, currency)}
                    </Text>{' '}
                    to cover your statement expense.
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
