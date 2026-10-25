import { DAY_MS } from './constants.js';

// India Standard Time offset: day boundaries follow the patient's local day.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function dayIndex(ts) {
  return Math.floor((ts + IST_OFFSET_MS) / DAY_MS);
}

export function dayPostOp(now, surgeryTs) {
  return dayIndex(now) - dayIndex(surgeryTs);
}

export function fmtDay(ts) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
}

export function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

export function fmtDuration(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h < 24) return r ? `${h} h ${r} min` : `${h} h`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}
