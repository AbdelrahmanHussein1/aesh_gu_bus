import React from 'react';
import { Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { formatDepartureTime } from '../format';
import type { Route, Trip, Seat } from '../types';
import styles from '../styles/home';

interface RiderBookingPanelProps {
  routes: Route[];
  selectedRouteId: number | null;
  routesError: string | null;
  isLoadingRoutes: boolean;
  selectedDirection: 'to_campus' | 'from_campus';
  selectedDate: string;
  trips: Trip[];
  activeTrip: Trip | null;
  isLoadingTrips: boolean;
  tripsError: string | null;
  seats: Seat[];
  selectedSeat: number | null;
  isLoadingSeats: boolean;
  seatsError: string | null;
  hasPendingBooking: boolean;
  fetchRoutes: () => Promise<void>;
  fetchTrips: () => Promise<void>;
  selectRoute: (id: number) => void;
  selectDirection: (direction: 'to_campus' | 'from_campus') => void;
  selectDate: (date: string) => void;
  selectTrip: (trip: Trip) => void;
  fetchSeatsForTrip: (tripId: number) => Promise<void>;
  handleSeatSelect: (number: number, status: string) => void;
  confirmBooking: () => void;
}

export default function RiderBookingPanel({
  routes, selectedRouteId, routesError, isLoadingRoutes, selectedDirection, selectedDate,
  trips, activeTrip, isLoadingTrips, tripsError, seats, selectedSeat, isLoadingSeats,
  seatsError, hasPendingBooking, fetchRoutes, fetchTrips, selectRoute, selectDirection,
  selectDate, selectTrip, fetchSeatsForTrip, handleSeatSelect, confirmBooking,
}: RiderBookingPanelProps) {
  const operationalDates = React.useMemo(() => {
    const base = new Date();
    const offsets = [-1, 0, 1, 2, 3, 4, 5];
    const ARABIC_DAYS: Record<string, string> = {
      'SUN': 'الأحد', 'MON': 'الإثنين', 'TUE': 'الثلاثاء', 'WED': 'الأربعاء',
      'THU': 'الخميس', 'FRI': 'الجمعة', 'SAT': 'السبت'
    };
    return offsets.map(offset => {
      const cur = new Date(base);
      cur.setDate(base.getDate() + offset);
      const date = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      const day = String(cur.getDate());
      const month = cur.toLocaleDateString('en-US', { month: 'short' });
      const weekday = cur.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const weekdayAr = ARABIC_DAYS[weekday] || weekday;
      return {
        date,
        day,
        month,
        weekday,
        weekdayAr,
        isYesterday: offset === -1,
        isToday: offset === 0,
        isTomorrow: offset === 1,
        isBookable: offset >= 1,
      };
    });
  }, []);

  return (
    <>
      {/* Route & Date selector card */}
      <View style={styles.card}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <Text style={[styles.cardTitle, { flex: 1, paddingRight: 8 }]}>1. Choose Route & Time</Text>
          <TouchableOpacity accessibilityRole="button" onPress={fetchTrips} style={styles.refreshBtn}>
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Route select chips */}
        <View style={{ marginBottom: 12, marginTop: 8 }}>
          <Text style={styles.selectLabel}>Select Bus Line (خط الباص)</Text>
          {isLoadingRoutes ? <ActivityIndicator color="#38bdf8" style={{marginTop: 10}} /> : null}
          {routesError ? (
            <View style={styles.inlineError}>
              <Text accessibilityRole="alert" style={styles.inlineErrorText}>{routesError}</Text>
              <TouchableOpacity accessibilityRole="button" onPress={fetchRoutes} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
            </View>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            {routes.map(r => (
              <TouchableOpacity accessibilityRole="button"
                accessibilityState={{ selected: selectedRouteId === r.id }}
                key={r.id}
                onPress={() => selectRoute(r.id)}
                style={[styles.chip, selectedRouteId === r.id && styles.activeChip]}
              >
                <Text style={[styles.chipText, selectedRouteId === r.id && styles.activeChipText]}>
                  {r.nameEn || r.nameAr}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {!isLoadingRoutes && !routesError && routes.length === 0 ? <Text style={styles.emptyHint}>No routes are configured on the server.</Text> : null}
        </View>

        {/* Direction toggle */}
        <View style={styles.directionToggle}>
          <TouchableOpacity accessibilityRole="button"
            accessibilityState={{ selected: selectedDirection === 'to_campus' }}
            onPress={() => selectDirection('to_campus')}
            style={[styles.directionBtn, selectedDirection === 'to_campus' && styles.activeDirectionBtn]}
          >
            <Text style={[styles.directionBtnText, selectedDirection === 'to_campus' && styles.activeDirectionBtnText]}>
              🚌 To Galala (صباحاً)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button"
            accessibilityState={{ selected: selectedDirection === 'from_campus' }}
            onPress={() => selectDirection('from_campus')}
            style={[styles.directionBtn, selectedDirection === 'from_campus' && styles.activeDirectionBtn]}
          >
            <Text style={[styles.directionBtnText, selectedDirection === 'from_campus' && styles.activeDirectionBtnText]}>
              🏠 From Galala (عودة)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Operational Date Selector */}
        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={styles.selectLabel}>Operational Date (تاريخ الحجز)</Text>
            <Text style={{ fontSize: 10, color: '#38bdf8', fontWeight: 'bold' }}>Choose a travel date</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {operationalDates.map(od => {
              const isSelected = selectedDate === od.date;

              // Today: Green outline anchor (closed for new bookings)
              if (od.isToday) {
                return (
                  <View
                    key={od.date}
                    style={[
                      styles.dateCard,
                      {
                        borderColor: '#10b981',
                        borderWidth: 2,
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      }
                    ]}
                  >
                    <View style={[styles.dateBadge, { backgroundColor: '#10b981' }]}>
                      <Text style={[styles.dateBadgeText, { color: '#022c22' }]}>TODAY • اليوم</Text>
                    </View>
                    <Text style={[styles.dateDayText, { color: '#6ee7b7' }]}>{od.day}</Text>
                    <Text style={[styles.dateSubText, { color: '#a7f3d0' }]}>{od.month} • {od.weekdayAr}</Text>
                    <Text style={[styles.dateStatusBadge, { color: '#34d399', backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                      انتهى حجز اليوم
                    </Text>
                  </View>
                );
              }

              // Tomorrow and upcoming advance days (bookable)
              if (od.isBookable) {
                return (
                  <TouchableOpacity accessibilityRole="button"
                    accessibilityLabel={`Travel date ${od.date}`}
                    accessibilityState={{ selected: isSelected }}
                    key={od.date}
                    onPress={() => selectDate(od.date)}
                    style={[
                      styles.dateCard,
                      isSelected ? {
                        borderColor: '#38bdf8',
                        borderWidth: 2,
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      } : {
                        borderColor: '#1e293b',
                        borderWidth: 1,
                        backgroundColor: '#020617',
                      }
                    ]}
                  >
                    <View style={[styles.dateBadge, isSelected ? { backgroundColor: '#38bdf8' } : { backgroundColor: '#1e293b' }]}>
                      <Text style={[styles.dateBadgeText, isSelected ? { color: '#0b0f19' } : { color: '#94a3b8' }]}>
                        {od.isTomorrow ? 'TOMORROW • غداً' : od.weekdayAr}
                      </Text>
                    </View>
                    <Text style={[styles.dateDayText, isSelected && { color: '#38bdf8' }]}>{od.day}</Text>
                    <Text style={styles.dateSubText}>{od.month} • {od.weekdayAr}</Text>
                    <Text style={[styles.dateStatusBadge, isSelected && { color: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.2)' }]}>
                      متاح للحجز
                    </Text>
                  </TouchableOpacity>
                );
              }

              // Past dates (e.g. Yesterday)
              return (
                <View
                  key={od.date}
                  style={[
                    styles.dateCard,
                    {
                      borderColor: '#1e293b',
                      borderWidth: 1,
                      backgroundColor: '#020617',
                      opacity: 0.4,
                    }
                  ]}
                >
                  <Text style={[styles.dateBadgeText, { color: '#64748b' }]}>YESTERDAY • أمس</Text>
                  <Text style={[styles.dateDayText, { color: '#64748b' }]}>{od.day}</Text>
                  <Text style={[styles.dateSubText, { color: '#475569' }]}>{od.month}</Text>
                  <Text style={[styles.dateStatusBadge, { color: '#64748b' }]}>منتهي</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Available Trips */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Scheduled Buses ({selectedDate})</Text>
        {isLoadingTrips ? (
          <ActivityIndicator color="#38bdf8" style={{marginVertical: 12}} />
        ) : tripsError ? (
          <View style={styles.inlineError}>
            <Text accessibilityRole="alert" style={styles.inlineErrorText}>{tripsError}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={fetchTrips} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
          </View>
        ) : trips.length === 0 ? (
          <Text style={{color: '#64748b', fontSize: 12, marginVertical: 8}}>No trips are scheduled for this route and date.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 8}}>
            {trips.map(t => (
              <TouchableOpacity accessibilityRole="button"
                accessibilityState={{ selected: activeTrip?.id === t.id }}
                key={t.id}
                onPress={() => selectTrip(t)}
                style={[styles.tripCard, activeTrip?.id === t.id && styles.activeTripCard]}
              >
                <Text style={[styles.tripCardTitle, activeTrip?.id === t.id && {color: '#38bdf8'}]}>
                  {t.bus?.name || 'Bus details unavailable'}
                </Text>
                <Text style={styles.tripCardSub}>{t.departureTime ? formatDepartureTime(t.departureTime) : t.timeSlot || 'Departure time unavailable'}</Text>
                {t.bus?.licensePlate ? <Text style={styles.tripCardPlate}>Plate: {t.bus.licensePlate}</Text> : null}
                <Text style={styles.tripCardPrice}>{Number(t.priceEgp).toFixed(2)} EGP</Text>
                {Number(t.priceEgp) > 0 ? <Text style={styles.paidUnavailable}>Paid booking unavailable in app</Text> : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Seat Selection */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>3. Select Seat (اختر المقعد)</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#1e293b' }]} />
            <Text style={styles.legendText}>Available (متاح)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#ef444433' }]} />
            <Text style={styles.legendText}>Booked (محجوز)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#38bdf8' }]} />
            <Text style={styles.legendText}>Selected (محدد)</Text>
          </View>
        </View>

        {isLoadingSeats ? (
          <ActivityIndicator color="#38bdf8" style={{marginVertical: 16}} />
        ) : seatsError ? (
          <View style={styles.inlineError}>
            <Text accessibilityRole="alert" style={styles.inlineErrorText}>{seatsError}</Text>
            {activeTrip ? <TouchableOpacity accessibilityRole="button" onPress={() => fetchSeatsForTrip(activeTrip.id)} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity> : null}
          </View>
        ) : !activeTrip ? (
          <Text style={styles.emptyHint}>Choose a server-provided trip to see its seat map.</Text>
        ) : seats.length === 0 ? (
          <Text style={styles.emptyHint}>No seat data was returned for this trip.</Text>
        ) : (
          <View style={{ alignItems: 'center', marginTop: 12 }}>
            <View style={styles.busLayout}>
              <View style={styles.busFront}>
                <Text style={styles.busFrontText}>Driver (السائق)</Text>
              </View>

              <View style={styles.gridRowContainer}>
                {Array.from({ length: Math.ceil(seats.length / 4) }, (_, rowIndex) => (
                  <View key={rowIndex} style={styles.seatRow}>
                    {seats.slice(rowIndex * 4, rowIndex * 4 + 4).map((seat, column) => {
                      const isSelected = selectedSeat === seat.seatNumber;
                      const disabled = seat.status !== 'free' || Number(activeTrip.priceEgp) !== 0;
                      const backgroundColor = isSelected ? '#38bdf8' : seat.status === 'free' ? '#1e293b' : '#ef444433';
                      return (
                        <React.Fragment key={seat.seatNumber}>
                          {column === 2 ? <View style={styles.aisleSpace} /> : null}
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={`Seat ${seat.seatNumber}, ${seat.status === 'free' ? 'available' : 'unavailable'}`}
                            accessibilityState={{ disabled, selected: isSelected }}
                            disabled={disabled}
                            onPress={() => handleSeatSelect(seat.seatNumber, seat.status)}
                            style={[styles.seat, { backgroundColor }]}
                          >
                            <Text style={[styles.seatText, isSelected && { color: '#0b0f19' }]}>{seat.seatNumber}</Text>
                          </TouchableOpacity>
                        </React.Fragment>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>

            {selectedSeat && Number(activeTrip.priceEgp) === 0 && !hasPendingBooking && (
              <TouchableOpacity accessibilityRole="button"
                onPress={confirmBooking}
                style={styles.payBtn}
              >
                <Text style={styles.payBtnText}>Continue with free seat {selectedSeat} · 0 EGP</Text>
              </TouchableOpacity>
            )}
            {Number(activeTrip.priceEgp) > 0 ? <Text style={styles.paidUnavailable}>Paid bookings are currently unavailable in the mobile app.</Text> : null}
          </View>
        )}
      </View>

    </>
  );
}
