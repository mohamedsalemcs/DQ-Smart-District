import { format, formatDistanceToNowStrict } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { ISO } from '../types';

export const nowISO = (): ISO => new Date().toISOString();

export const minutesAgo = (m: number): ISO =>
  new Date(Date.now() - m * 60_000).toISOString();

export const hoursAgo = (h: number): ISO => minutesAgo(h * 60);

export const daysAgo = (d: number): ISO => minutesAgo(d * 24 * 60);

export const daysFromNow = (d: number): ISO => minutesAgo(-d * 24 * 60);

export const hoursFromNow = (h: number): ISO => minutesAgo(-h * 60);

/** 14 يوليو 2026 · 09:42 — Gregorian, Arabic month names, Western digits */
export const fmtDateTime = (s: ISO) =>
  format(new Date(s), 'd MMMM yyyy · HH:mm', { locale: ar });

export const fmtDate = (s: ISO) => format(new Date(s), 'd MMMM yyyy', { locale: ar });

export const fmtTime = (s: ISO) => format(new Date(s), 'HH:mm', { locale: ar });

/** «قبل ٣ دقائق» style relative time (Western digits) */
export const ago = (s: ISO) =>
  formatDistanceToNowStrict(new Date(s), { locale: ar, addSuffix: true });

/** mm:ss elapsed since an ISO timestamp */
export const elapsedSince = (s: ISO, until?: ISO) => {
  const ms = (until ? new Date(until).getTime() : Date.now()) - new Date(s).getTime();
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

export const secondsToClock = (sec: number) => {
  const mm = Math.floor(sec / 60);
  const ss = Math.round(sec % 60);
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

export const isPast = (s?: ISO) => !!s && new Date(s).getTime() < Date.now();

export const withinWindow = (fromISO: ISO, toISO: ISO) => {
  const t = Date.now();
  return t >= new Date(fromISO).getTime() && t <= new Date(toISO).getTime();
};
