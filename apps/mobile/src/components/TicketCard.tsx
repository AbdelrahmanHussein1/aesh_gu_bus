import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { Ticket } from '../types';
import { formatDepartureTime } from '../format';

export default function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.routeDetails}>
          <Text style={styles.route}>{ticket.route || 'Route details unavailable'}</Text>
          <Text style={styles.time}>{ticket.date || 'Date unavailable'} · {formatDepartureTime(ticket.time)}</Text>
        </View>
        <View style={styles.seatBadge}>
          <Text style={styles.seatText}>Seat {ticket.seatNumber}</Text>
        </View>
      </View>

      {ticket.status === 'cancelled' ? (
        <View style={styles.cancelled}>
          <Text style={styles.cancelledTitle}>BOOKING CANCELLED</Text>
          <Text style={styles.secondary}>{ticket.cancelReason || 'This booking is no longer active.'}</Text>
        </View>
      ) : ticket.isBoarded ? (
        <View style={styles.boarded}>
          <Text style={styles.boardedTitle}>PASSENGER BOARDED</Text>
          <Text style={styles.secondary}>Boarding was verified by the supervisor.</Text>
        </View>
      ) : ticket.paymentStatus !== 'paid' ? (
        <View style={styles.pending}>
          <Text style={styles.pendingTitle}>PAYMENT PENDING</Text>
          <Text style={styles.secondary}>This ticket is unavailable until payment is verified.</Text>
        </View>
      ) : ticket.qrToken ? (
        <View style={styles.ticketBody}>
          <View style={styles.qrSurface}>
            <QRCode value={ticket.qrToken} size={168} />
          </View>
          {ticket.boardingCode ? (
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>MANUAL BOARDING CODE</Text>
              <Text style={styles.code}>{ticket.boardingCode}</Text>
              <Text style={styles.secondary}>Show this code to the supervisor if the QR scanner is unavailable.</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.pending}>
          <Text style={styles.pendingTitle}>TICKET DETAILS UNAVAILABLE</Text>
          <Text style={styles.secondary}>The server did not return a ticket token. Refresh bookings to try again.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#0f172a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1e293b', marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1e293b', paddingBottom: 12 },
  routeDetails: { flex: 1, paddingRight: 8 },
  route: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  time: { fontSize: 11, color: '#94a3b8', marginTop: 3 },
  seatBadge: { backgroundColor: '#102d3c', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#1e5168' },
  seatText: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
  ticketBody: { alignItems: 'center', paddingTop: 16 },
  qrSurface: { backgroundColor: '#fff', padding: 12, borderRadius: 12 },
  codeBox: { marginTop: 12, width: '100%', padding: 12, backgroundColor: '#071521', borderWidth: 1, borderColor: '#1e5168', borderRadius: 12, alignItems: 'center' },
  codeLabel: { fontSize: 9, color: '#94a3b8', fontWeight: 'bold', letterSpacing: 0.5 },
  code: { fontSize: 22, fontWeight: '900', color: '#38bdf8', letterSpacing: 3, marginVertical: 5 },
  secondary: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  cancelled: { backgroundColor: '#2a1117', borderColor: '#7f1d1d', borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 12, alignItems: 'center', gap: 5 },
  cancelledTitle: { color: '#f87171', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  boarded: { backgroundColor: '#082217', borderColor: '#166534', borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 12, alignItems: 'center', gap: 5 },
  boardedTitle: { color: '#4ade80', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  pending: { backgroundColor: '#211b0b', borderColor: '#854d0e', borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 12, alignItems: 'center', gap: 5 },
  pendingTitle: { color: '#facc15', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
});
