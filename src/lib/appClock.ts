export const APP_REVIEW_DATE_ISO = '2026-06-27T12:00:00';

export function getAppNow() {
  return new Date(APP_REVIEW_DATE_ISO);
}

export function getAppTodayIso() {
  return APP_REVIEW_DATE_ISO.slice(0, 10);
}
