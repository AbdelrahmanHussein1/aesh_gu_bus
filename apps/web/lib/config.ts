/**
 * Centralized Configuration Constants for Bus Aesh Platform
 */

export const TRANSIT_CONFIG = {
  // Financial & Booking Defaults
  DEFAULT_FARE_EGP: 160,
  DEFAULT_BUS_CAPACITY: 50,
  CANCELLATION_LOCK_HOURS: 3,

  // University Transit Support
  SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'transport@gu.edu.eg',
  SUPPORT_PHONE: process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+20 100 000 0000',
  SUPPORT_PHONE_EXT: '4410',
  SUPPORT_LOCATION_EN: 'Galala University Plateau • Building B Desk',
  SUPPORT_LOCATION_AR: 'هضبة الجلالة، مبنى الخدمات B',
  SUPPORT_HOURS: '06:00 - 20:00 Daily',

  // Institution Details
  INSTITUTION_NAME_EN: 'Galala University',
  INSTITUTION_NAME_AR: 'جامعة الجلالة',
  CAMPUS_NAME_EN: 'Galala Plateau Campus',
  CAMPUS_NAME_AR: 'مقر هضبة الجلالة',
};
