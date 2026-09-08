export type RouteCategoryKey = 'cairo' | 'suez' | 'shorouk_badr';

export interface RouteCategoryInfo {
  key: RouteCategoryKey;
  labelAr: string;
  labelEn: string;
  icon: string;
  count: number;
}

export const ROUTE_CATEGORIES: RouteCategoryInfo[] = [
  { key: 'cairo', labelAr: 'القاهرة', labelEn: 'Cairo', icon: 'apartment', count: 17 },
  { key: 'suez', labelAr: 'السويس', labelEn: 'Suez', icon: 'sailing', count: 4 },
  { key: 'shorouk_badr', labelAr: 'الشروق وبدر', labelEn: 'El Shorouk & Badr', icon: 'near_me', count: 1 },
];

export interface PredefinedRoute {
  id: number;
  category: RouteCategoryKey;
  nameAr: string;
  nameEn: string;
  isSummerOnly?: boolean;
}

export const PREDEFINED_ROUTES: PredefinedRoute[] = [
  // Cairo (17 routes)
  { id: 1, category: 'cairo', nameAr: 'العبور', nameEn: 'El Obour' },
  { id: 3, category: 'cairo', nameAr: '6 أكتوبر', nameEn: '6th of October' },
  { id: 4, category: 'cairo', nameAr: 'حدائق الأهرام', nameEn: 'Hadayek Al Ahram' },
  { id: 6, category: 'cairo', nameAr: 'جامعة القاهرة', nameEn: 'Cairo University' },
  { id: 7, category: 'cairo', nameAr: 'المعادي', nameEn: 'Maadi' },
  { id: 11, category: 'cairo', nameAr: 'الحلمية وجسر السويس', nameEn: 'El Helmeya & Gesr El Suez' },
  { id: 12, category: 'cairo', nameAr: 'مدينة نصر', nameEn: 'Nasr City' },
  { id: 14, category: 'cairo', nameAr: 'المقطم', nameEn: 'El Mokattam' },
  { id: 15, category: 'cairo', nameAr: 'حلوان و 15 مايو', nameEn: 'Helwan & 15 May' },
  { id: 16, category: 'cairo', nameAr: 'العاشر من رمضان', nameEn: '10th of Ramadan' },
  { id: 17, category: 'cairo', nameAr: 'الرحاب', nameEn: 'El Rehab' },
  { id: 19, category: 'cairo', nameAr: 'مصر الجديدة وكوبري القبة', nameEn: 'Heliopolis & Kobri El Kobba' },
  { id: 24, category: 'cairo', nameAr: 'الدائري', nameEn: 'Ring Road' },
  { id: 25, category: 'cairo', nameAr: 'مدينتي', nameEn: 'Madinaty' },
  { id: 26, category: 'cairo', nameAr: 'شبرا ورمسيس', nameEn: 'Shobra & Ramses' },
  { id: 27, category: 'cairo', nameAr: 'القاهرة الجديدة (التجمع الخامس)', nameEn: 'New Cairo (5th Settlement)' },
  { id: 28, category: 'cairo', nameAr: 'زهراء مدينة نصر والتجمع الأول', nameEn: 'Zahraa Nasr City & 1st Settlement' },

  // Suez (4 routes)
  { id: 29, category: 'suez', nameAr: 'بورتوفيق - السويس', nameEn: 'Port Tawfik (Suez)' },
  { id: 30, category: 'suez', nameAr: 'السلام والمستقبل', nameEn: 'El Salam & El Mostakbal' },
  { id: 33, category: 'suez', nameAr: 'السويس (مسجد نبي الله داوود)', nameEn: 'Suez (Nabi Allah Dawoud)' },
  { id: 91, category: 'suez', nameAr: 'طريق 91 السويس - خط مجمع إجازة (صيفي)', nameEn: '91 Road Suez - Summer Vacation', isSummerOnly: true },

  // Shorouk & Badr (1 route)
  { id: 35, category: 'shorouk_badr', nameAr: 'الشروق وبدر', nameEn: 'El Shorouk & Badr' },
];

export function getCategoryLabel(category: RouteCategoryKey, lang: 'ar' | 'en' = 'ar'): string {
  const cat = ROUTE_CATEGORIES.find(c => c.key === category);
  if (!cat) return category;
  return lang === 'ar' ? cat.labelAr : cat.labelEn;
}

export function getRouteCategory(routeId: number): RouteCategoryKey {
  const found = PREDEFINED_ROUTES.find(r => r.id === routeId);
  return found ? found.category : 'cairo';
}

export function getDefaultRouteIdForCategory(category: RouteCategoryKey): number {
  const found = PREDEFINED_ROUTES.find(r => r.category === category);
  return found ? found.id : 1;
}

export function getCategoryRoutes(category: RouteCategoryKey, allRoutes: Array<{ id: number; nameAr: string; nameEn: string }>) {
  const predefinedCategoryIds = new Set(
    PREDEFINED_ROUTES.filter(r => r.category === category).map(r => r.id)
  );

  const matchedFromLoaded = allRoutes.filter(r => predefinedCategoryIds.has(r.id));
  if (matchedFromLoaded.length > 0) {
    return matchedFromLoaded;
  }

  return PREDEFINED_ROUTES.filter(r => r.category === category).map(r => ({
    id: r.id,
    nameAr: r.nameAr,
    nameEn: r.nameEn,
  }));
}

export function formatTimeString(val: string | Date | undefined): string {
  if (!val) return '';
  if (typeof val === 'string') {
    if (val.includes('AM') || val.includes('PM')) return val;
    const date = new Date(val);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Cairo' });
    }
    return val;
  }
  if (val instanceof Date) {
    return val.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Cairo' });
  }
  return '';
}

export interface ShiftTimeSlotInfo {
  numberAr: string;
  numberEn: string;
  badgeAr: string;
  badgeEn: string;
  targetTime: string;
}

export function getShiftTimeLabel(timeSlot?: string, direction?: string, departureTime?: string | Date): ShiftTimeSlotInfo {
  const isMorning = direction === 'to_campus' || (timeSlot && timeSlot.startsWith('morning'));
  const slot = (timeSlot || '').toLowerCase();
  const depStr = formatTimeString(departureTime);

  if (isMorning) {
    if (slot.includes('2') || depStr.includes('09:30') || depStr.includes('11:30')) {
      return {
        numberAr: 'شفت وصول 2',
        numberEn: 'Arrival Shift 2',
        badgeAr: 'وصول 11:30 ص',
        badgeEn: '11:30 AM Arrival',
        targetTime: '11:30 AM',
      };
    }
    return {
      numberAr: 'شفت وصول 1',
      numberEn: 'Arrival Shift 1',
      badgeAr: 'وصول 09:00 ص',
      badgeEn: '09:00 AM Arrival',
      targetTime: '09:00 AM',
    };
  }

  // Return trips
  if (slot.includes('3') || depStr.includes('17:30') || depStr.includes('05:30') || depStr.includes('5:30')) {
    return {
      numberAr: 'شفت عودة 3',
      numberEn: 'Return Shift 3',
      badgeAr: 'مغادرة 05:30 م',
      badgeEn: '05:30 PM Return',
      targetTime: '05:30 PM',
    };
  }
  if (slot.includes('2') || depStr.includes('14:30') || depStr.includes('02:30') || depStr.includes('2:30')) {
    return {
      numberAr: 'شفت عودة 2',
      numberEn: 'Return Shift 2',
      badgeAr: 'مغادرة 02:30 م',
      badgeEn: '02:30 PM Return',
      targetTime: '02:30 PM',
    };
  }
  return {
    numberAr: 'شفت عودة 1',
    numberEn: 'Return Shift 1',
    badgeAr: 'مغادرة 12:30 م',
    badgeEn: '12:30 PM Return',
    targetTime: '12:30 PM',
  };
}

export interface ShiftDisplayInfo {
  shiftNumberLabelAr: string;
  shiftNumberLabelEn: string;
  timeBadgeAr: string;
  timeBadgeEn: string;
  fullTitleAr: string;
  fullTitleEn: string;
  shortTitleAr: string;
  shortTitleEn: string;
  routeNameAr: string;
  routeNameEn: string;
  categoryKey: RouteCategoryKey;
  categoryLabelAr: string;
  categoryLabelEn: string;
  directionAr: string;
  directionEn: string;
  busName: string;
  licensePlate: string;
  capacity: number;
  departureDisplay: string;
}

export function formatShiftDisplay(trip: any): ShiftDisplayInfo {
  const routeId = Number(trip.routeId || trip.route?.id || 0);
  const predefined = PREDEFINED_ROUTES.find(r => r.id === routeId);
  const categoryKey = predefined ? predefined.category : getRouteCategory(routeId);
  const categoryLabelAr = getCategoryLabel(categoryKey, 'ar');
  const categoryLabelEn = getCategoryLabel(categoryKey, 'en');

  const routeNameAr = predefined?.nameAr || trip.route?.nameAr || trip.routeNameAr || 'خط الجامعة';
  const routeNameEn = predefined?.nameEn || trip.route?.nameEn || trip.routeNameEn || 'University Line';

  const direction = trip.direction || (trip.timeSlot?.startsWith('morning') ? 'to_campus' : 'from_campus');
  const slotInfo = getShiftTimeLabel(trip.timeSlot, direction, trip.departureTime);

  const directionAr = direction === 'to_campus' ? 'وصول للجامعة' : 'عودة من الجامعة';
  const directionEn = direction === 'to_campus' ? 'To Campus' : 'From Campus';

  const busName = trip.bus?.name || trip.busName || `حافلة ${routeNameAr}`;
  const licensePlate = trip.bus?.licensePlate || trip.licensePlate || `أ ب ج ${100 + (routeId || 1)}`;
  const capacity = trip.bus?.totalSeats || trip.totalSeats || trip.capacity || 50;
  const departureDisplay = formatTimeString(trip.departureTime) || slotInfo.targetTime;

  const shortTitleAr = `${slotInfo.numberAr} (${slotInfo.targetTime})`;
  const shortTitleEn = `${slotInfo.numberEn} (${slotInfo.targetTime})`;
  const fullTitleAr = `${slotInfo.numberAr} (${slotInfo.targetTime}) • خط ${routeNameAr} - ${categoryLabelAr}`;
  const fullTitleEn = `${slotInfo.numberEn} (${slotInfo.targetTime}) • ${routeNameEn} - ${categoryLabelEn}`;

  return {
    shiftNumberLabelAr: slotInfo.numberAr,
    shiftNumberLabelEn: slotInfo.numberEn,
    timeBadgeAr: slotInfo.badgeAr,
    timeBadgeEn: slotInfo.badgeEn,
    fullTitleAr,
    fullTitleEn,
    shortTitleAr,
    shortTitleEn,
    routeNameAr,
    routeNameEn,
    categoryKey,
    categoryLabelAr,
    categoryLabelEn,
    directionAr,
    directionEn,
    busName,
    licensePlate,
    capacity,
    departureDisplay,
  };
}

