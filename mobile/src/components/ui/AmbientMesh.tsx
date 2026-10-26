// ---------------------------------------------------------------------------
// Pocket Ledger Mobile - Ambient Mesh Background
// Replicates the luminous lavender, cyan, and mint glow from the Web UI
// ---------------------------------------------------------------------------

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export const AmbientMesh: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Top Left Glow (Lavender in light, Deep Indigo/Violet in dark) */}
      <View
        style={[
          styles.topLavenderGlow,
          isDark && {
            backgroundColor: '#4338ca',
            opacity: 0.22,
          },
        ]}
      />

      {/* Center Right Glow (Mint/Cyan in light, Deep Cyan/Teal in dark) */}
      <View
        style={[
          styles.centerCyanGlow,
          isDark && {
            backgroundColor: '#0e7490',
            opacity: 0.18,
          },
        ]}
      />

      {/* Bottom Glow (Periwinkle in light, Deep Purple in dark) */}
      <View
        style={[
          styles.bottomBlueGlow,
          isDark && {
            backgroundColor: '#6b21a8',
            opacity: 0.16,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: -1,
  },
  topLavenderGlow: {
    position: 'absolute',
    top: -80,
    left: -50,
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: (width * 0.85) / 2,
    backgroundColor: '#ede9fe',
    opacity: 0.6,
  },
  centerCyanGlow: {
    position: 'absolute',
    top: 220,
    right: -90,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
    backgroundColor: '#ccfbf1',
    opacity: 0.5,
  },
  bottomBlueGlow: {
    position: 'absolute',
    bottom: 20,
    left: -60,
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: (width * 0.75) / 2,
    backgroundColor: '#e0e7ff',
    opacity: 0.45,
  },
});
