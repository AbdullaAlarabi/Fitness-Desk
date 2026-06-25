export type IntakeTiming = 'morning' | 'afternoon' | 'night' | 'post_workout';

export type IntakeScheduleItem = {
  id: string;
  name: string;
  timing: IntakeTiming;
  defaultReminderEnabled: boolean;
  notes?: string;
};

export const intakeSchedule: IntakeScheduleItem[] = [
  { id: 'biotin', name: 'Biotin', timing: 'morning', defaultReminderEnabled: true },
  { id: 'multivitamin', name: 'Multivitamin', timing: 'morning', defaultReminderEnabled: true },
  { id: 'omega-3', name: 'Omega 3', timing: 'morning', defaultReminderEnabled: true },
  { id: 'ashwagandha', name: 'Ashwagandha', timing: 'afternoon', defaultReminderEnabled: true },
  { id: 'zinc', name: 'Zinc', timing: 'afternoon', defaultReminderEnabled: true },
  { id: 'magnesium', name: 'Magnesium', timing: 'night', defaultReminderEnabled: true },
  { id: 'protein', name: 'Protein', timing: 'post_workout', defaultReminderEnabled: true },
  { id: 'creatine', name: 'Creatine', timing: 'post_workout', defaultReminderEnabled: true }
];

export const intakeTimingOrder: IntakeTiming[] = ['morning', 'afternoon', 'night', 'post_workout'];

export const intakeTimingLabels: Record<IntakeTiming, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Night',
  post_workout: 'Post-workout'
};

export function normalizeIntakeTiming(value: string | null | undefined): IntakeTiming {
  const timing = (value ?? '').toLowerCase().trim();
  if (timing.includes('post') || timing.includes('workout')) return 'post_workout';
  if (timing.includes('after')) return 'afternoon';
  if (timing.includes('night')) return 'night';
  return 'morning';
}

