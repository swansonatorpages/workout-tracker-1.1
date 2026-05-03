import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWorkout } from '@/context/WorkoutContext';
import { WORKOUTS } from '@/constants/workouts';

function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function getBorderColor(days: number | null): string {
  if (days === null) return '#ff3b30';
  if (days <= 4) return '#2eeb7c';
  if (days <= 8) return '#FF9800';
  return '#ff3b30';
}

function WorkoutCard({
  workoutId,
  showOverdue,
}: {
  workoutId: string;
  showOverdue: boolean;
}) {
  const { sessions, activeWorkout, startWorkout } = useWorkout();
  const workout = WORKOUTS[workoutId];

  const lastSession = useMemo(() => {
    return sessions.find((s) => s.workoutId === workoutId) ?? null;
  }, [sessions, workoutId]);

  const days = lastSession ? daysSince(lastSession.completedAt) : null;
  const borderColor = getBorderColor(days);

  const handlePress = () => {
    startWorkout(workoutId);
    router.push('/workout');
  };

  const lastText = days === null
    ? 'Never done'
    : days === 0
    ? 'Today'
    : days === 1
    ? '1 day ago'
    : `${days} days ago`;

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.card, { borderColor }]}
      activeOpacity={0.82}
    >
      {showOverdue && (
        <View style={styles.overdueBadge}>
          <Text style={styles.overdueText}>OVERDUE</Text>
        </View>
      )}

      <Text style={styles.cardTitle}>{workout.title}</Text>

      <View style={styles.cardMeta}>
        <View style={styles.metaRow}>
          <Feather name="clock" size={12} color="#9ba1b0" />
          <Text style={styles.metaText}>{lastText}</Text>
        </View>

        {lastSession && lastSession.totalVolume > 0 && (
          <View style={styles.metaRow}>
            <Feather name="trending-up" size={12} color="#9ba1b0" />
            <Text style={styles.metaText}>
              {lastSession.totalVolume.toLocaleString()} lbs
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.exerciseCount}>
          {workout.exercises.length} exercises
        </Text>
        <View style={[styles.startBtn, { backgroundColor: borderColor + '22', borderColor }]}>
          <Text style={[styles.startBtnText, { color: borderColor }]}>Start</Text>
          <Feather name="chevron-right" size={14} color={borderColor} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { sessions } = useWorkout();

  const upperLast = sessions.find((s) => s.workoutId === 'upper');
  const lowerLast = sessions.find((s) => s.workoutId === 'lower');

  const upperDays = upperLast ? daysSince(upperLast.completedAt) : null;
  const lowerDays = lowerLast ? daysSince(lowerLast.completedAt) : null;

  const showOverdueUpper =
    upperLast !== null && lowerLast !== null &&
    (upperDays ?? Infinity) > (lowerDays ?? Infinity);
  const showOverdueLower =
    upperLast !== null && lowerLast !== null &&
    (lowerDays ?? Infinity) > (upperDays ?? Infinity);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={styles.root}>
      {/* Animated blobs */}
      <View style={[styles.blob, styles.blobTeal]} />
      <View style={[styles.blob, styles.blobPurple]} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={styles.appTitle}>WORKOUT</Text>
          <Text style={styles.appSubtitle}>TRACKER</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={styles.gearBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="settings" size={22} color="#9ba1b0" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(32, insets.bottom + 16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>CHOOSE WORKOUT</Text>

        <WorkoutCard workoutId="upper" showOverdue={showOverdueUpper} />
        <WorkoutCard workoutId="lower" showOverdue={showOverdueLower} />

        <Text style={[styles.sectionLabel, { marginTop: 8 }]}>MORE</Text>

        <TouchableOpacity
          onPress={() => router.push('/history')}
          style={styles.historyCard}
          activeOpacity={0.82}
        >
          <View style={styles.historyCardIcon}>
            <Feather name="clock" size={20} color="#00e5ff" />
          </View>
          <View style={styles.historyCardBody}>
            <Text style={styles.historyCardTitle}>Workout History</Text>
            <Text style={styles.historyCardSub}>
              {sessions.length === 0
                ? 'No sessions yet'
                : `${sessions.length} session${sessions.length === 1 ? '' : 's'} logged`}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color="#9ba1b0" />
        </TouchableOpacity>
      </ScrollView>
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
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.12,
  },
  blobTeal: {
    backgroundColor: '#00e5ff',
    top: -80,
    left: -80,
  },
  blobPurple: {
    backgroundColor: '#7c3aed',
    bottom: -80,
    right: -80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  appTitle: {
    fontSize: 28,
    fontFamily: 'Outfit_700Bold',
    color: '#00e5ff',
    letterSpacing: 3,
    lineHeight: 30,
  },
  appSubtitle: {
    fontSize: 28,
    fontFamily: 'Outfit_300Light',
    color: '#ffffff',
    letterSpacing: 3,
    lineHeight: 30,
  },
  gearBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  sectionLabel: {
    color: '#9ba1b0',
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 2,
    marginBottom: 14,
    marginLeft: 4,
  },
  card: {
    backgroundColor: 'rgba(31,33,42,0.85)',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  overdueBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(255,59,48,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
  },
  overdueText: {
    color: '#ff3b30',
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1.5,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 10,
    paddingRight: 70,
  },
  cardMeta: {
    gap: 5,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#9ba1b0',
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseCount: {
    color: '#9ba1b0',
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  startBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31,33,42,0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.18)',
    padding: 16,
    marginBottom: 14,
    gap: 14,
  },
  historyCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(0,229,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCardBody: {
    flex: 1,
  },
  historyCardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 2,
  },
  historyCardSub: {
    color: '#9ba1b0',
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
  },
});
