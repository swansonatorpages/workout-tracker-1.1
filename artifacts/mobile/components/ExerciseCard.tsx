import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useWorkout } from '@/context/WorkoutContext';

interface SetRow {
  setNumber: number;
  lbs: number;
  reps: number;
  done: boolean;
}

interface ExerciseCardProps {
  exerciseId: string;
  workoutId: string;
  title: string;
  customTitle: string | undefined;
  desc: string;
  sets: SetRow[];
  isSuperset?: boolean;
  onOpenSubstitution: () => void;
}

function AnimatedCheckbox({ done, onPress }: { done: boolean; onPress: () => void }) {
  const scaleAnim = React.useRef(new Animated.Value(done ? 1 : 0.5)).current;
  const opacityAnim = React.useRef(new Animated.Value(done ? 1 : 0.4)).current;

  useEffect(() => {
    if (done) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true, tension: 200, friction: 8 }),
        Animated.timing(opacityAnim, { toValue: 0.35, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [done]);

  return (
    <TouchableOpacity onPress={onPress} style={styles.checkboxTap} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.checkbox,
          done && styles.checkboxDone,
          { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
        ]}
      >
        {done && <Text style={styles.checkmark}>✓</Text>}
      </Animated.View>
    </TouchableOpacity>
  );
}

export function ExerciseCard({
  exerciseId,
  workoutId,
  title,
  customTitle,
  desc,
  sets,
  isSuperset = false,
  onOpenSubstitution,
}: ExerciseCardProps) {
  const { updateSet, addSet, getLastSessionForExercise, getPRForExercise } = useWorkout();

  const [localLbs, setLocalLbs] = useState<Record<number, string>>({});
  const [localReps, setLocalReps] = useState<Record<number, string>>({});

  useEffect(() => {
    const newLbs: Record<number, string> = {};
    const newReps: Record<number, string> = {};
    sets.forEach((s) => {
      if (localLbs[s.setNumber] === undefined) newLbs[s.setNumber] = s.lbs > 0 ? String(s.lbs) : '';
      if (localReps[s.setNumber] === undefined) newReps[s.setNumber] = s.reps > 0 ? String(s.reps) : '';
    });
    if (Object.keys(newLbs).length > 0) setLocalLbs((prev) => ({ ...prev, ...newLbs }));
    if (Object.keys(newReps).length > 0) setLocalReps((prev) => ({ ...prev, ...newReps }));
  }, [sets.length]);

  const lastSession = getLastSessionForExercise(exerciseId, workoutId);
  const historicalPR = getPRForExercise(exerciseId, workoutId);
  const allDone = sets.length > 0 && sets.every((s) => s.done);
  const displayTitle = customTitle ?? title;

  const handleLbsBlur = useCallback((setNum: number) => {
    const val = parseFloat(localLbs[setNum] ?? '0') || 0;
    updateSet(exerciseId, setNum, 'lbs', val);
  }, [localLbs, exerciseId, updateSet]);

  const handleRepsBlur = useCallback((setNum: number) => {
    const val = parseInt(localReps[setNum] ?? '0', 10) || 0;
    updateSet(exerciseId, setNum, 'reps', val);
  }, [localReps, exerciseId, updateSet]);

  const handleDone = useCallback((setNum: number, current: boolean) => {
    const newDone = !current;
    updateSet(exerciseId, setNum, 'done', newDone);
    if (newDone) {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [exerciseId, updateSet]);

  return (
    <View style={[styles.card, allDone && styles.cardSuccess, isSuperset && styles.cardSuperset]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>{displayTitle}</Text>
        <TouchableOpacity onPress={onOpenSubstitution} style={styles.pencilBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.pencil}>✏</Text>
        </TouchableOpacity>
      </View>

      {/* Coaching note */}
      <Text style={styles.desc}>{desc}</Text>

      {/* Last session + PR line */}
      <View style={styles.historyRow}>
        <Text style={styles.lastSession}>
          {lastSession
            ? `Last: ${lastSession.setsCount}×${lastSession.reps} @ ${lastSession.lbs} lbs · ${lastSession.date}`
            : 'First time — no history yet'}
        </Text>
        {historicalPR !== null && (
          <Text style={styles.prLine}>🏆 {historicalPR} lbs</Text>
        )}
      </View>

      {/* Table header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.colHead, styles.colSet]}>SET</Text>
        <Text style={[styles.colHead, styles.colNum]}>LBS</Text>
        <Text style={[styles.colHead, styles.colNum]}>REPS</Text>
        <Text style={[styles.colHead, styles.colDone]}>DONE</Text>
      </View>

      {/* Set rows */}
      {sets.map((s) => {
        const currentLbs = parseFloat(localLbs[s.setNumber] || '0') || 0;
        const isNewPR = historicalPR !== null && currentLbs > historicalPR && currentLbs > 0;
        return (
          <View key={s.setNumber} style={[styles.row, s.done && styles.rowDone, isNewPR && styles.rowPR]}>
            <Text style={[styles.colSet, styles.setNum]}>{s.setNumber}</Text>
            <TextInput
              style={[styles.input, styles.colNum, isNewPR && styles.inputPR]}
              value={localLbs[s.setNumber] ?? ''}
              onChangeText={(t) => setLocalLbs((prev) => ({ ...prev, [s.setNumber]: t }))}
              onBlur={() => handleLbsBlur(s.setNumber)}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="0"
              placeholderTextColor="rgba(155,161,176,0.4)"
              selectTextOnFocus
              returnKeyType="done"
            />
            <TextInput
              style={[styles.input, styles.colNum]}
              value={localReps[s.setNumber] ?? ''}
              onChangeText={(t) => setLocalReps((prev) => ({ ...prev, [s.setNumber]: t }))}
              onBlur={() => handleRepsBlur(s.setNumber)}
              keyboardType="number-pad"
              inputMode="numeric"
              placeholder="0"
              placeholderTextColor="rgba(155,161,176,0.4)"
              selectTextOnFocus
              returnKeyType="done"
            />
            <View style={[styles.colDone, { flexDirection: 'column', alignItems: 'center' }]}>
              <AnimatedCheckbox done={s.done} onPress={() => handleDone(s.setNumber, s.done)} />
              {isNewPR && <Text style={styles.prRowBadge}>PR!</Text>}
            </View>
          </View>
        );
      })}

      {/* Add Set row */}
      <TouchableOpacity onPress={() => addSet(exerciseId)} style={styles.addSetRow} activeOpacity={0.7}>
        <Text style={styles.addSetText}>+ Add Set</Text>
      </TouchableOpacity>

      {/* Success overlay */}
      {allDone && (
        <View style={styles.successBadge}>
          <Text style={styles.successText}>COMPLETE</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(31,33,42,0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardSuccess: {
    borderColor: 'rgba(46,235,124,0.5)',
    backgroundColor: 'rgba(31,42,35,0.9)',
  },
  cardSuperset: {
    borderLeftColor: '#00e5ff',
    borderLeftWidth: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Outfit_600SemiBold',
    lineHeight: 20,
    marginRight: 8,
  },
  pencilBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pencil: {
    fontSize: 16,
    color: '#9ba1b0',
  },
  desc: {
    color: '#9ba1b0',
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 18,
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  prLine: {
    color: '#FFB800',
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    marginLeft: 8,
  },
  rowPR: {
    backgroundColor: 'rgba(255,184,0,0.06)',
    borderRadius: 8,
  },
  inputPR: {
    color: '#FFB800',
    backgroundColor: 'rgba(255,184,0,0.1)',
  },
  prRowBadge: {
    color: '#FFB800',
    fontSize: 9,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  lastSession: {
    color: '#9ba1b0',
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    fontStyle: 'italic',
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  colHead: {
    color: '#9ba1b0',
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 1,
  },
  colSet: {
    width: 32,
    textAlign: 'center',
  },
  colNum: {
    flex: 1,
    textAlign: 'center',
  },
  colDone: {
    width: 48,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 2,
  },
  rowDone: {
    backgroundColor: 'rgba(46,235,124,0.06)',
  },
  setNum: {
    color: '#9ba1b0',
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
  },
  input: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Outfit_500Medium',
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingVertical: 8,
    marginHorizontal: 4,
    minHeight: 40,
  },
  checkboxTap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: '#2eeb7c',
    borderColor: '#2eeb7c',
  },
  checkmark: {
    color: '#0b0c10',
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
  },
  addSetRow: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.25)',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addSetText: {
    color: '#00e5ff',
    fontSize: 13,
    fontFamily: 'Outfit_500Medium',
  },
  successBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(46,235,124,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(46,235,124,0.3)',
  },
  successText: {
    color: '#2eeb7c',
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
  },
});
