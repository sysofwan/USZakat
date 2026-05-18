/** Hijri month names */
export const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  'Jumada al-Ula',
  'Jumada al-Thani',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  "Dhul Qi'dah",
  'Dhul Hijjah',
];

interface HijriDate {
  year: number;
  month: number;
  day: number;
}

/** Cached Intl formatter for Hijri dates (module-level singleton) */
const hijriFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

/** Parse Hijri parts from a Date using the cached formatter */
function parseHijriParts(date: Date): HijriDate {
  const parts = hijriFormatter.formatToParts(date);
  return {
    year: parseInt(parts.find((p) => p.type === 'year')?.value ?? '0'),
    month: parseInt(parts.find((p) => p.type === 'month')?.value ?? '0'),
    day: parseInt(parts.find((p) => p.type === 'day')?.value ?? '0'),
  };
}

/** Get current Hijri date using Intl API */
export function getCurrentHijriDate(): HijriDate {
  return parseHijriParts(new Date());
}

/** Format a Hijri month/day for display */
export function formatHijriDate(month: number, day: number): string {
  return `${day} ${HIJRI_MONTHS[month - 1]}`;
}

/**
 * Find the Gregorian date that corresponds to a given Hijri month/day.
 * Searches forward from today up to 400 days to find the next occurrence.
 * Falls back to day-1 if exact day not found (handles months with 29 days).
 */
export function getNextHawlGregorian(hawlMonth: number, hawlDay: number): Date | null {
  let fallback: Date | null = null;

  for (let offset = 0; offset <= 400; offset++) {
    const candidate = new Date();
    candidate.setUTCHours(12, 0, 0, 0);
    candidate.setDate(candidate.getDate() + offset);
    const { month: m, day: d } = parseHijriParts(candidate);

    if (m === hawlMonth && d === hawlDay) {
      return candidate;
    }
    // Track day-1 as fallback (for months that only have 29 days)
    if (m === hawlMonth && d === hawlDay - 1) {
      fallback = new Date(candidate);
    }
  }
  return fallback;
}

/**
 * Calculate days remaining until the next Hawl date.
 * Uses UTC to avoid DST off-by-one errors.
 */
export function getDaysUntilHawl(hawlMonth: number, hawlDay: number): number | null {
  const target = getNextHawlGregorian(hawlMonth, hawlDay);
  if (!target) return null;
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  target.setUTCHours(12, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get Hijri years where the Hawl date has already passed but may not have a
 * corresponding review. Only checks the current Hijri year.
 */
export function getOverdueHawlYears(
  hawlMonth: number,
  hawlDay: number,
  historyDates: string[],
): number[] {
  const current = getCurrentHijriDate();

  // Has the hawl date passed this Hijri year?
  const hawlPassedThisYear =
    current.month > hawlMonth ||
    (current.month === hawlMonth && current.day >= hawlDay);

  if (!hawlPassedThisYear) return [];

  const gregorianDate = getGregorianForHijri(current.year, hawlMonth, hawlDay);
  if (!gregorianDate) return [];

  // Check if any history entry was saved around that hawl date
  const hawlTime = gregorianDate.getTime();
  const hasReview = historyDates.some((d) => {
    const entryTime = new Date(d).getTime();
    return entryTime >= hawlTime - 7 * 86400000 && entryTime <= hawlTime + 60 * 86400000;
  });

  return hasReview ? [] : [current.year];
}

/**
 * Find the Gregorian date for a specific Hijri year/month/day.
 * Searches a wide range around an estimated date.
 * Falls back to day-1 if exact day not found.
 * Uses memoization for repeated calls with same parameters.
 */
const gregorianCache = new Map<string, Date | null>();

export function getGregorianForHijri(hijriYear: number, hijriMonth: number, hijriDay: number): Date | null {
  const cacheKey = `${hijriYear}-${hijriMonth}-${hijriDay}`;
  if (gregorianCache.has(cacheKey)) {
    return gregorianCache.get(cacheKey)!;
  }

  let fallback: Date | null = null;

  // Estimate: Hijri epoch is ~622 CE, lunar year is ~354.37 days
  const approxGregorianYear = Math.round(hijriYear * 0.9702 + 621.5);
  const startDate = new Date(approxGregorianYear - 1, 6, 1);
  startDate.setUTCHours(12, 0, 0, 0);

  for (let offset = 0; offset <= 800; offset++) {
    const candidate = new Date(startDate);
    candidate.setDate(candidate.getDate() + offset);
    const { year: y, month: m, day: d } = parseHijriParts(candidate);

    if (y === hijriYear && m === hijriMonth && d === hijriDay) {
      gregorianCache.set(cacheKey, candidate);
      return candidate;
    }
    if (y === hijriYear && m === hijriMonth && d === hijriDay - 1) {
      fallback = new Date(candidate);
    }
  }
  gregorianCache.set(cacheKey, fallback);
  return fallback;
}

export interface YearOption {
  hijriYear: number;
  gregorianYear: number;
  label: string;
}

/**
 * Get the available Hijri/Gregorian year pairs for an annual review.
 * When a Hawl date is set, calculates which Hijri years have their Hawl date
 * falling in or near the current Gregorian year. This handles the case where
 * a single Gregorian year can span two Hijri years.
 *
 * Returns up to 3 recent options (current + previous Hijri years).
 * Without a Hawl date, falls back to the current Hijri year.
 */
export function getYearOptions(hawlMonth?: number, hawlDay?: number): YearOption[] {
  const current = getCurrentHijriDate();
  const options: YearOption[] = [];

  if (!hawlMonth || !hawlDay) {
    const gy = new Date().getFullYear();
    return [{ hijriYear: current.year, gregorianYear: gy, label: `${current.year} AH / ${gy} CE` }];
  }

  // Check current and two previous Hijri years
  const yearsToCheck = [current.year, current.year - 1, current.year - 2];

  for (const hy of yearsToCheck) {
    const gDate = getGregorianForHijri(hy, hawlMonth, hawlDay);
    if (gDate) {
      const gy = gDate.getFullYear();
      options.push({
        hijriYear: hy,
        gregorianYear: gy,
        label: `${hy} AH / ${gy} CE`,
      });
    }
  }

  return options;
}
