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

  // Fallback to predefined list if routes are not yet loaded from server
  return PREDEFINED_ROUTES.filter(r => r.category === category).map(r => ({
    id: r.id,
    nameAr: r.nameAr,
    nameEn: r.nameEn,
  }));
}
