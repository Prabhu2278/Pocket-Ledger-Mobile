// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Custom Styled Alert & Confirmation Dialog
// Replaces plain, unstyled native Alert.alert with a premium themed dialog
// ---------------------------------------------------------------------------

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Radii, Typography } from '../theme';

export type AlertType = 'info' | 'success' | 'warning' | 'danger' | 'confirm';

export interface AlertButtonConfig {
  text: string;
  onPress?: () => void | Promise<void>;
  variant?: 'primary' | 'danger' | 'success' | 'secondary';
  loading?: boolean;
}

export interface CustomAlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type?: AlertType;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  message: string;
  buttons?: AlertButtonConfig[];
  primaryButton?: AlertButtonConfig;
  secondaryButton?: {
    text: string;
    onPress?: () => void;
  };
}

export const CustomAlertDialog: React.FC<CustomAlertDialogProps> = ({
  isOpen,
  onClose,
  type = 'info',
  icon,
  title,
  subtitle,
  message,
  buttons,
  primaryButton,
  secondaryButton,
}) => {
  const { theme } = useTheme();

  if (!isOpen) return null;

  // Resolve icon and colors based on alert type
  let resolvedIcon: keyof typeof Ionicons.glyphMap = icon || 'information-circle';
  let badgeBg = theme.primarySoft;
  let iconColor = theme.primary;
  let defaultBtnBg = theme.primary;

  switch (type) {
    case 'success':
      if (!icon) resolvedIcon = 'checkmark-circle';
      badgeBg = theme.successSoft;
      iconColor = theme.success;
      defaultBtnBg = theme.success;
      break;
    case 'danger':
      if (!icon) resolvedIcon = 'alert-circle';
      badgeBg = theme.dangerSoft;
      iconColor = theme.danger;
      defaultBtnBg = theme.danger;
      break;
    case 'warning':
      if (!icon) resolvedIcon = 'warning';
      badgeBg = theme.warningSoft;
      iconColor = theme.warning;
      defaultBtnBg = theme.warning;
      break;
    case 'confirm':
      if (!icon) resolvedIcon = 'help-circle';
      badgeBg = theme.primarySoft;
      iconColor = theme.primary;
      defaultBtnBg = theme.primary;
      break;
    default:
      break;
  }

  // Normalize buttons list
  let resolvedButtons: AlertButtonConfig[] = [];
  if (buttons && buttons.length > 0) {
    resolvedButtons = buttons;
  } else {
    if (secondaryButton) {
      resolvedButtons.push({
        text: secondaryButton.text,
        onPress: secondaryButton.onPress,
        variant: 'secondary',
      });
    }
    if (primaryButton) {
      resolvedButtons.push(primaryButton);
    }
  }

  if (resolvedButtons.length === 0) {
    resolvedButtons.push({
      text: 'OK',
      variant: 'primary',
      onPress: onClose,
    });
  }

  const isVertical = resolvedButtons.length > 2;

  const getButtonBg = (btn: AlertButtonConfig) => {
    if (btn.variant === 'danger') return theme.danger;
    if (btn.variant === 'success') return theme.success;
    if (btn.variant === 'secondary') return theme.surfaceMuted;
    return defaultBtnBg;
  };

  const isBtnSecondary = (btn: AlertButtonConfig) => {
    return btn.variant === 'secondary';
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.dialogBox,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              {/* Top Accent Icon Badge */}
              <View style={[styles.iconBadge, { backgroundColor: badgeBg }]}>
                <Ionicons name={resolvedIcon} size={30} color={iconColor} />
              </View>

              {/* Title & Subtitle */}
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
              ) : null}

              {/* Message Content */}
              {message ? (
                <Text style={[styles.message, { color: theme.textSecondary }]}>
                  {message}
                </Text>
              ) : null}

              {/* Action Buttons */}
              <View style={[styles.actionsRow, isVertical && styles.actionsColumn]}>
                {resolvedButtons.map((btn, idx) => {
                  const secondary = isBtnSecondary(btn);
                  const bg = getButtonBg(btn);

                  return (
                    <TouchableOpacity
                      key={`btn-${idx}-${btn.text}`}
                      activeOpacity={0.8}
                      onPress={btn.onPress}
                      disabled={btn.loading}
                      style={[
                        styles.btn,
                        secondary ? [styles.secondaryBtn, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }] : { backgroundColor: bg },
                        !isVertical && resolvedButtons.length === 1 && styles.fullWidthBtn,
                        isVertical && styles.fullWidthBtn,
                      ]}
                    >
                      {btn.loading ? (
                        <ActivityIndicator size="small" color={secondary ? theme.text : '#ffffff'} />
                      ) : (
                        <Text
                          style={[
                            secondary ? [styles.secondaryBtnText, { color: theme.text }] : styles.primaryBtnText,
                          ]}
                        >
                          {btn.text}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  dialogBox: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radii.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl + 4,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: Typography.sizes.sm,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  actionsColumn: {
    flexDirection: 'column',
    gap: Spacing.sm,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullWidthBtn: {
    flex: 1,
  },
  secondaryBtn: {
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  primaryBtn: {},
  primaryBtnText: {
    color: '#ffffff',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
});
