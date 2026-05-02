export const STORAGE_KEYS = {
  SESSIONS: 'wt_sessions',
  ACTIVE: 'wt_active',
  LEGACY: 'workoutHistory',
} as const;

export interface SetData {
  setNumber: number;
  lbs: number;
  reps: number;
  done: boolean;
}

export interface ExerciseSetData {
  exerciseId: string;
  exerciseTitle: string;
  customNameUsed: string | null;
  sets: SetData[];
}

export interface Session {
  id: string;
  workoutId: string;
  workoutTitle: string;
  startedAt: string;
  completedAt: string;
  exercises: ExerciseSetData[];
  totalVolume: number;
  totalSetsCompleted: number;
}

export interface ActiveWorkoutSets {
  [key: string]: { lbs: number; reps: number; done: boolean };
}

export interface ActiveWorkout {
  workoutId: string;
  startedAt: string;
  sets: ActiveWorkoutSets;
  substitutions: Record<string, string>;
  setCounts: Record<string, number>;
}
