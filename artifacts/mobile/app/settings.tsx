import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWorkout } from '@/context/WorkoutContext';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, clearAllHistory } = useWorkout();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const resetAnim = useRef(new Animated.Value(0)).current;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleResetPress = () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      Animated.spring(resetAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    }
  };

  const handleResetCancel = () => {
    Animated.timing(resetAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setShowResetConfirm(false);
    });
  };

  const handleResetConfirm = async () => {
    await clearAllHistory();
    setShowResetConfirm(false);
    resetAnim.setValue(0);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.blob, styles.blobTeal]} />
      <View style={[styles.blob, styles.blobPurple]} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Section: Display */}
        <Text style={styles.sectionLabel}>DISPLAY</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Weight Units</Text>
              <Text style={styles.settingDesc}>
                Values stored in lbs. Kg converts for display only.
              </Text>
            </View>
            <View style={styles.toggle}>
              <TouchableOpacity
                onPress={() => updateSettings({ units: 'lbs' })}
                style={[
                  styles.toggleOption,
                  settings.units === 'lbs' && styles.toggleOptionActive,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.toggleOptionText,
                    settings.units === 'lbs' && styles.toggleOptionTextActive,
                  ]}
                >
                  lbs
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => updateSettings({ units: 'kg' })}
                style={[
                  styles.toggleOption,
                  settings.units === 'kg' && styles.toggleOptionActive,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.toggleOptionText,
                    settings.units === 'kg' && styles.toggleOptionTextActive,
                  ]}
                >
                  kg
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Section: Data */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>DATA</Text>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Reset App</Text>
              <Text style={styles.settingDesc}>
                Permanently delete all sessions and settings.
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleResetPress}
              style={styles.dangerBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.dangerBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>

          {showResetConfirm && (
            <Animated.View
              style={[
                styles.confirmBanner,
                {
                  opacity: resetAnim,
                  transform: [
                    {
                      translateY: resetAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.confirmText}>
                Delete all data? This cannot be undone.
              </Text>
              <View style={styles.confirmBtns}>
                <TouchableOpacity
                  onPress={handleResetCancel}
                  style={styles.cancelBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleResetConfirm}
                  style={styles.deleteBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteBtnText}>Delete All</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>

        {/* App info */}
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>Workout Tracker · v1.0</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b0c10',
  },
  blob: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.08,
  },
  blobTeal: {
    backgroundColor: '#00e5ff',
    top: -60,
    left: -60,
  },
  blobPurple: {
    backgroundColor: '#7c3aed',
    bottom: -60,
    right: -60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
  },
  headerTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    color: '#9ba1b0',
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 2,
    marginBottom: 10,
  },
  settingCard: {
    backgroundColor: 'rgba(31,33,42,0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 3,
  },
  settingDesc: {
    color: '#9ba1b0',
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 16,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 3,
  },
  toggleOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleOptionActive: {
    backgroundColor: '#00e5ff',
  },
  toggleOptionText: {
    color: '#9ba1b0',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  toggleOptionTextActive: {
    color: '#0b0c10',
  },
  dangerBtn: {
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dangerBtnText: {
    color: '#ff3b30',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  confirmBanner: {
    marginTop: 14,
    backgroundColor: 'rgba(255,59,48,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
    borderRadius: 12,
    padding: 14,
  },
  confirmText: {
    color: '#ff3b30',
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    marginBottom: 12,
  },
  confirmBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#9ba1b0',
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
  },
  infoRow: {
    alignItems: 'center',
    marginTop: 32,
  },
  infoText: {
    color: 'rgba(155,161,176,0.4)',
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
  },
});
