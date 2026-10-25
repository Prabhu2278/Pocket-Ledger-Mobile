// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Global Custom Alert Context & Native Alert Override
// Automatically transforms all Alert.alert(...) calls across the entire app
// into beautifully styled, theme-aware Pocket Ledger dialogs.
// ---------------------------------------------------------------------------

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert as RNAlert, AlertButton } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomAlertDialog, AlertType, AlertButtonConfig } from '../components/modals/CustomAlertDialog';

export interface AlertConfig {
  type?: AlertType;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  message?: string;
  buttons?: AlertButtonConfig[];
  primaryButton?: {
    text: string;
    onPress?: () => void | Promise<void>;
    variant?: 'primary' | 'danger' | 'success' | 'secondary';
    loading?: boolean;
  };
  secondaryButton?: {
    text: string;
    onPress?: () => void;
  };
}

interface AlertContextValue {
  showAlert: (config: AlertConfig) => void;
  closeAlert: () => void;
}

const AlertContext = createContext<AlertContextValue>({
  showAlert: () => {},
  closeAlert: () => {},
});

export const useAlert = () => useContext(AlertContext);

// Global trigger handler for RNAlert.alert override
let globalShowAlertHandler: ((config: AlertConfig) => void) | null = null;

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAlert, setCurrentAlert] = useState<(AlertConfig & { isOpen: boolean }) | null>(null);

  const closeAlert = useCallback(() => {
    setCurrentAlert((prev) => (prev ? { ...prev, isOpen: false } : null));
  }, []);

  const showAlert = useCallback((config: AlertConfig) => {
    setCurrentAlert({
      ...config,
      isOpen: true,
    });
  }, []);

  useEffect(() => {
    globalShowAlertHandler = showAlert;

    // Save original Alert.alert reference
    const originalAlert = RNAlert.alert;

    // Override Alert.alert globally across the entire app
    RNAlert.alert = (
      title: string,
      message?: string,
      buttons?: AlertButton[]
    ) => {
      // Determine intelligent type and icon based on title/message/buttons
      const lowerTitle = (title || '').toLowerCase();
      const lowerMessage = (message || '').toLowerCase();

      let detectedType: AlertType = 'info';
      let detectedIcon: keyof typeof Ionicons.glyphMap = 'information-circle';

      const isDelete =
        lowerTitle.includes('delete') ||
        lowerTitle.includes('remove') ||
        (buttons && buttons.some((b) => b.style === 'destructive' || (b.text || '').toLowerCase().includes('delete')));

      const isLogout =
        lowerTitle.includes('sign out') ||
        lowerTitle.includes('log out') ||
        lowerMessage.includes('sign out') ||
        lowerMessage.includes('log out');

      const isError =
        lowerTitle.includes('error') ||
        lowerTitle.includes('failed') ||
        lowerTitle.includes('cannot');

      const isSuccess =
        lowerTitle.includes('success') ||
        lowerTitle.includes('added') ||
        lowerTitle.includes('created') ||
        lowerTitle.includes('complete');

      const isWarning =
        lowerTitle.includes('warning') ||
        lowerTitle.includes('notice') ||
        lowerTitle.includes('low fund');

      if (isDelete) {
        detectedType = 'danger';
        detectedIcon = 'trash-outline';
      } else if (isLogout) {
        detectedType = 'danger';
        detectedIcon = 'log-out-outline';
      } else if (isError) {
        detectedType = 'danger';
        detectedIcon = 'alert-circle';
      } else if (isSuccess) {
        detectedType = 'success';
        detectedIcon = 'checkmark-circle';
      } else if (isWarning) {
        detectedType = 'warning';
        detectedIcon = 'warning-outline';
      } else if (buttons && buttons.length >= 2) {
        detectedType = 'confirm';
        detectedIcon = 'help-circle-outline';
      }

      // Map RN buttons to CustomAlertDialog buttons
      const resolvedButtons: AlertButtonConfig[] = [];

      if (!buttons || buttons.length === 0) {
        resolvedButtons.push({
          text: 'OK',
          variant: isError ? 'danger' : isSuccess ? 'success' : 'primary',
          onPress: closeAlert,
        });
      } else {
        buttons.forEach((btn) => {
          const lowerText = (btn.text || '').toLowerCase();
          const isCancel = btn.style === 'cancel' || lowerText === 'cancel' || lowerText === 'no';
          const isDestr = btn.style === 'destructive' || (!isCancel && (isDelete || isLogout || lowerText.includes('delete') || lowerText.includes('remove')));
          
          let variant: AlertButtonConfig['variant'] = 'primary';
          if (isCancel) {
            variant = 'secondary';
          } else if (isDestr) {
            variant = 'danger';
          } else if (isSuccess) {
            variant = 'success';
          }

          resolvedButtons.push({
            text: btn.text || 'OK',
            variant,
            onPress: () => {
              closeAlert();
              btn.onPress?.();
            },
          });
        });
      }

      if (globalShowAlertHandler) {
        globalShowAlertHandler({
          type: detectedType,
          icon: detectedIcon,
          title: title || 'Notice',
          message: message || '',
          buttons: resolvedButtons,
        });
      } else {
        originalAlert(title, message, buttons);
      }
    };

    return () => {
      RNAlert.alert = originalAlert;
      globalShowAlertHandler = null;
    };
  }, [showAlert, closeAlert]);

  return (
    <AlertContext.Provider value={{ showAlert, closeAlert }}>
      {children}

      {currentAlert ? (
        <CustomAlertDialog
          isOpen={currentAlert.isOpen}
          onClose={closeAlert}
          type={currentAlert.type}
          icon={currentAlert.icon}
          title={currentAlert.title}
          subtitle={currentAlert.subtitle}
          message={currentAlert.message || ''}
          buttons={currentAlert.buttons}
          primaryButton={currentAlert.primaryButton}
          secondaryButton={currentAlert.secondaryButton}
        />
      ) : null}
    </AlertContext.Provider>
  );
};
