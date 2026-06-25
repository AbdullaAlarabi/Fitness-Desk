export type ExerciseMediaType = 'image' | 'gif' | 'video_placeholder';

export type ExerciseMediaConfig = {
  mediaThumbnailUrl: string;
  mediaFullUrl: string;
  mediaType: ExerciseMediaType;
  mediaAlt: string;
};

const placeholder = (name: string): ExerciseMediaConfig => ({
  mediaThumbnailUrl: '/fitness-desk/assets/exercises/demo-placeholder.svg',
  mediaFullUrl: '/fitness-desk/assets/exercises/demo-placeholder.svg',
  mediaType: 'image',
  mediaAlt: `${name} demo placeholder`
});

export const exerciseMediaLibrary: Record<string, ExerciseMediaConfig> = {
  'day1-incline-chest-press-machine': placeholder('Incline Chest Press Machine'),
  'day1-seated-chest-press-machine': placeholder('Seated Chest Press Machine'),
  'day1-pec-deck-or-cable-fly': placeholder('Pec Deck Machine or Cable Fly'),
  'day1-shoulder-press-machine': placeholder('Shoulder Press Machine'),
  'day1-lateral-raise': placeholder('Lateral Raise'),
  'day1-rope-triceps-pushdown': placeholder('Rope Triceps Pushdown'),
  'day2-lat-pulldown': placeholder('Lat Pulldown'),
  'day2-chest-supported-row': placeholder('Chest-Supported Row Machine'),
  'day2-seated-cable-row': placeholder('Seated Cable Row'),
  'day2-straight-arm-pulldown': placeholder('Straight-Arm Cable Pulldown'),
  'day2-reverse-pec-deck': placeholder('Reverse Pec Deck'),
  'day2-cable-curl': placeholder('Cable Curl or Machine Preacher Curl')
};

export function getExerciseMediaConfig(exerciseId: string, fallbackName: string) {
  return exerciseMediaLibrary[exerciseId] ?? placeholder(fallbackName);
}

