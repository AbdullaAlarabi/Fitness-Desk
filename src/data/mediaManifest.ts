import { assetUrl } from '../lib/assets';

export type MediaAsset = {
  imageUrl: string;
  alt: string;
  objectPosition?: string;
};

export type ExerciseMediaType = 'image' | 'gif' | 'video_placeholder';
export type ExerciseMediaStatus = 'approved' | 'placeholder';

export type ExerciseMediaConfig = {
  mediaThumbnailUrl: string;
  mediaFullUrl: string;
  mediaType: ExerciseMediaType;
  mediaAlt: string;
  mediaStatus: ExerciseMediaStatus;
};

const DEMO_ROOT = 'media/training/exercises/demo';
const THUMB_ROOT = 'media/training/exercises/thumbs';

const placeholderMedia = {
  exerciseDemo: {
    imageUrl: assetUrl('media/training/placeholders/exercise_demo_placeholder.svg'),
    alt: 'Exercise demo image not available yet',
    objectPosition: 'center center'
  }
} satisfies Record<string, MediaAsset>;

export const todayHeroMedia = {
  strength: {
    imageUrl: assetUrl('media/training/heroes/today_hero_strength.png'),
    alt: 'Strength training hero image',
    objectPosition: 'center right'
  },
  run: {
    imageUrl: assetUrl('media/training/heroes/today_hero_run.png'),
    alt: 'Running training hero image',
    objectPosition: 'center right'
  },
  recovery: {
    imageUrl: assetUrl('media/training/heroes/today_hero_recovery.png'),
    alt: 'Recovery and walking hero image',
    objectPosition: 'center right'
  }
} satisfies Record<'strength' | 'run' | 'recovery', MediaAsset>;

export const dayCoverMedia: Record<number, MediaAsset> = {
  1: {
    imageUrl: assetUrl('media/training/day-covers/day_01_push_cover.png'),
    alt: 'Push cover image for chest, shoulders, and triceps',
    objectPosition: 'center center'
  },
  2: {
    imageUrl: assetUrl('media/training/day-covers/day_02_pull_cover.png'),
    alt: 'Pull cover image for back, rear delts, and biceps',
    objectPosition: 'center center'
  },
  3: {
    imageUrl: assetUrl('media/training/day-covers/day_03_legs_core_run_cover.png'),
    alt: 'Legs, core, and run intervals cover image',
    objectPosition: 'center center'
  },
  4: {
    imageUrl: assetUrl('media/training/day-covers/day_04_rest_walking_cover.png'),
    alt: 'Rest and walking recovery cover image',
    objectPosition: 'center center'
  },
  5: {
    imageUrl: assetUrl('media/training/day-covers/day_05_upper_shape_cover.png'),
    alt: 'Upper Shape cover image for shoulders, chest, and back',
    objectPosition: 'center center'
  },
  6: {
    imageUrl: assetUrl('media/training/day-covers/day_06_run_arms_core_cover.png'),
    alt: 'Run plus arms and core cover image',
    objectPosition: 'center center'
  },
  7: {
    imageUrl: assetUrl('media/training/day-covers/day_07_rest_walking_cover.png'),
    alt: 'Rest and walking recovery cover image',
    objectPosition: 'center center'
  }
};

const exerciseMediaLibrary: Record<string, ExerciseMediaConfig> = {
  'day1-incline-chest-press-machine': approvedMedia('exercise_incline_machine_chest_press', 'Incline chest press machine exercise demo'),
  'day1-seated-chest-press-machine': approvedMedia('exercise_seated_chest_press_machine', 'Seated chest press machine exercise demo'),
  'day1-pec-deck-or-cable-fly': approvedMedia('exercise_pec_deck_chest_fly', 'Pec deck chest fly machine exercise demo'),
  'day1-shoulder-press-machine': approvedMedia('exercise_machine_shoulder_press', 'Machine shoulder press exercise demo'),
  'day1-lateral-raise': approvedMedia('exercise_machine_lateral_raise', 'Machine lateral raise exercise demo'),
  'day1-rope-triceps-pushdown': approvedMedia('exercise_rope_triceps_pushdown', 'Rope triceps pushdown exercise demo'),
  'day2-lat-pulldown': approvedMedia('exercise_wide_grip_lat_pulldown', 'Wide-grip lat pulldown exercise demo'),
  'day2-chest-supported-row': approvedMedia('exercise_chest_supported_row_machine', 'Chest-supported row machine exercise demo'),
  'day2-seated-cable-row': approvedMedia('exercise_seated_cable_row', 'Seated cable row exercise demo'),
  'day2-straight-arm-pulldown': approvedMedia('exercise_straight_arm_cable_pulldown', 'Straight-arm cable pulldown exercise demo'),
  'day2-reverse-pec-deck': approvedMedia('exercise_reverse_pec_deck', 'Reverse pec deck exercise demo'),
  'day2-cable-curl': approvedMedia('exercise_machine_preacher_curl', 'Machine preacher curl exercise demo'),
  'day2-face-pull': approvedMedia('exercise_face_pull', 'Face pull exercise demo'),
  'day3-leg-press': approvedMedia('exercise_leg_press', 'Leg press exercise demo'),
  'day3-leg-extension': approvedMedia('exercise_leg_extension', 'Leg extension exercise demo'),
  'day3-leg-curl': approvedMedia('exercise_lying_leg_curl_machine', 'Lying leg curl machine exercise demo'),
  'day3-calf-raise': approvedMedia('exercise_calf_raise_machine', 'Calf raise machine exercise demo'),
  'day3-cable-crunch': approvedMedia('exercise_cable_crunch', 'Cable crunch exercise demo'),
  'day3-plank': approvedMedia('exercise_plank', 'Plank exercise demo'),
  'day5-incline-chest-press-machine': approvedMedia('exercise_incline_machine_chest_press', 'Incline chest press machine exercise demo'),
  'day5-neutral-grip-lat-pulldown': approvedMedia('exercise_neutral_grip_lat_pulldown', 'Neutral-grip lat pulldown exercise demo'),
  'day5-machine-lateral-raise': approvedMedia('exercise_machine_lateral_raise', 'Machine lateral raise exercise demo'),
  'day5-pec-deck-or-cable-fly': approvedMedia('exercise_pec_deck_chest_fly', 'Pec deck chest fly machine exercise demo'),
  'day5-seated-row-machine': approvedMedia('exercise_seated_cable_row', 'Seated cable row exercise demo'),
  'day5-reverse-pec-deck-or-face-pull': approvedMedia('exercise_reverse_pec_deck', 'Reverse pec deck exercise demo'),
  'day5-optional-rope-triceps-pushdown': approvedMedia('exercise_rope_triceps_pushdown', 'Rope triceps pushdown exercise demo'),
  'day5-optional-cable-curl': approvedMedia('exercise_machine_preacher_curl', 'Machine preacher curl exercise demo'),
  'day6-rope-triceps-pushdown': approvedMedia('exercise_rope_triceps_pushdown', 'Rope triceps pushdown exercise demo'),
  'day6-machine-preacher-curl': approvedMedia('exercise_machine_preacher_curl', 'Machine preacher curl exercise demo'),
  'day6-overhead-cable-triceps-extension': approvedMedia('exercise_overhead_cable_triceps_extension', 'Overhead cable triceps extension exercise demo'),
  'day6-cable-hammer-curl': approvedMedia('exercise_cable_hammer_curl', 'Cable hammer curl exercise demo'),
  'day6-captain-chair-knee-raise': approvedMedia('exercise_captain_chair_knee_raise', 'Captain chair knee raise exercise demo'),
  'day6-pallof-press-or-plank': approvedMedia('exercise_pallof_press', 'Pallof press cable anti-rotation exercise demo')
};

export function getTodayHeroMedia(sessionType: 'gym' | 'run' | 'rest' | null | undefined) {
  if (sessionType === 'rest') return todayHeroMedia.recovery;
  if (sessionType === 'run') return todayHeroMedia.run;
  return todayHeroMedia.strength;
}

export function getDayCoverMedia(dayNumber: number) {
  return dayCoverMedia[dayNumber] ?? dayCoverMedia[7];
}

export function getExerciseMediaConfig(exerciseId: string, fallbackName: string) {
  if (exerciseMediaLibrary[exerciseId]) return exerciseMediaLibrary[exerciseId];

  const normalized = `${exerciseId} ${fallbackName}`.toLowerCase();

  if (normalized.includes('incline') && normalized.includes('chest')) {
    return approvedMedia('exercise_incline_machine_chest_press', 'Incline chest press machine exercise demo');
  }
  if (normalized.includes('seated chest press') || normalized.includes('machine chest press') || normalized.includes('chest press')) {
    return approvedMedia('exercise_seated_chest_press_machine', 'Seated chest press machine exercise demo');
  }
  if (normalized.includes('pec deck') || normalized.includes('chest fly') || normalized.includes('cable fly')) {
    return approvedMedia('exercise_pec_deck_chest_fly', 'Pec deck chest fly machine exercise demo');
  }
  if (normalized.includes('shoulder press')) {
    return approvedMedia('exercise_machine_shoulder_press', 'Machine shoulder press exercise demo');
  }
  if (normalized.includes('lateral raise')) {
    return approvedMedia('exercise_machine_lateral_raise', 'Machine lateral raise exercise demo');
  }
  if (normalized.includes('triceps pushdown')) {
    return approvedMedia('exercise_rope_triceps_pushdown', 'Rope triceps pushdown exercise demo');
  }
  if (normalized.includes('overhead') && normalized.includes('triceps')) {
    return approvedMedia('exercise_overhead_cable_triceps_extension', 'Overhead cable triceps extension exercise demo');
  }
  if (normalized.includes('neutral') && normalized.includes('lat pulldown')) {
    return approvedMedia('exercise_neutral_grip_lat_pulldown', 'Neutral-grip lat pulldown exercise demo');
  }
  if (normalized.includes('wide') && normalized.includes('lat pulldown')) {
    return approvedMedia('exercise_wide_grip_lat_pulldown', 'Wide-grip lat pulldown exercise demo');
  }
  if (normalized.includes('lat pulldown')) {
    return approvedMedia('exercise_wide_grip_lat_pulldown', 'Wide-grip lat pulldown exercise demo');
  }
  if (normalized.includes('chest-supported row')) {
    return approvedMedia('exercise_chest_supported_row_machine', 'Chest-supported row machine exercise demo');
  }
  if (normalized.includes('seated cable row') || normalized.includes('seated row')) {
    return approvedMedia('exercise_seated_cable_row', 'Seated cable row exercise demo');
  }
  if (normalized.includes('straight-arm')) {
    return approvedMedia('exercise_straight_arm_cable_pulldown', 'Straight-arm cable pulldown exercise demo');
  }
  if (normalized.includes('face pull')) {
    return approvedMedia('exercise_face_pull', 'Face pull exercise demo');
  }
  if (normalized.includes('reverse pec deck') || normalized.includes('rear delt')) {
    return approvedMedia('exercise_reverse_pec_deck', 'Reverse pec deck exercise demo');
  }
  if (normalized.includes('preacher curl') || normalized.includes('cable curl')) {
    return approvedMedia('exercise_machine_preacher_curl', 'Machine preacher curl exercise demo');
  }
  if (normalized.includes('hammer curl')) {
    return approvedMedia('exercise_cable_hammer_curl', 'Cable hammer curl exercise demo');
  }
  if (normalized.includes('leg press')) {
    return approvedMedia('exercise_leg_press', 'Leg press exercise demo');
  }
  if (normalized.includes('leg extension')) {
    return approvedMedia('exercise_leg_extension', 'Leg extension exercise demo');
  }
  if (normalized.includes('lying leg curl') || normalized.includes('leg curl')) {
    return approvedMedia('exercise_lying_leg_curl_machine', 'Lying leg curl machine exercise demo');
  }
  if (normalized.includes('calf raise')) {
    return approvedMedia('exercise_calf_raise_machine', 'Calf raise machine exercise demo');
  }
  if (normalized.includes('cable crunch')) {
    return approvedMedia('exercise_cable_crunch', 'Cable crunch exercise demo');
  }
  if (normalized.includes('captain chair')) {
    return approvedMedia('exercise_captain_chair_knee_raise', 'Captain chair knee raise exercise demo');
  }
  if (normalized.includes('pallof')) {
    return approvedMedia('exercise_pallof_press', 'Pallof press cable anti-rotation exercise demo');
  }
  if (normalized.includes('plank')) {
    return approvedMedia('exercise_plank', 'Plank exercise demo');
  }
  if (normalized.includes('interval') || normalized.includes('3.2') || normalized.includes('controlled run') || normalized.includes('tempo run') || normalized.includes('walking')) {
    return placeholder(fallbackName);
  }

  return placeholder(fallbackName);
}

export function getExerciseDemoPlaceholder() {
  return placeholderMedia.exerciseDemo;
}

function approvedMedia(baseName: string, alt: string): ExerciseMediaConfig {
  return {
    mediaThumbnailUrl: assetUrl(`${THUMB_ROOT}/${baseName}_thumb.png`),
    mediaFullUrl: assetUrl(`${DEMO_ROOT}/${baseName}_demo.png`),
    mediaType: 'image',
    mediaAlt: alt,
    mediaStatus: 'approved'
  };
}

function placeholder(name: string): ExerciseMediaConfig {
  return {
    mediaThumbnailUrl: placeholderMedia.exerciseDemo.imageUrl,
    mediaFullUrl: placeholderMedia.exerciseDemo.imageUrl,
    mediaType: 'image',
    mediaAlt: `${name} demo image not available yet`,
    mediaStatus: 'placeholder'
  };
}
