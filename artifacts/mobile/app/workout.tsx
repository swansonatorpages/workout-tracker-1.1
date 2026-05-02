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

import { ExerciseCard } from '@/components/ExerciseCard';
import { FinishBar } from '@/components/FinishBar';
import { ProgressRing } from '@/components/ProgressRing';
import { RestTimerBanner } from '@/components/RestTimerBanner';
import { SubstitutionSheet } from '@/components/SubstitutionSheet';
import { useWorkout } from '@/context/WorkoutContext';
import { WORKOUTS } from '@/constants/workouts';

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const {
    activeWorkout,
    restTimer,
    substitutionExerciseId,
    dismissRestTimer,
    openSubstitutionSheet,
    closeSubstitutionSheet,
    finishWorkout,
  } = useWorkout();

  const workout = activeWorkout ? WORKOUTS[activeWorkout.workoutId] : null;

  const { doneSets, totalSets, progress, exerciseGroups } = useMemo(() => {
    if (!workout || !activeWorkout) {
      return { doneSets: 0, totalSets: 0, progress: 0, exerciseGroups: [] };
    }

    let done = 0;
    let total = 0;

    const exercises = workout.exercises;

    // Build set rows per exercise
    const exercisesWithSets = exercises.map((ex) => {
      const count = activeWorkout.setCounts[ex.id] ?? ex.sets;
      const sets = Array.from({ length: count }, (_, i) => {
        const key = `${ex.id}_${i + 1}`;
        const s = activeWorkout.sets[key] ?? { lbs: 0, reps: 0, done: false };
        total++;
        if (s.done) done++;
        return { setNumber: i + 1, lbs: s.lbs, reps: s.reps, done: s.done };
      });
      return { exercise: ex, sets };
    });

    // Group superset exercises
    const groups: Array<{ type: 'single' | 'superset'; items: typeof exercisesWithSets }> = [];
    const processed = new Set<string>();

    for (const item of exercisesWithSets) {
      if (processed.has(item.exercise.id)) continue;
      if (item.exercise.supersetWith) {
        const partner = exercisesWithSets.find((e) => e.exercise.id === item.exercise.supersetWith);
        if (partner && !processed.has(partner.exercise.id)) {
          groups.push({ type: 'superset', items: [item, partner] });
          processed.add(item.exercise.id);
          processed.add(partner.exercise.id);
          continue;
        }
      }
      groups.push({ type: 'single', items: [item] });
      processed.add(item.exercise.id);
    }

    return {
      doneSets: done,
      totalSets: total,
      progress: total > 0 ? done / total : 0,
      exerciseGroups: groups,
    };
  }, [workout, activeWorkout]);

  const handleBack = () => {
    router.back();
  };

  const handleFinish = async () => {
    await finishWorkout();
    router.replace('/');
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  if (!workout || !activeWorkout) {
    return (
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No active workout</Text>
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.goHomeBtn}>
            <Text style={styles.goHomeBtnText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const subExercise = substitutionExerciseId
    ? workout.exercises.find((e) => e.id === substitutionExerciseId)
    : null;

  return (
    <View style={styles.root}>
      {/* Blobs */}
      <View style={[styles.blob, styles.blobTeal]} />
      <View style={[styles.blob, styles.blobPurple]} />

      {/* Rest timer banner */}
      {restTimer && (
        <RestTimerBanner
          remaining={restTimer.remaining}
          total={restTimer.totalSeconds}
          onDismiss={dismissRestTimer}
        />
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.workoutTitle} numberOfLines={1}>{workout.title}</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Progress section */}
      <View style={styles.progressSection}>
        <ProgressRing progress={progress} size={68} strokeWidth={6} />
        <View style={styles.progressInfo}>
          <Text style={styles.progressLabel}>
            {doneSets} <Text style={styles.progressTotal}>/ {totalSets} sets</Text>
          </Text>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </View>
      </View>

      {/* Exercise cards */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === 'web' ? 34 : 8 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {exerciseGroups.map((group, groupIndex) => {
          if (group.type === 'superset') {
            return (
              <View key={`group-${groupIndex}`} style={styles.supersetContainer}>
                <View style={styles.supersetLabel}>
                  <View style={styles.supersetDot} />
                  <Text style={styles.supersetLabelText}>SUPERSET</Text>
                  <View style={styles.supersetLine} />
                </View>
                {group.items.map(({ exercise, sets }) => (
                  <ExerciseCard
                    key={exercise.id}
                    exerciseId={exercise.id}
                    workoutId={activeWorkout.workoutId}
                    title={exercise.title}
                    customTitle={activeWorkout.substitutions[exercise.id]}
                    desc={exercise.desc}
                    sets={sets}
                    isSuperset
                    onOpenSubstitution={() => openSubstitutionSheet(exercise.id)}
                  />
                ))}
              </View>
            );
          }

          const { exercise, sets } = group.items[0];
          return (
            <ExerciseCard
              key={exercise.id}
              exerciseId={exercise.id}
              workoutId={activeWorkout.workoutId}
              title={exercise.title}
              customTitle={activeWorkout.substitutions[exercise.id]}
              desc={exercise.desc}
              sets={sets}
              onOpenSubstitution={() => openSubstitutionSheet(exercise.id)}
            />
          );
        })}
      </ScrollView>

      {/* Finish bar */}
      <FinishBar doneSets={doneSets} totalSets={totalSets} onFinish={handleFinish} />

      {/* Substitution sheet */}
      {substitutionExerciseId && subExercise && (
        <SubstitutionSheet
          exerciseId={substitutionExerciseId}
          workoutId={activeWorkout.workoutId}
          currentTitle={activeWorkout.substitutions[substitutionExerciseId] ?? subExercise.title}
          onClose={closeSubstitutionSheet}
        />
      )}
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
    bottom: 100,
    right: -60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  workoutTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 17,
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  progressInfo: {
    flex: 1,
  },
  progressLabel: {
    color: '#00e5ff',
    fontSize: 20,
    fontFamily: 'Outfit_700Bold',
    marginBottom: 8,
  },
  progressTotal: {
    color: '#9ba1b0',
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00e5ff',
    borderRadius: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  supersetContainer: {
    marginBottom: 4,
  },
  supersetLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    marginLeft: 4,
  },
  supersetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00e5ff',
  },
  supersetLabelText: {
    color: '#00e5ff',
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 2,
  },
  supersetLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,229,255,0.2)',
  },
  emptyState: {
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
  goHomeBtn: {
    backgroundColor: '#00e5ff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  goHomeBtnText: {
    color: '#0b0c10',
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
  },
});
