import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { STORAGE_KEYS, type ActiveWorkout, type Session } from '@/constants/storage';
import { WORKOUTS } from '@/constants/workouts';

interface RestTimer {
  exerciseId: string;
  totalSeconds: number;
  remaining: number;
}

interface WorkoutContextType {
  sessions: Session[];
  activeWorkout: ActiveWorkout | null;
  restTimer: RestTimer | null;
  substitutionExerciseId: string | null;

  startWorkout: (workoutId: string) => void;
  updateSet: (exId: string, setNum: number, field: 'lbs' | 'reps' | 'done', value: number | boolean) => void;
  addSet: (exId: string) => void;
  substituteExercise: (exId: string, customTitle: string) => void;
  finishWorkout: () => void;
  dismissRestTimer: () => void;
  openSubstitutionSheet: (exId: string) => void;
  closeSubstitutionSheet: () => void;
  getLastSessionForExercise: (exerciseId: string, workoutId: string) => {
    setsCount: number;
    reps: number;
    lbs: number;
    date: string;
  } | null;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [restTimer, setRestTimer] = useState<RestTimer | null>(null);
  const [substitutionExerciseId, setSubstitutionExerciseId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadData = async () => {
    try {
      // Migrate legacy data
      const legacy = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY);
      if (legacy) {
        const legacyData = JSON.parse(legacy) as Array<Record<string, unknown>>;
        const migrated: Session[] = legacyData.map((entry) => ({
          id: String(entry.id ?? Date.now()),
          workoutId: String(entry.workoutId ?? ''),
          workoutTitle: String(entry.workoutTitle ?? ''),
          startedAt: String(entry.startedAt ?? new Date().toISOString()),
          completedAt: String(entry.completedAt ?? new Date().toISOString()),
          exercises: [],
          totalVolume: 0,
          totalSetsCompleted: 0,
        }));
        const existing = await AsyncStorage.getItem(STORAGE_KEYS.SESSIONS);
        const existingData = existing ? (JSON.parse(existing) as Session[]) : [];
        await AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify([...existingData, ...migrated]));
        await AsyncStorage.removeItem(STORAGE_KEYS.LEGACY);
      }

      const [sessionsRaw, activeRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SESSIONS),
        AsyncStorage.getItem(STORAGE_KEYS.ACTIVE),
      ]);
      if (sessionsRaw) setSessions(JSON.parse(sessionsRaw));
      if (activeRaw) setActiveWorkout(JSON.parse(activeRaw));
    } catch {}
  };

  const persistActive = useCallback(async (data: ActiveWorkout | null) => {
    if (data) {
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE, JSON.stringify(data));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE);
    }
  }, []);

  const startWorkout = useCallback((workoutId: string) => {
    const workout = WORKOUTS[workoutId];
    if (!workout) return;
    const setCounts: Record<string, number> = {};
    workout.exercises.forEach((ex) => {
      setCounts[ex.id] = ex.sets;
    });
    const newActive: ActiveWorkout = {
      workoutId,
      startedAt: new Date().toISOString(),
      sets: {},
      substitutions: {},
      setCounts,
    };
    setActiveWorkout(newActive);
    persistActive(newActive);
  }, [persistActive]);

  const updateSet = useCallback((exId: string, setNum: number, field: 'lbs' | 'reps' | 'done', value: number | boolean) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      const key = `${exId}_${setNum}`;
      const existing = prev.sets[key] ?? { lbs: 0, reps: 0, done: false };
      const updated: ActiveWorkout = {
        ...prev,
        sets: {
          ...prev.sets,
          [key]: { ...existing, [field]: value },
        },
      };

      if (field === 'done' && value === true) {
        const workout = WORKOUTS[prev.workoutId];
        const ex = workout?.exercises.find((e) => e.id === exId);
        if (ex && ex.restSeconds > 0) {
          startRestTimer(exId, ex.restSeconds);
        }
      }

      persistActive(updated);
      return updated;
    });
  }, [persistActive]);

  const addSet = useCallback((exId: string) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      const currentCount = prev.setCounts[exId] ?? 0;
      const newSetNum = currentCount + 1;
      const lastKey = `${exId}_${currentCount}`;
      const lastSet = prev.sets[lastKey] ?? { lbs: 0, reps: 0, done: false };
      const newKey = `${exId}_${newSetNum}`;
      const updated: ActiveWorkout = {
        ...prev,
        sets: {
          ...prev.sets,
          [newKey]: { lbs: lastSet.lbs, reps: lastSet.reps, done: false },
        },
        setCounts: { ...prev.setCounts, [exId]: newSetNum },
      };
      persistActive(updated);
      return updated;
    });
  }, [persistActive]);

  const substituteExercise = useCallback((exId: string, customTitle: string) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      const updated: ActiveWorkout = {
        ...prev,
        substitutions: { ...prev.substitutions, [exId]: customTitle },
      };
      persistActive(updated);
      return updated;
    });
    setSubstitutionExerciseId(null);
  }, [persistActive]);

  const finishWorkout = useCallback(async () => {
    if (!activeWorkout) return;
    const workout = WORKOUTS[activeWorkout.workoutId];
    if (!workout) return;

    const exercises = workout.exercises.map((ex) => {
      const count = activeWorkout.setCounts[ex.id] ?? ex.sets;
      const sets = Array.from({ length: count }, (_, i) => {
        const key = `${ex.id}_${i + 1}`;
        const s = activeWorkout.sets[key] ?? { lbs: 0, reps: 0, done: false };
        return { setNumber: i + 1, lbs: s.lbs, reps: s.reps, done: s.done };
      });
      return {
        exerciseId: ex.id,
        exerciseTitle: ex.title,
        customNameUsed: activeWorkout.substitutions[ex.id] ?? null,
        sets,
      };
    });

    let totalVolume = 0;
    let totalSetsCompleted = 0;
    exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.done) {
          totalVolume += s.lbs * s.reps;
          totalSetsCompleted++;
        }
      });
    });

    const newSession: Session = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      workoutId: activeWorkout.workoutId,
      workoutTitle: workout.title,
      startedAt: activeWorkout.startedAt,
      completedAt: new Date().toISOString(),
      exercises,
      totalVolume,
      totalSetsCompleted,
    };

    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    await AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updatedSessions));
    setActiveWorkout(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE);
    if (timerRef.current) clearInterval(timerRef.current);
    setRestTimer(null);
  }, [activeWorkout, sessions]);

  const startRestTimer = (exerciseId: string, seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestTimer({ exerciseId, totalSeconds: seconds, remaining: seconds });
    timerRef.current = setInterval(() => {
      setRestTimer((prev) => {
        if (!prev) return null;
        if (prev.remaining <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return null;
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
  };

  const dismissRestTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestTimer(null);
  }, []);

  const openSubstitutionSheet = useCallback((exId: string) => {
    setSubstitutionExerciseId(exId);
  }, []);

  const closeSubstitutionSheet = useCallback(() => {
    setSubstitutionExerciseId(null);
  }, []);

  const getLastSessionForExercise = useCallback((exerciseId: string, workoutId: string) => {
    const workoutSessions = sessions.filter((s) => s.workoutId === workoutId);
    for (const session of workoutSessions) {
      const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
      if (ex && ex.sets.length > 0) {
        const doneSets = ex.sets.filter((s) => s.done);
        if (doneSets.length === 0) continue;
        const avgLbs = doneSets.reduce((acc, s) => acc + s.lbs, 0) / doneSets.length;
        const avgReps = Math.round(doneSets.reduce((acc, s) => acc + s.reps, 0) / doneSets.length);
        const date = new Date(session.completedAt);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
          setsCount: doneSets.length,
          reps: avgReps,
          lbs: Math.round(avgLbs),
          date: dateStr,
        };
      }
    }
    return null;
  }, [sessions]);

  return (
    <WorkoutContext.Provider
      value={{
        sessions,
        activeWorkout,
        restTimer,
        substitutionExerciseId,
        startWorkout,
        updateSet,
        addSet,
        substituteExercise,
        finishWorkout,
        dismissRestTimer,
        openSubstitutionSheet,
        closeSubstitutionSheet,
        getLastSessionForExercise,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used within WorkoutProvider');
  return ctx;
}
