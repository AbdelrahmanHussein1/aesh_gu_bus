export interface PersonnelRecord {
  nameAr: string;
  nameEn: string;
  phone: string;
  role: 'supervisor';
  email: string;
}

export const REAL_PERSONNEL: PersonnelRecord[] = [
  // Drivers
  { nameAr: 'محمد صبحي', nameEn: 'Mohamed Sobhi', phone: '01021561196', role: 'supervisor', email: 'driver.sobhi@gu.edu.eg' },
  { nameAr: 'اشرف حسن', nameEn: 'Ashraf Hassan', phone: '01034972249', role: 'supervisor', email: 'driver.ashraf@gu.edu.eg' },
  { nameAr: 'السيد عبد الجواد', nameEn: 'El Sayed Abdel Gawad', phone: '01270628098', role: 'supervisor', email: 'driver.gawad@gu.edu.eg' },
  { nameAr: 'عادل محمدين', nameEn: 'Adel Mohamedin', phone: '01064384157', role: 'supervisor', email: 'driver.adel@gu.edu.eg' },
  { nameAr: 'ابراهيم السبع', nameEn: 'Ibrahim El Sabea', phone: '01093192601', role: 'supervisor', email: 'driver.sabea@gu.edu.eg' },
  { nameAr: 'محمد ابراهيم', nameEn: 'Mohamed Ibrahim', phone: '01003711827', role: 'supervisor', email: 'driver.ibrahim@gu.edu.eg' },

  // Line Supervisors (مرافقي الخطوط)
  { nameAr: 'محمد عبد الباري', nameEn: 'Mohamed Abdel Bary', phone: '01283970678', role: 'supervisor', email: 'super.abdelbary@gu.edu.eg' },
  { nameAr: 'ممدوح بدران', nameEn: 'Mamdouh Badran', phone: '01275467090', role: 'supervisor', email: 'super.badran@gu.edu.eg' },
  { nameAr: 'احمد السيد', nameEn: 'Ahmed El Sayed', phone: '01224393146', role: 'supervisor', email: 'super.elsayed@gu.edu.eg' },
  { nameAr: 'احمد عبد الرحيم', nameEn: 'Ahmed Abdel Rahim', phone: '01202333289', role: 'supervisor', email: 'super.abdelrahim@gu.edu.eg' },
  { nameAr: 'محمد سعيد', nameEn: 'Mohamed Saeed', phone: '01097973886', role: 'supervisor', email: 'super.saeed@gu.edu.eg' },
  { nameAr: 'محمد محمود', nameEn: 'Mohamed Mahmoud', phone: '01207565158', role: 'supervisor', email: 'super.mahmoud@gu.edu.eg' },
  { nameAr: 'محمد مختار', nameEn: 'Mohamed Mokhtar', phone: '01004778719', role: 'supervisor', email: 'super.mokhtar@gu.edu.eg' },
  { nameAr: 'محمود الصياد', nameEn: 'Mahmoud El Sayyad', phone: '01116739222', role: 'supervisor', email: 'super.sayyad@gu.edu.eg' },
  { nameAr: 'السعيد عرفه', nameEn: 'El Saeed Arafa', phone: '01067994014', role: 'supervisor', email: 'super.arafa@gu.edu.eg' },
  { nameAr: 'محمود عبد الله', nameEn: 'Mahmoud Abdullah', phone: '01282783018', role: 'supervisor', email: 'super.abdullah@gu.edu.eg' },
  { nameAr: 'غريب عبد الجواد', nameEn: 'Gharib Abdel Gawad', phone: '01222749275', role: 'supervisor', email: 'super.gharib@gu.edu.eg' },
  { nameAr: 'وائل عبد الخالق', nameEn: 'Wael Abdel Khaleq', phone: '01010204921', role: 'supervisor', email: 'super.wael@gu.edu.eg' },
  { nameAr: 'عماد عيسى', nameEn: 'Emad Issa', phone: '01007967214', role: 'supervisor', email: 'super.issa@gu.edu.eg' },
  { nameAr: 'السيد منصور', nameEn: 'El Sayed Mansour', phone: '01066553376', role: 'supervisor', email: 'super.mansour@gu.edu.eg' },
  { nameAr: 'عبدالله عبد الخالق', nameEn: 'Abdullah Abdel Khaleq', phone: '01024374538', role: 'supervisor', email: 'super.abdullahkhaleq@gu.edu.eg' },
  { nameAr: 'محمد مصطفى', nameEn: 'Mohamed Mostafa', phone: '01064987136', role: 'supervisor', email: 'super.mostafa@gu.edu.eg' },
  { nameAr: 'محمد قطب', nameEn: 'Mohamed Kotb', phone: '01002572162', role: 'supervisor', email: 'super.kotb@gu.edu.eg' },
];

export interface DayRouteAssignment {
  routeErpId: number; // 29: Port Tawfik, 33: Nabi Allah, 30: El Salam
  routeNameAr: string;
  driverPhone: string;
  supervisorPhones: string[];
}

export interface DaySchedule {
  date: string; // YYYY-MM-DD
  routes: DayRouteAssignment[];
  lateShiftArrival: {
    driverPhone: string;
    supervisorPhones: string[];
  };
  returns: Array<{
    timeSlot: 'return_1' | 'return_2' | 'return_3';
    departureTime: string; // e.g. "12:30 PM", "02:30 PM", "05:30 PM"
    labelAr: string;
  }>;
}

const DEFAULT_RETURNS = [
  { timeSlot: 'return_1' as const, departureTime: '12:30 PM', labelAr: 'العودة الأولى - 12:30 ظهراً' },
  { timeSlot: 'return_2' as const, departureTime: '02:30 PM', labelAr: 'العودة الثانية - 02:30 ظهراً' },
  { timeSlot: 'return_3' as const, departureTime: '05:30 PM', labelAr: 'العودة الثالثة - 05:30 مساءً' },
];

export const REAL_SCHEDULES: DaySchedule[] = [
  // Thursday 4 June 2026
  {
    date: '2026-06-04',
    routes: [
      { routeErpId: 29, routeNameAr: 'بورتوفيق', driverPhone: '01021561196', supervisorPhones: ['01283970678', '01275467090'] },
      { routeErpId: 33, routeNameAr: 'نبي الله', driverPhone: '01034972249', supervisorPhones: ['01224393146', '01202333289'] },
      { routeErpId: 30, routeNameAr: 'السلام', driverPhone: '01270628098', supervisorPhones: ['01097973886', '01207565158'] },
    ],
    lateShiftArrival: { driverPhone: '01064384157', supervisorPhones: ['01003711827'] },
    returns: DEFAULT_RETURNS,
  },
  // Saturday 6 June 2026
  {
    date: '2026-06-06',
    routes: [
      { routeErpId: 29, routeNameAr: 'بورتوفيق', driverPhone: '01021561196', supervisorPhones: ['01283970678', '01097973886'] },
      { routeErpId: 33, routeNameAr: 'نبي الله', driverPhone: '01093192601', supervisorPhones: ['01004778719', '01034972249'] },
      { routeErpId: 30, routeNameAr: 'السلام', driverPhone: '01270628098', supervisorPhones: ['01275467090', '01116739222'] },
    ],
    lateShiftArrival: { driverPhone: '01064384157', supervisorPhones: ['01003711827', '01207565158'] },
    returns: DEFAULT_RETURNS,
  },
  // Sunday 7 June 2026
  {
    date: '2026-06-07',
    routes: [
      { routeErpId: 29, routeNameAr: 'بورتوفيق', driverPhone: '01021561196', supervisorPhones: ['01283970678', '01097973886', '01067994014'] },
      { routeErpId: 33, routeNameAr: 'نبي الله', driverPhone: '01093192601', supervisorPhones: ['01034972249', '01003711827', '01282783018'] },
      { routeErpId: 30, routeNameAr: 'السلام', driverPhone: '01270628098', supervisorPhones: ['01275467090', '01207565158', '01222749275'] },
    ],
    lateShiftArrival: { driverPhone: '01064384157', supervisorPhones: [] },
    returns: DEFAULT_RETURNS,
  },
  // Monday 8 June 2026
  {
    date: '2026-06-08',
    routes: [
      { routeErpId: 29, routeNameAr: 'بورتوفيق', driverPhone: '01021561196', supervisorPhones: ['01283970678', '01097973886', '01067994014'] },
      { routeErpId: 33, routeNameAr: 'نبي الله', driverPhone: '01093192601', supervisorPhones: ['01034972249', '01003711827', '01282783018'] },
      { routeErpId: 30, routeNameAr: 'السلام', driverPhone: '01270628098', supervisorPhones: ['01275467090', '01207565158', '01010204921'] },
    ],
    lateShiftArrival: { driverPhone: '01064384157', supervisorPhones: [] },
    returns: DEFAULT_RETURNS,
  },
  // Tuesday 9 June 2026
  {
    date: '2026-06-09',
    routes: [
      { routeErpId: 29, routeNameAr: 'بورتوفيق', driverPhone: '01021561196', supervisorPhones: ['01283970678', '01097973886', '01067994014'] },
      { routeErpId: 33, routeNameAr: 'نبي الله', driverPhone: '01093192601', supervisorPhones: ['01034972249', '01003711827', '01282783018'] },
      { routeErpId: 30, routeNameAr: 'السلام', driverPhone: '01270628098', supervisorPhones: ['01275467090', '01207565158', '01222749275'] },
    ],
    lateShiftArrival: { driverPhone: '01064384157', supervisorPhones: [] },
    returns: DEFAULT_RETURNS,
  },
  // Wednesday 10 June 2026
  {
    date: '2026-06-10',
    routes: [
      { routeErpId: 29, routeNameAr: 'بورتوفيق', driverPhone: '01021561196', supervisorPhones: ['01283970678', '01097973886', '01067994014'] },
      { routeErpId: 33, routeNameAr: 'نبي الله', driverPhone: '01093192601', supervisorPhones: ['01034972249', '01003711827', '01282783018'] },
      { routeErpId: 30, routeNameAr: 'السلام', driverPhone: '01270628098', supervisorPhones: ['01275467090', '01207565158', '01222749275'] },
    ],
    lateShiftArrival: { driverPhone: '01064384157', supervisorPhones: [] },
    returns: DEFAULT_RETURNS,
  },
  // Thursday 11 June 2026
  {
    date: '2026-06-11',
    routes: [
      { routeErpId: 29, routeNameAr: 'بورتوفيق', driverPhone: '01003711827', supervisorPhones: ['01283970678', '01097973886'] },
      { routeErpId: 33, routeNameAr: 'نبي الله', driverPhone: '01093192601', supervisorPhones: ['01034972249', '01282783018'] },
      { routeErpId: 30, routeNameAr: 'السلام', driverPhone: '01270628098', supervisorPhones: ['01275467090', '01222749275'] },
    ],
    lateShiftArrival: { driverPhone: '01064384157', supervisorPhones: ['01207565158'] },
    returns: DEFAULT_RETURNS,
  },
  // Saturday 13 June 2026
  {
    date: '2026-06-13',
    routes: [
      { routeErpId: 29, routeNameAr: 'بورتوفيق', driverPhone: '01003711827', supervisorPhones: ['01283970678', '01007967214'] },
      { routeErpId: 33, routeNameAr: 'نبي الله', driverPhone: '01093192601', supervisorPhones: ['01004778719', '01282783018'] },
      { routeErpId: 30, routeNameAr: 'السلام', driverPhone: '01270628098', supervisorPhones: ['01067994014', '01066553376'] },
    ],
    lateShiftArrival: { driverPhone: '01064384157', supervisorPhones: ['01116739222', '01097973886'] },
    returns: DEFAULT_RETURNS,
  },
  // Sunday 14 June 2026
  {
    date: '2026-06-14',
    routes: [
      { routeErpId: 29, routeNameAr: 'بورتوفيق', driverPhone: '01003711827', supervisorPhones: ['01283970678', '01024374538', '01007967214'] },
      { routeErpId: 33, routeNameAr: 'نبي الله', driverPhone: '01093192601', supervisorPhones: ['01282783018', '01064987136', '01010204921'] },
      { routeErpId: 30, routeNameAr: 'السلام', driverPhone: '01270628098', supervisorPhones: ['01067994014', '01066553376', '01002572162'] },
    ],
    lateShiftArrival: { driverPhone: '01064384157', supervisorPhones: [] },
    returns: DEFAULT_RETURNS,
  },
];
