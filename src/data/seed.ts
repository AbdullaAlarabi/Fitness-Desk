export const profile = {
  name: 'Abdulla',
  age: 30,
  heightCm: 167,
  weightKg: 64,
  runCurrent: '20:00',
  runTarget: '15:00',
  sessionMinutes: 60,
  goal:
    'Body recomposition with broader shoulders, defined chest, smaller waist, toned legs, and reduced butt size.',
  trainingPreference:
    'Machine-based training, simple structure, no drop sets, no complicated supersets.'
};

export const weeklySplit = [
  { day: 'Day 1', label: 'Push', focus: 'Chest, shoulders, triceps' },
  { day: 'Day 2', label: 'Pull', focus: 'Back, rear delts, biceps' },
  { day: 'Day 3', label: 'Legs + Core + Run Intervals', focus: 'Quads, hamstrings, core, pacing' },
  { day: 'Day 4', label: 'Rest / Walking', focus: 'Recovery and steps' },
  { day: 'Day 5', label: 'Upper Shape', focus: 'Shoulders, chest, back' },
  { day: 'Day 6', label: '3.2 km Run + Arms/Core', focus: 'Controlled run, arms, trunk' },
  { day: 'Day 7', label: 'Rest / Walking', focus: 'Recovery and steps' }
];

export const supplements = [
  'Magnesium',
  'Zinc',
  'Biotin',
  'Omega 3',
  'Multivitamin',
  'Honey',
  'Protein shake',
  'Creatine'
];

export const todayWorkout = [
  { exercise: 'Machine Chest Press', sets: '3', reps: '8-10', rest: '90 sec', rpe: '7-8' },
  { exercise: 'Cable Lateral Raise', sets: '3', reps: '12-15', rest: '60 sec', rpe: '8' },
  { exercise: 'Incline Machine Press', sets: '3', reps: '10-12', rest: '75 sec', rpe: '7-8' },
  { exercise: 'Rope Triceps Pushdown', sets: '3', reps: '10-12', rest: '60 sec', rpe: '8' }
];

export const runProgress = [
  { month: 'Start', minutes: 20 },
  { month: 'M2', minutes: 19 },
  { month: 'M3', minutes: 18.25 },
  { month: 'M4', minutes: 17.5 },
  { month: 'M5', minutes: 16.25 },
  { month: 'M6', minutes: 15 }
];

export const adherence = [
  { week: 'W1', workouts: 5, runs: 2 },
  { week: 'W2', workouts: 4, runs: 2 },
  { week: 'W3', workouts: 5, runs: 1 },
  { week: 'W4', workouts: 5, runs: 2 }
];

export const bodyMetrics = [
  { label: 'Weight', value: '64.0 kg', note: 'Daily quick check-in' },
  { label: 'Body Fat', value: '19.8%', note: 'Weekly full check-in' },
  { label: 'Body Water', value: '56.1%', note: 'Weekly full check-in' },
  { label: 'Muscle', value: '47.6 kg', note: 'Weekly full check-in' }
];
