import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWorkout } from '@/context/WorkoutContext';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { sessions } = useWorkout();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Feather name="clock" size={48} color="rgba(155,161,176,0.3)" />
        <Text style={styles.title}>Workout History</Text>
        <Text style={styles.subtitle}>
          {sessions.length > 0
            ? `${sessions.length} session${sessions.length !== 1 ? 's' : ''} recorded`
            : 'Your completed workouts will appear here'}
        </Text>
        <Text style={styles.comingSoon}>Full history view coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b0c10',
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontFamily: 'Outfit_600SemiBold',
    marginTop: 12,
  },
  subtitle: {
    color: '#9ba1b0',
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
  },
  comingSoon: {
    color: 'rgba(0,229,255,0.5)',
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
    marginTop: 8,
  },
});
