// Care-team-entered plans. No medicine, dose or protein target is prescribed by the app.
export function emptyCare() {
 return { medicines: [], doses: {}, proteinTarget: '', foodLogs: [], appointments: [], insurance: { provider: '', reference: '', status: 'Not started', notes: '' } };
}
export const EQUIPMENT = [
 { name: 'Walker or walking aid', phase: 'Discharge and early walking', note: 'Ask the physiotherapist to choose and fit the aid and teach you how to use it.', link: 'https://www.orthoinfo.org/recovery/how-to-use-crutches-canes-and-walkers' },
 { name: 'Stable chair and bathroom support', phase: 'Before returning home', note: 'Ask the hospital team whether a raised toilet seat, shower chair or grab rails suit your home.', link: 'https://www.orthoinfo.org/treatment/total-knee-replacement' },
 { name: 'Stationary exercise bike', phase: 'Later, when cleared by your physiotherapist', note: 'Discuss access or rental before buying. Start only when it is included in your personal plan.', link: 'https://www.orthoinfo.org/recovery/total-knee-replacement-exercise-guide' },
];
export const FOOD_IDEAS = ['Dal, beans or chickpeas', 'Milk, curd or paneer if suitable', 'Eggs, fish or lean meat if you eat them', 'Tofu or other suitable alternatives', 'Fruit, vegetables and regular balanced meals'];
export const localDay = (ts) => new Date(ts).toLocaleDateString('en-CA', {timeZone:'Asia/Kolkata'});
export function doseKey(id, time, ts) { return `${localDay(ts)}|${id}|${time}`; }
export function validateCare(c) {
 if (!c || !Array.isArray(c.medicines) || !Array.isArray(c.appointments) || !Array.isArray(c.foodLogs) || !c.doses || typeof c.doses !== 'object' || !c.insurance || typeof c.insurance !== 'object') return false;
 if (c.medicines.length > 100 || c.appointments.length > 200 || c.foodLogs.length > 2000) return false;
 if (c.proteinTarget !== '' && !(Number(c.proteinTarget) > 0 && Number(c.proteinTarget) <= 500)) return false;
 return c.medicines.every(m => typeof m.id === 'string' && typeof m.name === 'string' && m.name.trim() && typeof m.instructions === 'string' && Array.isArray(m.times) && m.times.length > 0 && m.times.every(t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t))) && c.appointments.every(a => typeof a.id === 'string' && typeof a.title === 'string' && Number.isFinite(a.at)) && c.foodLogs.every(f => typeof f.name === 'string' && Number.isFinite(f.ts) && Number.isFinite(f.protein) && f.protein >= 0);
}
