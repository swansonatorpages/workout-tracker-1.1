export interface Exercise {
  id: string;
  title: string;
  desc: string;
  sets: number;
  restSeconds: number;
  supersetWith?: string;
  substitutes: string[];
}

export interface Workout {
  id: string;
  title: string;
  exercises: Exercise[];
}

export const WORKOUTS: Record<string, Workout> = {
  upper: {
    id: 'upper',
    title: 'Upper Body Workout',
    exercises: [
      {
        id: 'ex1',
        title: 'A. Flat DB/Barbell Bench Press',
        desc: 'Control weight down, explode up. Too easy at 10 reps? Go heavier. (90 sec rest)',
        sets: 3,
        restSeconds: 90,
        substitutes: ['Incline DB Press', 'Cable Chest Fly', 'Machine Chest Press', 'Weighted Push-Up'],
      },
      {
        id: 'ex2',
        title: 'B. Bent-Over DB/Barbell Rows',
        desc: 'Pull weight to hip crease to engage lats. Squeeze at top.',
        sets: 3,
        restSeconds: 90,
        substitutes: ['Seated Cable Row', 'Single-Arm DB Row', 'Chest-Supported Row', 'Machine Row'],
      },
      {
        id: 'ex3',
        title: 'C. Incline Dumbbell Press',
        desc: 'Set bench to 30-deg. Keep continuous tension on upper chest. (60 sec rest)',
        sets: 3,
        restSeconds: 60,
        substitutes: ['Flat DB Press', 'Cable Upper Chest Fly', 'Smith Machine Incline Press', 'Incline Push-Up'],
      },
      {
        id: 'ex4',
        title: 'D. Lat Pulldowns (or Pull-ups)',
        desc: 'Full stretch at top. Drive elbows down to the floor.',
        sets: 3,
        restSeconds: 90,
        substitutes: ['Pull-ups', 'Assisted Pull-up Machine', 'Straight-Arm Cable Pulldown', 'Single-Arm Cable Pulldown'],
      },
      {
        id: 'ex5',
        title: 'E1. Dumbbell Bicep Curls',
        desc: 'Superset into E2. Keep elbows pinned to sides. (No rest)',
        sets: 3,
        restSeconds: 0,
        supersetWith: 'ex6',
        substitutes: ['Cable Bicep Curl', 'EZ-Bar Curl', 'Hammer Curl', 'Concentration Curl'],
      },
      {
        id: 'ex6',
        title: 'E2. Overhead Triceps Ext.',
        desc: 'Full lockout at top to maximally contract triceps.',
        sets: 3,
        restSeconds: 60,
        supersetWith: 'ex5',
        substitutes: ['Tricep Rope Pushdown', 'Close-Grip Push-Up', 'Skull Crusher', 'Single-Arm Cable Pushdown'],
      },
    ],
  },
  lower: {
    id: 'lower',
    title: 'Lower Body Workout',
    exercises: [
      {
        id: 'lower1',
        title: '1. Dumbbell Romanian Deadlift (RDL)',
        desc: '8-10 reps. 3-sec lowering phase. Eccentric overload for hamstrings.',
        sets: 3,
        restSeconds: 90,
        substitutes: ['Cable Pull-Through', 'Single-Leg RDL', 'Barbell RDL', 'Nordic Hamstring Curl'],
      },
      {
        id: 'lower2',
        title: '2. Dumbbell Reverse Lunges',
        desc: '8-10 reps/leg. Controlled step back, explosive drive up.',
        sets: 3,
        restSeconds: 60,
        substitutes: ['Split Squat', 'Bulgarian Split Squat', 'Step-Ups', 'Goblet Squat'],
      },
      {
        id: 'lower3',
        title: '3. Weighted Glute Bridges',
        desc: '12-15 reps. 2-sec hold at top. Pure hip extension.',
        sets: 3,
        restSeconds: 45,
        substitutes: ['Hip Thrust (bench)', 'Cable Kickback', 'Donkey Kick', 'Single-Leg Glute Bridge'],
      },
    ],
  },
};
