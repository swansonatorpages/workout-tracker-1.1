import React, { useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FinishBarProps {
  doneSets: number;
  totalSets: number;
  onFinish: () => void;
}

export function FinishBar({ doneSets, totalSets, onFinish }: FinishBarProps) {
  const insets = useSafeAreaInsets();
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmAnim = useRef(new Animated.Value(0)).current;
  const allDone = doneSets === totalSets && totalSets > 0;

  const handlePress = () => {
    if (allDone) {
      onFinish();
      return;
    }
    if (!showConfirm) {
      setShowConfirm(true);
      Animated.spring(confirmAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
    }
  };

  const handleCancel = () => {
    Animated.timing(confirmAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setShowConfirm(false);
    });
  };

  const handleConfirmFinish = () => {
    onFinish();
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(16, insets.bottom) },
      ]}
    >
      {/* Inline confirmation banner */}
      {showConfirm && (
        <Animated.View
          style={[
            styles.confirmBanner,
            {
              transform: [
                {
                  translateY: confirmAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
              opacity: confirmAnim,
            },
          ]}
        >
          <Text style={styles.confirmText}>
            {totalSets - doneSets} set{totalSets - doneSets !== 1 ? 's' : ''} not logged — Finish anyway?
          </Text>
          <View style={styles.confirmButtons}>
            <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirmFinish} style={styles.confirmBtn} activeOpacity={0.7}>
              <Text style={styles.confirmBtnText}>Finish</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Main bar */}
      <View style={styles.bar}>
        <View style={styles.countContainer}>
          <Text style={styles.countLabel}>SETS DONE</Text>
          <Text style={styles.countValue}>
            <Text style={allDone ? styles.countDone : styles.countPrimary}>{doneSets}</Text>
            <Text style={styles.countTotal}> / {totalSets}</Text>
          </Text>
        </View>

        <TouchableOpacity
          onPress={handlePress}
          style={[styles.finishBtn, allDone ? styles.finishBtnActive : styles.finishBtnMuted]}
          activeOpacity={0.85}
        >
          <Text style={[styles.finishBtnText, allDone ? styles.finishBtnTextActive : styles.finishBtnTextMuted]}>
            Finish Workout
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(11,12,16,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  confirmBanner: {
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmText: {
    color: '#ff3b30',
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    flex: 1,
    marginRight: 8,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cancelBtnText: {
    color: '#9ba1b0',
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  confirmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ff3b30',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countContainer: {},
  countLabel: {
    color: '#9ba1b0',
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  countValue: {
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
  countPrimary: {
    color: '#00e5ff',
  },
  countDone: {
    color: '#2eeb7c',
  },
  countTotal: {
    color: '#9ba1b0',
  },
  finishBtn: {
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
  },
  finishBtnActive: {
    backgroundColor: '#2eeb7c',
  },
  finishBtnMuted: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  finishBtnText: {
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
  },
  finishBtnTextActive: {
    color: '#0b0c10',
  },
  finishBtnTextMuted: {
    color: '#9ba1b0',
  },
});
