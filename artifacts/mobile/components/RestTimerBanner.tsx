import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RestTimerBannerProps {
  remaining: number;
  total: number;
  onDismiss: () => void;
}

export function RestTimerBanner({ remaining, total, onDismiss }: RestTimerBannerProps) {
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, []);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const progress = remaining / total;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + 8, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.left}>
          <Text style={styles.label}>REST</Text>
          <Text style={styles.time}>{timeStr}</Text>
        </View>

        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: `${Math.round(progress * 100)}%` },
            ]}
          />
        </View>

        <TouchableOpacity onPress={onDismiss} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    borderRadius: 14,
    backgroundColor: 'rgba(20,22,30,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.3)',
    overflow: 'hidden',
    shadowColor: '#00e5ff',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  left: {
    alignItems: 'center',
    minWidth: 48,
  },
  label: {
    color: '#00e5ff',
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1.5,
    marginBottom: 1,
  },
  time: {
    color: '#ffffff',
    fontSize: 20,
    fontFamily: 'Outfit_700Bold',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00e5ff',
    borderRadius: 2,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  skipText: {
    color: '#9ba1b0',
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
});
