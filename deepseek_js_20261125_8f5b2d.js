/* srs.js — Répétition espacée SM-2 simplifié */

export const QUALITY = { AGAIN: 0, HARD: 3, GOOD: 4, EASY: 5 };
export const MIN_EASE = 1.3;
export const DEFAULT_EASE = 2.5;
const DAY_MS = 864e5;
export const today = () => Math.floor(Date.now() / DAY_MS);

export function newCard(surah, ayah, now = today()) {
  return {
    surah, ayah,
    step: 0,
    interval: 0,
    ease: DEFAULT_EASE,
    due: now,
    reps: 0,
    lapses: 0,
    lastQuality: null,
    createdAt: now,
    history: []
  };
}

export function review(card, quality, now = today()) {
  if (![0, 3, 4, 5].includes(quality)) {
    throw new Error('quality doit être 0, 3, 4 ou 5');
  }
  const c = { ...card, history: [...(card.history || [])] };
  c.reps++;
  c.lastQuality = quality;
  c.history.push({ d: now, q: quality });

  if (quality === QUALITY.AGAIN) {
    c.lapses++;
    c.step = 0;
    c.interval = 1;
    c.ease = Math.max(MIN_EASE, c.ease - 0.20);
    c.due = now + 1;
    return c;
  }

  c.ease = Math.max(MIN_EASE,
    c.ease + (0.1 - (5 - quality) * 0.08)
  );

  if (c.step === 0) {
    c.interval = quality === QUALITY.EASY ? 4 : 1;
  } else if (c.step === 1) {
    c.interval = quality === QUALITY.HARD ? 3
               : quality === QUALITY.EASY ? 8
               : 6;
  } else {
    const mult = quality === QUALITY.HARD ? 1.2
               : quality === QUALITY.EASY ? 1.4
               : 1.0;
    c.interval = Math.round(c.interval * c.ease * mult);
  }

  c.step = Math.min(c.step + 1, 7);
  c.due = now + c.interval;
  return c;
}

export function dueCards(cards, now = today()) {
  return Object.entries(cards)
    .filter(([, c]) => c.due <= now)
    .map(([key, c]) => ({ key, ...c }))
    .sort((a, b) => a.due - b.due);
}

export function stats(cards, days = 30) {
  const now = today();
  const byDay = {};
  let total = 0, correct = 0;

  for (const c of Object.values(cards)) {
    for (const h of c.history || []) {
      if (h.d < now - days) continue;
      const key = isoDate(h.d);
      byDay[key] ||= { reviews: 0, correct: 0 };
      byDay[key].reviews++;
      total++;
      if (h.q >= QUALITY.GOOD) { byDay[key].correct++; correct++; }
    }
  }

  let streak = 0, run = 0;
  for (let i = 0; i < 365; i++) {
    const d = isoDate(now - i);
    if (byDay[d]?.reviews > 0) run++;
    else break;
  }
  streak = run;

  run = 0;
  let best = 0;
  const allDays = Object.keys(byDay).sort();
  for (let i = 0; i < allDays.length; i++) {
    if (i === 0) { run = 1; best = 1; continue; }
    const prev = new Date(allDays[i-1]);
    const cur  = new Date(allDays[i]);
    const diff = Math.round((cur - prev) / DAY_MS);
    run = diff === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  best = Math.max(best, streak);

  return {
    total, correct,
    accuracy: total ? Math.round(correct / total * 100) : 0,
    byDay, streak, best
  };
}

function isoDate(dayNum) {
  const d = new Date(dayNum * DAY_MS);
  return d.toISOString().slice(0, 10);
}