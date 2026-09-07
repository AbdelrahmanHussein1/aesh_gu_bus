/**
 * Dynamic Date Utilities for Bus Aesh Booking Platform
 * Ensures the calendar always tracks the client's current date (Today),
 * enforces same-day booking rules, and visually highlights Today with green accents.
 */

export interface OperationalDate {
  date: string;          // Format: 'YYYY-MM-DD'
  day: string;           // e.g. '7'
  month: string;         // e.g. 'Sep'
  monthAr: string;       // e.g. 'سبتمبر'
  weekday: string;       // e.g. 'MON'
  weekdayAr: string;     // e.g. 'الإثنين'
  labelEn: string;       // e.g. 'TODAY', 'YESTERDAY', 'TOMORROW'
  labelAr: string;       // e.g. 'اليوم', 'أمس', 'غداً'
  isToday: boolean;
  isYesterday: boolean;
  isTomorrow: boolean;
  isBookable: boolean;
  statusBadgeAr: string; // e.g. 'متاح للحجز', 'منتهي', 'غير متاح حالياً'
  statusBadgeEn: string; // e.g. 'Open', 'Closed', 'Locked'
}

/**
 * Returns today's date in local 'YYYY-MM-DD' format
 */
export const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats any Date object into local 'YYYY-MM-DD' format
 */
export const formatDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ARABIC_DAYS: Record<string, string> = {
  'SUN': 'الأحد',
  'MON': 'الإثنين',
  'TUE': 'الثلاثاء',
  'WED': 'الأربعاء',
  'THU': 'الخميس',
  'FRI': 'الجمعة',
  'SAT': 'السبت',
};

const ARABIC_MONTHS: Record<string, string> = {
  'Jan': 'يناير',
  'Feb': 'فبراير',
  'Mar': 'مارس',
  'Apr': 'أبريل',
  'May': 'مايو',
  'Jun': 'يونيو',
  'Jul': 'يوليو',
  'Aug': 'أغسطس',
  'Sep': 'سبتمبر',
  'Oct': 'أكتوبر',
  'Nov': 'نوفمبر',
  'Dec': 'ديسمبر',
};

/**
 * Generates dynamic rolling calendar days around today.
 * Strictly enforces:
 * - Yesterday: disabled, unbookable, labeled 'أمس / YESTERDAY'
 * - Today: ACTIVE, bookable, prominent green outline, labeled 'اليوم / TODAY'
 * - Tomorrow: disabled, unbookable, labeled 'غداً / TOMORROW'
 * - Future (+2 to +5): disabled, unbookable
 */
export const getDynamicOperationalDates = (todayOverride?: string): OperationalDate[] => {
  const baseDate = todayOverride ? new Date(`${todayOverride}T00:00:00`) : new Date();
  const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  // Window: -1 (yesterday), 0 (today), +1 (tomorrow), +2..+5 (future days)
  const offsets = [-1, 0, 1, 2, 3, 4, 5];

  return offsets.map(offset => {
    const cur = new Date(base);
    cur.setDate(base.getDate() + offset);

    const date = formatDateString(cur);
    const day = String(cur.getDate());
    const month = cur.toLocaleDateString('en-US', { month: 'short' });
    const monthAr = ARABIC_MONTHS[month] || month;
    const weekday = cur.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const weekdayAr = ARABIC_DAYS[weekday] || weekday;

    const isYesterday = offset === -1;
    const isToday = offset === 0;
    const isTomorrow = offset === 1;
    // Strictly: Only Today is bookable for riders (same-day booking)
    const isBookable = isToday;

    let labelEn = weekday;
    let labelAr = weekdayAr;
    let statusBadgeAr = 'غير متاح';
    let statusBadgeEn = 'Locked';

    if (isYesterday) {
      labelEn = 'YESTERDAY';
      labelAr = 'أمس';
      statusBadgeAr = 'منتهي';
      statusBadgeEn = 'Closed';
    } else if (isToday) {
      labelEn = 'TODAY';
      labelAr = 'اليوم';
      statusBadgeAr = 'متاح للحجز';
      statusBadgeEn = 'Open';
    } else if (isTomorrow) {
      labelEn = 'TOMORROW';
      labelAr = 'غداً';
      statusBadgeAr = 'غير متاح حالياً';
      statusBadgeEn = 'Not Open';
    } else {
      statusBadgeAr = 'قريباً';
      statusBadgeEn = 'Locked';
    }

    return {
      date,
      day,
      month,
      monthAr,
      weekday,
      weekdayAr,
      labelEn,
      labelAr,
      isToday,
      isYesterday,
      isTomorrow,
      isBookable,
      statusBadgeAr,
      statusBadgeEn,
    };
  });
};

/**
 * Generates an array of date strings for admin schedule manager
 */
export const getScheduleManagerDates = (daysBefore = 2, daysAfter = 7): string[] => {
  const d = new Date();
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dates: string[] = [];

  for (let i = -daysBefore; i <= daysAfter; i++) {
    const cur = new Date(base);
    cur.setDate(base.getDate() + i);
    dates.push(formatDateString(cur));
  }
  return dates;
};
