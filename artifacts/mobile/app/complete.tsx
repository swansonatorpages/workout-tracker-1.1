import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
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
import { downloadSessionCSV } from '@/utils/csv';

function formatVolume(lbs: number, units: 'lbs' | 'kg') {
  const val = units === 'kg' ? Math.round(lbs / 2.205) : lbs;
  return val.toLocaleString() + ' ' + units;
}

export default function CompleteScreen() {
  const insets = useSafeAreaInsets();
  const { lastCompletedSession, sessions, settings, getPRsForSession } = useWorkout();
  const session = lastCompletedSession;

  const checkScale = useRef(new Animated.Value(0.4)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 8,
        }),
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
        delay: 100,
      }),
    ]).start();
  }, []);

  if (!session) {
    return (
      <View style={styles.root}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No session data</Text>
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Volume comparison
  const prevSession = sessions.find(
    (s) => s.workoutId === session.workoutId && s.id !== session.id,
  );
  const volumeDiff = prevSession ? session.totalVolume - prevSession.totalVolume : null;

  // PRs
  const prMap = getPRsForSession(session);
  const newPRs = Object.entries(prMap).filter(([, v]) => v.isNewPR);
  const workout = WORKOUTS[session.workoutId];

  // Substitutions used
  const substitutions = session.exercises.filter((e) => e.customNameUsed !== null);

  const date = new Date(session.completedAt);
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={styles.root}>
      <View style={[styles.blob, styles.blobTeal]} />
      <View style={[styles.blob, styles.blobPurple]} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPad + 32,
            paddingBottom: Math.max(40, insets.bottom + 24),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Checkmark */}
        <Animated.View
          style={[
            styles.checkCircle,
            { transform: [{ scale: checkScale }], opacity: checkOpacity },
          ]}
        >
          <Feather name="check" size={52} color="#0b0c10" />
        </Animated.View>

        <Animated.View style={{ opacity: contentOpacity, alignItems: 'center' }}>
          <Text style={styles.doneLabel}>Workout Complete</Text>
          <Text style={styles.workoutName}>{session.workoutTitle}</Text>
          <Text style={styles.dateText}>{dateStr} · {timeStr}</Text>

          {/* Stats cards */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{session.totalSetsCompleted}</Text>
              <Text style={styles.statLabel}>Sets Done</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatVolume(session.totalVolume, settings.units)}</Text>
              <Text style={styles.statLabel}>Total Volume</Text>
            </View>
          </View>

          {/* Volume comparison */}
          <View style={styles.comparisonCard}>
            {volumeDiff === null ? (
              <Text style={styles.comparisonMuted}>First session — no comparison</Text>
            ) : volumeDiff > 0 ? (
              <Text style={styles.comparisonUp}>
                ↑ {formatVolume(volumeDiff, settings.units)} more than last session
              </Text>
            ) : volumeDiff < 0 ? (
              <Text style={styles.comparisonDown}>
                ↓ {formatVolume(Math.abs(volumeDiff), settings.units)} less than last session
              </Text>
            ) : (
              <Text style={styles.comparisonMuted}>Same volume as last session</Text>
            )}
          </View>

          {/* Personal Records */}
          {newPRs.length > 0 && (
            <View style={styles.prCard}>
              <Text style={styles.prCardTitle}>🏆 Personal Records</Text>
              {newPRs.map(([exId, pr]) => {
                const ex = workout?.exercises.find((e) => e.id === exId);
                const sessionEx = session.exercises.find((e) => e.exerciseId === exId);
                const name = sessionEx?.customNameUsed ?? ex?.title ?? exId;
                return (
                  <View key={exId} style={styles.prRow}>
                    <Text style={styles.prExName} numberOfLines={1}>{name}</Text>
                    <View style={styles.prRowRight}>
                      <Text style={styles.prNewMax}>{pr.newMax} lbs</Text>
                      {pr.oldPR !== null && (
                        <Text style={styles.prOldMax}>was {pr.oldPR}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Substitutions */}
          {substitutions.length > 0 && (
            <View style={styles.subsCard}>
              <Text style={styles.subsTitle}>Exercises Swapped</Text>
              {substitutions.map((ex) => (
                <Text key={ex.exerciseId} style={styles.subRow}>
                  <Text style={styles.subCustom}>{ex.customNameUsed}</Text>
                  <Text style={styles.subFor}> for </Text>
                  <Text style={styles.subOriginal}>{ex.exerciseTitle}</Text>
                </Text>
              ))}
            </View>
          )}

          {/* Action buttons */}
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.replace('/')}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.csvBtn}
            onPress={() => downloadSessionCSV(session)}
            activeOpacity={0.8}
          >
            <Feather name="download" size={15} color="#9ba1b0" />
            <Text style={styles.csvBtnText}>Download CSV</Text>
          </TouchableOpacity>
        </Animated.View>
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
    opacity: 0.1,
  },
  blobTeal: {
    backgroundColor: '#00e5ff',
    top: -80,
    left: -60,
  },
  blobPurple: {
    backgroundColor: '#7c3aed',
    bottom: -60,
    right: -60,
  },
  scroll: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2eeb7c',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#2eeb7c',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  doneLabel: {
    color: '#2eeb7c',
    fontSize: 13,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 2,
    marginBottom: 6,
  },
  workoutName: {
    color: '#ffffff',
    fontSize: 24,
    fontFamily: 'Outfit_700Bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  dateText: {
    color: '#9ba1b0',
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 28,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(31,33,42,0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 22,
    fontFamily: 'Outfit_700Bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#9ba1b0',
    fontSize: 12,
    fontFamily: 'Outfit_500Medium',
  },
  comparisonCard: {
    width: '100%',
    backgroundColor: 'rgba(31,33,42,0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  comparisonUp: {
    color: '#2eeb7c',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  comparisonDown: {
    color: '#FF9800',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  comparisonMuted: {
    color: '#9ba1b0',
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  prCard: {
    width: '100%',
    backgroundColor: 'rgba(31,25,0,0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.35)',
    padding: 14,
    marginBottom: 12,
  },
  prCardTitle: {
    color: '#FFB800',
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  prExName: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
    flex: 1,
    marginRight: 8,
  },
  prRowRight: {
    alignItems: 'flex-end',
  },
  prNewMax: {
    color: '#FFB800',
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
  },
  prOldMax: {
    color: '#9ba1b0',
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
  },
  subsCard: {
    width: '100%',
    backgroundColor: 'rgba(31,33,42,0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    marginBottom: 12,
  },
  subsTitle: {
    color: '#9ba1b0',
    fontSize: 11,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  subRow: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    marginBottom: 4,
    lineHeight: 18,
  },
  subCustom: {
    color: '#00e5ff',
    fontFamily: 'Outfit_600SemiBold',
  },
  subFor: {
    color: '#9ba1b0',
  },
  subOriginal: {
    color: '#9ba1b0',
  },
  doneBtn: {
    backgroundColor: '#2eeb7c',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 40,
    marginTop: 20,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#0b0c10',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
  csvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  csvBtnText: {
    color: '#9ba1b0',
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    color: '#9ba1b0',
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
});
