import { assetUrl } from '../lib/assets';

export type DayMediaConfig = {
  imageUrl: string;
  alt: string;
};

const dayCardMap: Record<number, DayMediaConfig> = {
  1: {
    imageUrl: assetUrl('media/training/day-cards/day_01_push_chest_shoulders_triceps.png'),
    alt: 'Push day card'
  },
  2: {
    imageUrl: assetUrl('media/training/day-cards/day_02_pull_back_rear_delts_biceps.png'),
    alt: 'Pull day card'
  },
  3: {
    imageUrl: assetUrl('media/training/day-cards/day_03_legs_core_run_intervals.png'),
    alt: 'Legs core and run intervals day card'
  },
  4: {
    imageUrl: assetUrl('media/training/day-cards/day_04_rest_walking.png'),
    alt: 'Rest walking recovery day card'
  },
  5: {
    imageUrl: assetUrl('media/training/day-cards/day_05_upper_shape_shoulders_chest_back.png'),
    alt: 'Upper Shape day card'
  },
  6: {
    imageUrl: assetUrl('media/training/day-cards/day_06_3_2km_run_arms_core.png'),
    alt: '3.2 km run and arms core day card'
  },
  7: {
    imageUrl: assetUrl('media/training/day-cards/day_07_rest_walking.png'),
    alt: 'Rest walking recovery day card'
  }
};

export function getDayMedia(dayNumber: number) {
  return dayCardMap[dayNumber] ?? dayCardMap[7];
}

