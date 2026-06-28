import { format } from 'date-fns';

export function getAppNow() {
  return new Date();
}

export function getAppTodayIso() {
  return format(getAppNow(), 'yyyy-MM-dd');
}
