import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform, Vibration } from 'react-native';

import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  type ActiveWorkout,
  type AppSettings,
  type Session,
} from '@/constants/storage';
import { WORKOUTS } from '@/constants/workouts';

interface RestTimer {
  exerciseId: string;
  totalSeconds: number;
  remaining: number;
}

interface WorkoutContextType {
  sessions: Session[];
  activeWorkout: ActiveWorkout | null;
  lastCompletedSession: Session | null;
  restTimer: RestTimer | null;
  substitutionExerciseId: string | null;
  settings: AppSettings;

  startWorkout: (workoutId: string) => void;
  updateSet: (exId: string, setNum: number, field: 'lbs' | 'reps' | 'done', value: number | boolean) => void;
  addSet: (exId: string) => void;
  substituteExercise: (exId: string, customTitle: string) => void;
  finishWorkout: () => Promise<Session | null>;
  dismissRestTimer: () => void;
  openSubstitutionSheet: (exId: string) => void;
  closeSubstitutionSheet: () => void;
  clearAllHistory: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  getLastSessionForExercise: (exerciseId: string, workoutId: string) => {
    setsCount: number;
    reps: number;
    lbs: number;
    date: string;
  } | null;
  getPRForExercise: (exerciseId: string, workoutId: string) => number | null;
  getPRsForSession: (session: Session) => Record<string, { oldPR: number | null; newMax: number; isNewPR: boolean }>;
}

const WorkoutContext = createContext<WorkoutContextType | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [lastCompletedSession, setLastCompletedSession] = useState<Session | null>(null);
  const [restTimer, setRestTimer] = useState<RestTimer | null>(null);
  const [substitutionExerciseId, setSubstitutionExerciseId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current);
    };
  }, []);

  const loadData = async () => {
    try {
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

      const [sessionsRaw, activeRaw, settingsRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SESSIONS),
        AsyncStorage.getItem(STORAGE_KEYS.ACTIVE),
        AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
      ]);
      if (sessionsRaw) setSessions(JSON.parse(sessionsRaw));
      if (activeRaw) setActiveWorkout(JSON.parse(activeRaw));
      if (settingsRaw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(settingsRaw) });
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

  const updateSet = useCallback((
    exId: string,
    setNum: number,
    field: 'lbs' | 'reps' | 'done',
    value: number | boolean,
  ) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      const key = `${exId}_${setNum}`;
      const existing = prev.sets[key] ?? { lbs: 0, reps: 0, done: false };
      const updated: ActiveWorkout = {
        ...prev,
        sets: { ...prev.sets, [key]: { ...existing, [field]: value } },
      };
      persistActive(updated);
      return updated;
    });

    // Start rest timer outside the state updater to always use current settings
    if (field === 'done' && value === true && settings.restTimerDuration > 0) {
      startRestTimer(exId, settings.restTimerDuration);
    }
  }, [persistActive, settings.restTimerDuration]);

  const addSet = useCallback((exId: string) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      const currentCount = prev.setCounts[exId] ?? 0;
      const newSetNum = currentCount + 1;
      const lastKey = `${exId}_${currentCount}`;
      const lastSet = prev.sets[lastKey] ?? { lbs: 0, reps: 0, done: false };
      const updated: ActiveWorkout = {
        ...prev,
        sets: {
          ...prev.sets,
          [`${exId}_${newSetNum}`]: { lbs: lastSet.lbs, reps: lastSet.reps, done: false },
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

  const finishWorkout = useCallback(async (): Promise<Session | null> => {
    if (!activeWorkout) return null;
    const workout = WORKOUTS[activeWorkout.workoutId];
    if (!workout) return null;

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
    setLastCompletedSession(newSession);
    await AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updatedSessions));
    setActiveWorkout(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE);
    if (timerRef.current) clearInterval(timerRef.current);
    if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current);
    setRestTimer(null);
    return newSession;
  }, [activeWorkout, sessions]);

  const triggerTimerDone = useCallback(() => {
    if (Platform.OS !== 'web') {
      // Native: double-pulse vibration
      Vibration.vibrate([0, 120, 80, 120]);
    } else if (typeof window !== 'undefined') {
      // Web (iOS Safari PWA): Web Audio API — two rising tones
      try {
        const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const playTone = (freq: number, start: number, dur: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.22, start + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
          osc.start(start);
          osc.stop(start + dur);
        };
        playTone(784, ctx.currentTime, 0.14);       // G5
        playTone(1047, ctx.currentTime + 0.16, 0.22); // C6
      } catch {
        // Audio not available — silent fallback
      }
    }
  }, []);

  const startRestTimer = useCallback((exerciseId: string, seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current);
    setRestTimer({ exerciseId, totalSeconds: seconds, remaining: seconds });
    // Schedule the done sound/haptic to fire exactly when the timer expires
    doneTimeoutRef.current = setTimeout(() => {
      triggerTimerDone();
    }, seconds * 1000);
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
  }, [triggerTimerDone]);

  const dismissRestTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (doneTimeoutRef.current) clearTimeout(doneTimeoutRef.current);
    setRestTimer(null);
  }, []);

  const openSubstitutionSheet = useCallback((exId: string) => {
    setSubstitutionExerciseId(exId);
  }, []);

  const closeSubstitutionSheet = useCallback(() => {
    setSubstitutionExerciseId(null);
  }, []);

  const clearAllHistory = useCallback(async () => {
    setSessions([]);
    await AsyncStorage.removeItem(STORAGE_KEYS.SESSIONS);
  }, []);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(next));
  }, [settings]);

  const getLastSessionForExercise = useCallback(
    (exerciseId: string, workoutId: string) => {
      const workoutSessions = sessions.filter((s) => s.workoutId === workoutId);
      for (const session of workoutSessions) {
        const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
        if (ex && ex.sets.length > 0) {
          const doneSets = ex.sets.filter((s) => s.done);
          if (doneSets.length === 0) continue;
          const avgLbs = doneSets.reduce((acc, s) => acc + s.lbs, 0) / doneSets.length;
          const avgReps = Math.round(doneSets.reduce((acc, s) => acc + s.reps, 0) / doneSets.length);
          const date = new Date(session.completedAt);
          return {
            setsCount: doneSets.length,
            reps: avgReps,
            lbs: Math.round(avgLbs),
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          };
        }
      }
      return null;
    },
    [sessions],
  );

  const getPRForExercise = useCallback((exerciseId: string, _workoutId: string): number | null => {
    let maxLbs: number | null = null;
    for (const session of sessions) {
      const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
      if (ex) {
        for (const s of ex.sets) {
          if (s.done && s.lbs > 0) {
            if (maxLbs === null || s.lbs > maxLbs) maxLbs = s.lbs;
          }
        }
      }
    }
    return maxLbs;
  }, [sessions]);

  const getPRsForSession = useCallback((session: Session) => {
    const result: Record<string, { oldPR: number | null; newMax: number; isNewPR: boolean }> = {};
    const priorSessions = sessions.filter(
      (s) => s.workoutId === session.workoutId && s.id !== session.id,
    );
    for (const ex of session.exercises) {
      const doneSets = ex.sets.filter((s) => s.done && s.lbs > 0);
      if (doneSets.length === 0) continue;
      const newMax = Math.max(...doneSets.map((s) => s.lbs));
      let oldPR: number | null = null;
      for (const os of priorSessions) {
        const oex = os.exercises.find((e) => e.exerciseId === ex.exerciseId);
        if (oex) {
          for (const s of oex.sets) {
            if (s.done && s.lbs > 0 && (oldPR === null || s.lbs > oldPR)) oldPR = s.lbs;
          }
        }
      }
      result[ex.exerciseId] = {
        oldPR,
        newMax,
        isNewPR: oldPR !== null && newMax > oldPR,
      };
    }
    return result;
  }, [sessions]);

  return (
    <WorkoutContext.Provider
      value={{
        sessions,
        activeWorkout,
        lastCompletedSession,
        restTimer,
        substitutionExerciseId,
        settings,
        startWorkout,
        updateSet,
        addSet,
        substituteExercise,
        finishWorkout,
        dismissRestTimer,
        openSubstitutionSheet,
        closeSubstitutionSheet,
        clearAllHistory,
        updateSettings,
        getLastSessionForExercise,
        getPRForExercise,
        getPRsForSession,
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
