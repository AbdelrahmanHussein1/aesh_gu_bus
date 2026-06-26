import { db } from './index.js';
import * as schema from './schema.js';
import { promises as fs } from 'fs';
import path from 'path';
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Time slot configuration for schedule
const TIME_SLOTS = {
  morning_1: { direction: 'to_campus', depHour: 5, depMin: 0, arriveHour: 10, arriveMin: 0, label: 'Morning Shift 1 (05:00-10:00)' },
  morning_2: { direction: 'to_campus', depHour: 10, depMin: 0, arriveHour: 11, arriveMin: 30, label: 'Morning Shift 2 (10:00-11:30)' },
  return: { direction: 'from_campus', depHour: 12, depMin: 0, arriveHour: 17, arriveMin: 10, label: 'Return (12:00-17:10)' },
} as const;

async function seed() {
  console.log('--- STARTING SEEDING PROCESS ---');

  try {
    const dataPath = path.resolve(__dirname, '../../../../erp_bus_data.json');
    console.log('Reading ERP data from:', dataPath);
    const fileContent = await fs.readFile(dataPath, 'utf-8');
    const erpData = JSON.parse(fileContent);

    const busData = erpData.bus_data_by_route;
    
    // Track unique routes and buses to prevent duplicate database inserts
    const insertedRoutes = new Map<number, number>(); // erpPointId -> dbId
    const insertedBuses = new Map<number, number>();  // erpVehicleId -> dbId

    // Insert Default System Admin and Supervisor accounts for testing
    console.log('Inserting default user roles...');
    await db.insert(schema.users).values({
      email: 'admin@gu.edu.eg',
      fullName: 'System Administrator',
      fullNameAr: 'مدير النظام',
      role: 'admin',
    }).onConflictDoNothing();

    await db.insert(schema.users).values({
      email: 'supervisor@gu.edu.eg',
      fullName: 'Supervisor Aesh',
      fullNameAr: 'مشرف عيش',
      role: 'supervisor',
    }).onConflictDoNothing();

    console.log('Users seeded.');

    // English translations for routes
    const englishNames: { [key: number]: string } = {
      1: 'El Obour',
      3: '6th of October',
      4: 'Hadayek Al Ahram',
      6: 'Cairo University',
      7: 'Maadi',
      11: 'El Helmeya & Gesr El Suez',
      12: 'Nasr City',
      14: 'El Mokattam',
      15: 'Helwan & 15 May',
      16: '10th of Ramadan',
      17: 'El Rehab',
      19: 'Heliopolis & Kobri El Kobba',
      24: 'Ring Road',
      25: 'Madinaty',
      26: 'Shobra & Ramses',
      27: 'New Cairo (5th Settlement)',
      28: 'Zahraa Nasr City & 1st Settlement',
      29: 'Port Tawfik (Suez)',
      30: 'El Salam & El Mostakbal',
      33: 'Suez (Nabi Allah Dawoud)',
      35: 'El Shorouk & Badr',
      61: 'Cairo',
      66: 'Suez',
    };

    // Process each route entry
    for (const key of Object.keys(busData)) {
      const entry = busData[key];
      const routeData = entry.route;
      const date = entry.date;

      // 1. Insert Route if not exists
      let dbRouteId = insertedRoutes.get(routeData.id);
      if (!dbRouteId) {
        const nameEn = englishNames[routeData.id] || `Route ${routeData.id}`;
        
        const routeResult = await db.insert(schema.routes).values({
          erpPointId: routeData.id,
          nameAr: routeData.name,
          nameEn: nameEn,
          isActive: true,
        }).onConflictDoNothing().returning();

        if (routeResult.length > 0) {
          dbRouteId = routeResult[0].id;
        } else {
          const [existing] = await db.select().from(schema.routes).where(eq(schema.routes.erpPointId, routeData.id)).limit(1);
          dbRouteId = existing?.id;
        }
        
        if (dbRouteId) {
          insertedRoutes.set(routeData.id, dbRouteId);
          console.log(`Seeded Route: ${routeData.name} (${nameEn})`);

          // Seed stops for each route (to_campus direction)
          await db.insert(schema.stops).values([
            {
              routeId: dbRouteId,
              nameAr: `${routeData.name} - نقطة البداية`,
              nameEn: `${nameEn} - Start Point`,
              latitude: '30.04442000',
              longitude: '31.23571000',
              arriveTime: '05:00',
              departTime: '05:10',
              stopOrder: 1,
            },
            {
              routeId: dbRouteId,
              nameAr: `${routeData.name} - نقطة تجمع 2`,
              nameEn: `${nameEn} - Stop 2`,
              latitude: '29.98888000',
              longitude: '31.42333000',
              arriveTime: '05:30',
              departTime: '05:35',
              stopOrder: 2,
            },
            {
              routeId: dbRouteId,
              nameAr: 'جامعة الجلالة - مبنى الركاب',
              nameEn: 'Galala University - Main Terminal',
              latitude: '29.42080000',
              longitude: '32.40420000',
              arriveTime: '09:00',
              departTime: '09:10',
              stopOrder: 3,
            }
          ]);
        }
      }

      // 2. Insert Buses & Trips for all 3 time slots
      if (dbRouteId && entry.buses) {
        for (const bus of entry.buses) {
          let dbBusId = insertedBuses.get(bus.id);
          if (!dbBusId) {
            const busResult = await db.insert(schema.buses).values({
              erpVehicleId: bus.id,
              name: bus.name,
              licensePlate: `أ ب ج ${Math.floor(100 + Math.random() * 900)}`,
              totalSeats: 50,
              seatRows: 10,
              seatsPerRow: 5,
              busType: 'seating',
              isActive: true,
            }).onConflictDoNothing().returning();

            if (busResult.length > 0) {
              dbBusId = busResult[0].id;
            } else {
              const [existing] = await db.select().from(schema.buses).where(eq(schema.buses.erpVehicleId, bus.id)).limit(1);
              dbBusId = existing?.id;
            }

            if (dbBusId) {
              insertedBuses.set(bus.id, dbBusId);
              console.log(`Seeded Bus: ${bus.name}`);
            }
          }

          // 3. Create trips for each time slot
          if (dbRouteId && dbBusId) {
            for (const [slotKey, slotConfig] of Object.entries(TIME_SLOTS)) {
              const departureTime = new Date(
                `${date}T${String(slotConfig.depHour).padStart(2, '0')}:${String(slotConfig.depMin).padStart(2, '0')}:00+02:00`
              );
              const arrivalTime = new Date(
                `${date}T${String(slotConfig.arriveHour).padStart(2, '0')}:${String(slotConfig.arriveMin).padStart(2, '0')}:00+02:00`
              );

              await db.insert(schema.trips).values({
                routeId: dbRouteId,
                busId: dbBusId,
                tripDate: date,
                departureTime,
                returnTime: arrivalTime,
                direction: slotConfig.direction,
                timeSlot: slotKey,
                totalSeats: 50,
                status: 'scheduled',
                cancellationLockHours: 3,
              }).onConflictDoNothing();

              console.log(`  → Trip: ${slotConfig.label} for bus ${bus.name}`);
            }
          }
        }
      }
    }

    console.log('--- DATABASE SEEDING COMPLETED ---');
  } catch (error) {
    console.error('Seeding failed:', error);
  }
}

seed();
