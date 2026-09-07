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
 * Returns tomorrow's date in local 'YYYY-MM-DD' format (Primary bookable date)
 */
export const getTomorrowDateString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDateString(d);
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
 * - Yesterday (-1): disabled, unbookable, labeled 'أمس / YESTERDAY', status 'منتهي / Closed'
 * - Today (0): prominent green outline indicator, unbookable for trips, labeled 'اليوم / TODAY', status 'انتهى حجز اليوم / Closed for Today'
 * - Tomorrow (+1): ACTIVE, bookable, default selected, labeled 'غداً / TOMORROW', status 'متاح للحجز / Booking Open'
 * - Future (+2 to +5): advance booking open, labeled with weekday, status 'متاح للحجز / Booking Open'
 */
export const getDynamicOperationalDates = (todayOverride?: string): OperationalDate[] => {
  const baseDate = todayOverride ? new Date(`${todayOverride}T00:00:00`) : new Date();
  const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  // Window: -1 (yesterday), 0 (today), +1 (tomorrow), +2..+5 (advance days)
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
    // Advance booking rule: Today's booking is closed; Tomorrow (+1) and upcoming days (+2..+5) are bookable!
    const isBookable = offset >= 1;

    let labelEn = weekday;
    let labelAr = weekdayAr;
    let statusBadgeAr = 'غير متاح';
    let statusBadgeEn = 'Closed';

    if (isYesterday) {
      labelEn = 'YESTERDAY';
      labelAr = 'أمس';
      statusBadgeAr = 'منتهي';
      statusBadgeEn = 'Closed';
    } else if (isToday) {
      labelEn = 'TODAY';
      labelAr = 'اليوم';
      statusBadgeAr = 'انتهى حجز اليوم';
      statusBadgeEn = 'Closed for Today';
    } else if (isTomorrow) {
      labelEn = 'TOMORROW';
      labelAr = 'غداً';
      statusBadgeAr = 'متاح للحجز';
      statusBadgeEn = 'Open';
    } else {
      statusBadgeAr = 'متاح للحجز';
      statusBadgeEn = 'Open';
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
