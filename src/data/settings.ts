export const profileSettings = {
  sex: 'male',
  age: 30,
  heightCm: 167,
  startingWeightKg: 64,
  surgeryHistoryNote: 'sleeve gastrectomy 2019',
  goalRunSeconds: 900,
  goalRunSummary: 'Reduce 3.2 km time from 20:00 to 15:00 with clean, consistent progress.'
} as const;

export const scaleSettings = {
  scaleBrand: 'unknown' as 'unknown' | 'Tanita-style' | 'Omron-style' | 'other',
  units: {
    weight: 'kg',
    waist: 'cm'
  }
} as const;

export const appSettings = {
  darkModeEnabled: false
} as const;

