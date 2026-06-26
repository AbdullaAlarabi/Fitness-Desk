import { assetUrl } from '../lib/assets';

export type ExerciseMediaType = 'image' | 'gif' | 'video_placeholder';

export type ExerciseMediaConfig = {
  mediaThumbnailUrl: string;
  mediaFullUrl: string;
  mediaType: ExerciseMediaType;
  mediaAlt: string;
};

const placeholder = (name: string): ExerciseMediaConfig => ({
  mediaThumbnailUrl: assetUrl('assets/exercises/demo-placeholder.svg'),
  mediaFullUrl: assetUrl('assets/exercises/demo-placeholder.svg'),
  mediaType: 'image',
  mediaAlt: `${name} demo image not available yet`
});

const media = (filename: string, alt: string): ExerciseMediaConfig => ({
  mediaThumbnailUrl: assetUrl(`media/training/exercises/${filename}`),
  mediaFullUrl: assetUrl(`media/training/exercises/${filename}`),
  mediaType: 'image',
  mediaAlt: alt
});

export const exerciseMediaLibrary: Record<string, ExerciseMediaConfig> = {
  'day1-incline-chest-press-machine': media('exercise_incline_machine_chest_press.png', 'Incline chest press machine demo'),
  'day1-seated-chest-press-machine': media('exercise_machine_chest_press.png', 'Seated chest press machine demo'),
  'day1-pec-deck-or-cable-fly': media('exercise_pec_deck_machine_chest_fly.png', 'Pec deck machine chest fly demo'),
  'day1-shoulder-press-machine': media('exercise_machine_shoulder_press.png', 'Shoulder press machine demo'),
  'day1-lateral-raise': media('exercise_cable_lateral_raise.png', 'Cable lateral raise demo'),
  'day1-rope-triceps-pushdown': media('exercise_rope_triceps_pushdown.png', 'Rope triceps pushdown demo'),
  'day2-lat-pulldown': media('exercise_lat_pulldown.png', 'Lat pulldown demo'),
  'day2-chest-supported-row': media('exercise_chest_supported_machine_row.png', 'Chest supported machine row demo'),
  'day2-seated-cable-row': media('exercise_seated_cable_row.png', 'Seated cable row demo'),
  'day2-straight-arm-pulldown': media('exercise_straight_arm_cable_pulldown.png', 'Straight arm cable pulldown demo'),
  'day2-reverse-pec-deck': media('exercise_reverse_pec_deck_rear_delt.png', 'Reverse pec deck rear delt demo'),
  'day2-cable-curl': media('exercise_machine_preacher_curl.png', 'Machine preacher curl demo'),
  'day2-face-pull': media('exercise_reverse_pec_deck_rear_delt.png', 'Rear delt and face pull demo'),
  'day3-leg-press': media('exercise_leg_press.png', 'Leg press demo'),
  'day3-leg-extension': media('exercise_leg_extension.png', 'Leg extension demo'),
  'day3-leg-curl': media('exercise_seated_leg_curl.png', 'Seated leg curl demo'),
  'day3-calf-raise': media('exercise_calf_raise.png', 'Calf raise demo'),
  'day3-cable-crunch': media('exercise_pallof_press.png', 'Core cable exercise demo'),
  'day3-plank': media('exercise_plank.png', 'Plank demo'),
  'day5-incline-chest-press-machine': media('exercise_incline_machine_chest_press.png', 'Incline chest press machine demo'),
  'day5-neutral-grip-lat-pulldown': media('exercise_lat_pulldown.png', 'Neutral grip lat pulldown demo'),
  'day5-machine-lateral-raise': media('exercise_cable_lateral_raise.png', 'Lateral raise demo'),
  'day5-pec-deck-or-cable-fly': media('exercise_pec_deck_machine_chest_fly.png', 'Pec deck or cable fly demo'),
  'day5-seated-row-machine': media('exercise_seated_cable_row.png', 'Seated row machine demo'),
  'day5-reverse-pec-deck-or-face-pull': media('exercise_reverse_pec_deck_rear_delt.png', 'Reverse pec deck rear delt demo'),
  'day5-optional-rope-triceps-pushdown': media('exercise_rope_triceps_pushdown.png', 'Rope triceps pushdown demo'),
  'day5-optional-cable-curl': media('exercise_machine_preacher_curl.png', 'Machine preacher curl demo'),
  'day6-rope-triceps-pushdown': media('exercise_rope_triceps_pushdown.png', 'Rope triceps pushdown demo'),
  'day6-machine-preacher-curl': media('exercise_machine_preacher_curl.png', 'Machine preacher curl demo'),
  'day6-overhead-cable-triceps-extension': media('exercise_overhead_cable_triceps_extension.png', 'Overhead cable triceps extension demo'),
  'day6-cable-hammer-curl': media('exercise_cable_hammer_curl.png', 'Cable hammer curl demo'),
  'day6-captain-chair-knee-raise': media('exercise_captain_chair_knee_raise.png', 'Captain chair knee raise demo'),
  'day6-pallof-press-or-plank': media('exercise_pallof_press.png', 'Pallof press demo')
};

export function getExerciseMediaConfig(exerciseId: string, fallbackName: string) {
  if (exerciseMediaLibrary[exerciseId]) return exerciseMediaLibrary[exerciseId];

  const normalized = `${exerciseId} ${fallbackName}`.toLowerCase();
  if (normalized.includes('incline') && normalized.includes('chest')) return media('exercise_incline_machine_chest_press.png', 'Incline chest press machine demo');
  if (normalized.includes('chest press')) return media('exercise_machine_chest_press.png', 'Machine chest press demo');
  if (normalized.includes('pec deck') || normalized.includes('fly')) return media('exercise_pec_deck_machine_chest_fly.png', 'Pec deck machine chest fly demo');
  if (normalized.includes('shoulder press')) return media('exercise_machine_shoulder_press.png', 'Shoulder press machine demo');
  if (normalized.includes('lateral raise')) return media('exercise_cable_lateral_raise.png', 'Cable lateral raise demo');
  if (normalized.includes('triceps pushdown')) return media('exercise_rope_triceps_pushdown.png', 'Rope triceps pushdown demo');
  if (normalized.includes('overhead') && normalized.includes('triceps')) return media('exercise_overhead_cable_triceps_extension.png', 'Overhead cable triceps extension demo');
  if (normalized.includes('lat pulldown')) return media('exercise_lat_pulldown.png', 'Lat pulldown demo');
  if (normalized.includes('chest-supported row')) return media('exercise_chest_supported_machine_row.png', 'Chest supported machine row demo');
  if (normalized.includes('seated cable row') || normalized.includes('seated row')) return media('exercise_seated_cable_row.png', 'Seated cable row demo');
  if (normalized.includes('straight-arm')) return media('exercise_straight_arm_cable_pulldown.png', 'Straight arm cable pulldown demo');
  if (normalized.includes('reverse pec deck') || normalized.includes('rear delt') || normalized.includes('face pull')) return media('exercise_reverse_pec_deck_rear_delt.png', 'Reverse pec deck rear delt demo');
  if (normalized.includes('preacher curl') || normalized.includes('cable curl')) return media('exercise_machine_preacher_curl.png', 'Machine preacher curl demo');
  if (normalized.includes('hammer curl')) return media('exercise_cable_hammer_curl.png', 'Cable hammer curl demo');
  if (normalized.includes('leg press')) return media('exercise_leg_press.png', 'Leg press demo');
  if (normalized.includes('leg extension')) return media('exercise_leg_extension.png', 'Leg extension demo');
  if (normalized.includes('leg curl')) return media('exercise_seated_leg_curl.png', 'Seated leg curl demo');
  if (normalized.includes('calf raise')) return media('exercise_calf_raise.png', 'Calf raise demo');
  if (normalized.includes('captain chair')) return media('exercise_captain_chair_knee_raise.png', 'Captain chair knee raise demo');
  if (normalized.includes('pallof')) return media('exercise_pallof_press.png', 'Pallof press demo');
  if (normalized.includes('plank')) return media('exercise_plank.png', 'Plank demo');
  if (normalized.includes('interval')) return media('exercise_run_intervals.png', 'Run intervals demo');
  if (normalized.includes('3.2') || normalized.includes('controlled run') || normalized.includes('tempo run')) return media('exercise_3_2km_run.png', '3.2 km run demo');
  if (normalized.includes('walking')) return media('exercise_walking_recovery.png', 'Walking recovery demo');

  return placeholder(fallbackName);
}
