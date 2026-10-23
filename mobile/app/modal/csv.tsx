// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Bank Statement CSV Import Modal
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

  // Pick CSV Document
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setFileName(file.name);
        setError(null);

        // Read file content
        const csvFile = new FileSystem.File(file.uri);
        const content = await csvFile.text();

        parseCsvString(content);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to open file.');
    }
  };

  // Parse CSV string into Transaction items
  const parseCsvString = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setError('CSV file appears to be empty or missing headers.');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const dateIdx = headers.findIndex((h) => h.includes('date') || h.includes('time'));
    const amountIdx = headers.findIndex((h) => h.includes('amount') || h.includes('amt') || h.includes('spent'));
    const noteIdx = headers.findIndex((h) => h.includes('note') || h.includes('desc') || h.includes('title') || h.includes('narration'));
    const catIdx = headers.findIndex((h) => h.includes('cat'));
    const typeIdx = headers.findIndex((h) => h.includes('type'));

    const items: TransactionCreateInput[] = [];
    const defaultWalletId = wallets.length > 0 ? wallets[0].id : undefined;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length <= 1) continue;

      const amtVal = amountIdx !== -1 ? parseFloat(cols[amountIdx]) : parseFloat(cols[1]);
      if (isNaN(amtVal) || amtVal <= 0) continue;

      const dateVal = dateIdx !== -1 && cols[dateIdx] ? cols[dateIdx] : new Date().toISOString().split('T')[0];
      const noteVal = noteIdx !== -1 && cols[noteIdx] ? cols[noteIdx] : 'CSV Transaction';
      const catVal = catIdx !== -1 && cols[catIdx] ? cols[catIdx] : 'Other';
      const typeVal =
        typeIdx !== -1 && cols[typeIdx]
          ? (cols[typeIdx].toLowerCase().includes('inc') ? 'income' : 'expense')
          : 'expense';

      items.push({
        type: typeVal,
        amount: Math.abs(amtVal),
        category: catVal,
        note: noteVal,
        date: dateVal,
        wallet_id: defaultWalletId,
      });
    }

    if (items.length === 0) {
      setError('Could not identify transactions in the CSV. Ensure headers include Date, Amount, Note.');
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
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    flex: 1,
  },
  pickerArea: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: Radii.lg,
    padding: Spacing.xl,
  },
  pickerText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  pickerSub: {
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    marginTop: 4,
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
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  previewNote: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
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
    marginVertical: Spacing.sm,
  },
});
