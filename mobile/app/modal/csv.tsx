// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Bank Statement CSV Import Modal
// Resilient file reading compatible with Android content:// URIs and Scoped Storage.
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../../src/context/ThemeContext';
import { useApp } from '../../src/context/AppContext';
import { Button } from '../../src/components/Button';
import { api } from '../../src/services/api';
import { TransactionCreateInput } from '../../src/types';
import { Spacing, Radii, Typography } from '../../src/theme';

export default function CsvImportModal() {
  const router = useRouter();
  const { theme } = useTheme();
  const { wallets, refreshAll } = useApp();

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<TransactionCreateInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          // YYYY-MM-DD
          return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
        } else if (parts[2] > 1000) {
          // DD-MM-YYYY or MM-DD-YYYY
          const day = parts[0] > 12 ? parts[0] : parts[1];
          const month = parts[0] > 12 ? parts[1] : parts[0];
          return `${parts[2]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }
    return new Date().toISOString().split('T')[0];
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

        // Read file content with multiple fallbacks for Android content:// and file:// URIs
        let content = '';

        try {
          // Method 1: React Native's native fetch (handles content:// resolver on Android and blob on web)
          const res = await fetch(file.uri);
          content = await res.text();
        } catch {
          try {
            // Method 2: FileSystem.readAsStringAsync
            content = await FileSystem.readAsStringAsync(file.uri, {
              encoding: 'utf8',
            });
          } catch {
            // Method 3: File object text if available on web
            if ((file as any).file && typeof (file as any).file.text === 'function') {
              content = await (file as any).file.text();
            } else {
              throw new Error('Unable to read the chosen file. Please select a valid CSV file.');
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

    const items: TransactionCreateInput[] = [];
    const defaultWalletId = wallets.length > 0 ? wallets[0].id : undefined;
    const isIncomeFile = (currentFileName || '').toLowerCase().includes('income');

    for (let i = 1; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i]);
      if (cols.length <= 1) continue;

      let amtVal = 0;
      let typeVal: 'income' | 'expense' = isIncomeFile ? 'income' : 'expense';

      // 1. Check Debit/Credit columns
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

      // 2. Check standard Amount column
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

      // 3. Fallback: check 2nd column if amount not resolved
      if (amtVal === 0 && cols[1]) {
        const fallbackAmt = parseFloat(cols[1].replace(/,/g, ''));
        if (!isNaN(fallbackAmt) && fallbackAmt > 0) {
          amtVal = fallbackAmt;
        }
      }

      if (amtVal <= 0) continue;

      const dateVal =
        dateIdx !== -1 && cols[dateIdx] ? normalizeDate(cols[dateIdx]) : new Date().toISOString().split('T')[0];
      const noteVal =
        noteIdx !== -1 && cols[noteIdx]
          ? cols[noteIdx]
          : typeVal === 'income'
          ? 'Income Deposit'
          : 'Bank Expense';
      const catVal =
        catIdx !== -1 && cols[catIdx] ? cols[catIdx] : typeVal === 'income' ? 'Salary' : 'Other';

      // Resolve Wallet
      let rowWalletId = defaultWalletId;
      if (walletIdx !== -1 && cols[walletIdx]) {
        const wMatch = wallets.find((w) => w.name.toLowerCase() === cols[walletIdx].toLowerCase());
        if (wMatch) rowWalletId = wMatch.id;
      }

      items.push({
        type: typeVal,
        amount: amtVal,
        category: catVal,
        note: noteVal,
        date: dateVal,
        wallet_id: rowWalletId,
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

  // Submit Bulk Import to Backend
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.transactions.bulkImport(parsedRows);
      await refreshAll();
      Alert.alert(
        'Import Successful',
        `Successfully imported ${res.imported} transactions into your database.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to import transactions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.headerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.iconBox, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="document-text-outline" size={24} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Import Bank Statement</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Upload a CSV statement to bulk import transactions into Pocket Ledger.
          </Text>
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.dangerSoft }]}>
            <Ionicons name="alert-circle" size={18} color={theme.danger} style={{ marginRight: 6 }} />
            <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
          </View>
        ) : null}

        {/* Upload Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handlePickDocument}
          style={[styles.pickerArea, { borderColor: theme.primary, backgroundColor: theme.surface }]}
        >
          <Ionicons name="cloud-upload-outline" size={40} color={theme.primary} />
          <Text style={[styles.pickerText, { color: theme.text }]}>
            {fileName ? fileName : 'Tap to select CSV file from device'}
          </Text>
          <Text style={[styles.pickerSub, { color: theme.textMuted }]}>
            Supports standard statement exports (Date, Amount, Note, Category)
          </Text>
        </TouchableOpacity>

        {/* Preview Rows */}
        {parsedRows.length > 0 ? (
          <View style={{ marginTop: Spacing.lg }}>
            <View style={styles.previewHeaderRow}>
              <Text style={[styles.previewHeading, { color: theme.text }]}>
                Statement Preview ({parsedRows.length} Rows)
              </Text>
              <View style={[styles.badge, { backgroundColor: theme.successSoft }]}>
                <Text style={[styles.badgeText, { color: theme.success }]}>Ready</Text>
              </View>
            </View>

            {parsedRows.slice(0, 5).map((row, idx) => (
              <View
                key={`preview-${idx}`}
                style={[
                  styles.previewItem,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.previewNote, { color: theme.text }]} numberOfLines={1}>
                    {row.note}
                  </Text>
                  <Text style={[styles.previewMeta, { color: theme.textMuted }]}>
                    {row.date} • {row.category}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.previewAmount,
                    { color: row.type === 'income' ? theme.success : theme.danger },
                  ]}
                >
                  {row.type === 'income' ? '+' : '-'}₹{row.amount.toFixed(2)}
                </Text>
              </View>
            ))}

            {parsedRows.length > 5 ? (
              <Text style={[styles.moreText, { color: theme.textMuted }]}>
                ... and {parsedRows.length - 5} more transactions
              </Text>
            ) : null}

            <Button
              title={`Confirm & Import ${parsedRows.length} Transactions`}
              onPress={handleConfirmImport}
              loading={loading}
              size="lg"
              style={{ marginTop: Spacing.lg }}
            />
          </View>
        ) : null}
      </ScrollView>
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
    marginBottom: Spacing.lg,
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
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    flex: 1,
  },
  pickerArea: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderRadius: Radii.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
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
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  previewHeading: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
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
  previewMeta: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
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
});
