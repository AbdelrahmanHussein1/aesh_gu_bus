import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Modal, 
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';

// Simulated local storage / local DB state for offline simulation
// Since AsyncStorage is async, we can use a simple memory state initialized with mock records.
export default function AppHome() {
  const router = useRouter();

  // Auth states
  const [email, setEmail] = useState('aes400196@gu.edu.eg');
  const [password, setPassword] = useState('1Key@GALALA');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Selector states
  const [routes, setRoutes] = useState<any[]>([
    { id: 1, nameAr: 'العبور', nameEn: 'El Obour' },
    { id: 3, nameAr: 'اكتوبر', nameEn: '6th of October' },
    { id: 4, nameAr: 'حدائق الاهرام', nameEn: 'Hadayek Al Ahram' },
    { id: 12, nameAr: 'مدينة نصر', nameEn: 'Nasr City' },
    { id: 25, nameAr: 'مدينتى', nameEn: 'Madinaty' }
  ]);
  const [selectedRouteId, setSelectedRouteId] = useState(1);
  const [selectedDirection, setSelectedDirection] = useState<'to_campus' | 'from_campus'>('to_campus');
  const [trips, setTrips] = useState<any[]>([]);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  
  // Seat state
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  
  // Checkout
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'visa' | 'instapay'>('visa');
  const [cardNumber, setCardNumber] = useState('');
  const [receiptRef, setReceiptRef] = useState('');
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  // Initial Mock Loading
  useEffect(() => {
    // Generate mock trips
    const matched = routes.find(r => r.id === selectedRouteId);
    if (!matched) return;

    const mockTrips = [
      {
        id: selectedRouteId * 10 + 1,
        name: `${matched.nameEn}/وصول/9:00`,
        time: selectedDirection === 'to_campus' ? '07:00 AM' : '04:45 PM',
        price: 160,
        licensePlate: `أ ب ج ${100 + selectedRouteId}`
      }
    ];
    setTrips(mockTrips);
    setActiveTrip(mockTrips[0]);
    loadSeats(mockTrips[0].id);
  }, [selectedRouteId, selectedDirection]);

  const loadSeats = (tripId: number) => {
    // Generate 50 seats. 10% randomly booked for mock visual.
    const mockSeats = Array.from({ length: 50 }, (_, i) => ({
      seatNumber: i + 1,
      status: Math.random() < 0.2 ? 'booked' : 'free',
      userId: null
    }));
    setSeats(mockSeats);
  };

  const handleLogin = () => {
    if (!email || !password) return;
    setIsLoggingIn(true);
    
    // Simulate auth check
    setTimeout(() => {
      setIsLoggingIn(false);
      if (email === 'aes400196@gu.edu.eg' && password === '1Key@GALALA') {
        setUser({
          id: 'user-77',
          email,
          fullName: 'Abdelrahman Ehab',
          role: 'rider'
        });
      } else if (email.startsWith('supervisor') || email.startsWith('driver')) {
        setUser({ id: 'user-super', email, fullName: 'Supervisor Aesh (Merged)', role: 'supervisor' });
      } else {
        setUser({ id: 'user-generic', email, fullName: 'Test User', role: 'rider' });
      }
    }, 1200);
  };

  const handleSeatSelect = (seatNum: number, status: string) => {
    if (status === 'booked') return;
    setSelectedSeat(selectedSeat === seatNum ? null : seatNum);
  };

  const handleBookingSubmit = () => {
    if (!selectedSeat || !activeTrip) return;
    setIsProcessingPay(true);

    setTimeout(() => {
      // Create new ticket
      const bookingId = `book-${Math.random().toString(36).substring(2, 9)}`;
      const mockToken = `${bookingId.replace(/-/g, '')}.${activeTrip.id.toString(16)}.${selectedSeat.toString(16)}.20260625.1.mocksignaturehex`;

      const newTicket = {
        id: bookingId,
        route: routes.find(r => r.id === selectedRouteId)?.nameEn || 'El Obour',
        seatNumber: selectedSeat,
        time: activeTrip.time,
        date: '2026-06-25',
        qrToken: mockToken
      };

      setMyTickets(prev => [newTicket, ...prev]);
      
      // Update seat map
      setSeats(prev => prev.map(s => s.seatNumber === selectedSeat ? { ...s, status: 'booked' } : s));

      setIsProcessingPay(false);
      setCheckoutVisible(false);
      setSelectedSeat(null);
      
      Alert.alert("Success", "Seat booked successfully! View your QR code ticket below.");
    }, 1500);
  };

  if (!user) {
    // Login Screen
    return (
      <ScrollView contentContainerStyle={styles.loginContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>🚌</Text>
        </View>
        <Text style={styles.title}>bus<Text style={{color: '#38bdf8'}}>.aesh</Text></Text>
        <Text style={styles.subtitle}>Galala University Transit</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            placeholder="student@gu.edu.eg"
            placeholderTextColor="#64748b"
            style={styles.input}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>ERP Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            style={styles.input}
          />
        </View>

        <TouchableOpacity 
          onPress={handleLogin}
          disabled={isLoggingIn}
          style={styles.button}
        >
          {isLoggingIn ? (
            <ActivityIndicator color="#0b0f19" />
          ) : (
            <Text style={styles.buttonText}>Log In with ERP</Text>
          )}
        </TouchableOpacity>

        {/* Demo helpers */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Demo Accounts:</Text>
          <Text style={styles.infoTextSub}>Rider: aes400196@gu.edu.eg / 1Key@GALALA</Text>
          <Text style={styles.infoTextSub}>Supervisor: supervisor@gu.edu.eg / super123</Text>
        </View>
      </ScrollView>
    );
  }

  // Logged-in screen (Rider Portal / Supervisor console hub)
  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello,</Text>
          <Text style={styles.userName}>{user.fullName}</Text>
        </View>
        
        {/* Sign Out */}
        <TouchableOpacity onPress={() => setUser(null)} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Supervisor quick switch */}
      {user.role === 'supervisor' && (
        <TouchableOpacity 
          onPress={() => router.push({ pathname: '/scanner', params: { legType: selectedDirection } })}
          style={styles.supervisorBanner}
        >
          <Text style={styles.supervisorBannerText}>🚀 Open Camera QR Boarding Scanner</Text>
        </TouchableOpacity>
      )}

      {/* Route selector card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. Choose Route & Time</Text>
        
        {/* Route select mockup */}
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.selectLabel}>Select Bus Line</Text>
          <View style={styles.fakeDropdown}>
            <Text style={styles.fakeDropdownText}>
              {routes.find(r => r.id === selectedRouteId)?.nameEn}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {routes.map(r => (
              <TouchableOpacity
                key={r.id}
                onPress={() => setSelectedRouteId(r.id)}
                style={[styles.chip, selectedRouteId === r.id && styles.activeChip]}
              >
                <Text style={[styles.chipText, selectedRouteId === r.id && styles.activeChipText]}>
                  {r.nameEn}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Direction toggle */}
        <View style={styles.directionToggle}>
          <TouchableOpacity
            onPress={() => setSelectedDirection('to_campus')}
            style={[styles.toggleBtn, selectedDirection === 'to_campus' && styles.activeToggleBtn]}
          >
            <Text style={[styles.toggleText, selectedDirection === 'to_campus' && styles.activeToggleText]}>
              To Campus (9:00 AM)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedDirection('from_campus')}
            style={[styles.toggleBtn, selectedDirection === 'from_campus' && styles.activeToggleBtn]}
          >
            <Text style={[styles.toggleText, selectedDirection === 'from_campus' && styles.activeToggleText]}>
              Return (4:45 PM)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Seat booking grid */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Select Seat</Text>
        
        {activeTrip ? (
          <View style={styles.seatGridContainer}>
            <View style={styles.seatLegend}>
              <View style={styles.legendItem}><View style={[styles.legendBox, {backgroundColor: '#1e293b'}]}/><Text style={styles.legendText}>Free</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendBox, {backgroundColor: '#ef4444'}]}/><Text style={styles.legendText}>Sold</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendBox, {backgroundColor: '#38bdf8'}]}/><Text style={styles.legendText}>Selected</Text></View>
            </View>

            <View style={styles.busLayout}>
              <View style={styles.busFront}><Text style={styles.busFrontText}>Front</Text></View>
              
              <View style={styles.gridRowContainer}>
                {seats.map((seat, index) => {
                  const isAisle = index % 5 === 2;
                  const isSelected = selectedSeat === seat.seatNumber;
                  
                  let seatColor = '#1e293b'; // free
                  if (seat.status === 'booked') seatColor = '#ef4444'; // sold
                  else if (isSelected) seatColor = '#38bdf8'; // selected

                  if (isAisle) {
                    return (
                      <React.Fragment key={`row-${index}`}>
                        <View style={styles.aisleSpace} />
                        <TouchableOpacity
                          disabled={seat.status === 'booked'}
                          onPress={() => handleSeatSelect(seat.seatNumber, seat.status)}
                          style={[styles.seat, { backgroundColor: seatColor }]}
                        >
                          <Text style={styles.seatText}>{seat.seatNumber}</Text>
                        </TouchableOpacity>
                      </React.Fragment>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={seat.seatNumber}
                      disabled={seat.status === 'booked'}
                      onPress={() => handleSeatSelect(seat.seatNumber, seat.status)}
                      style={[styles.seat, { backgroundColor: seatColor }]}
                    >
                      <Text style={styles.seatText}>{seat.seatNumber}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {selectedSeat && (
              <TouchableOpacity
                onPress={() => setCheckoutVisible(true)}
                style={styles.payBtn}
              >
                <Text style={styles.payBtnText}>Pay 160 EGP (Seat {selectedSeat})</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text style={{color: '#64748b', fontSize: 12, fontStyle: 'italic'}}>Select a route to display seat map</Text>
        )}
      </View>

      {/* Ticket History List */}
      <View style={{ marginTop: 12 }}>
        <Text style={styles.sectionHeader}>Active QR Tickets</Text>
        
        {myTickets.length === 0 ? (
          <Text style={styles.noTicketsText}>No active tickets purchased.</Text>
        ) : (
          myTickets.map(t => (
            <View key={t.id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <View>
                  <Text style={styles.ticketRoute}>{t.route}</Text>
                  <Text style={styles.ticketTime}>{t.date} • {t.time}</Text>
                </View>
                <View style={styles.ticketSeatBadge}>
                  <Text style={styles.ticketSeatText}>Seat {t.seatNumber}</Text>
                </View>
              </View>

              {/* QR Image mockup */}
              <View style={styles.qrContainer}>
                <View style={styles.qrWrapper}>
                  <View style={{width: 140, height: 140, backgroundColor: 'white', padding: 4, borderRadius: 8}}>
                    <View style={styles.qrMockPlaceholder}>
                      <Text style={{fontSize: 24}}>📱</Text>
                      <Text style={{fontSize: 8, color: '#333', marginTop: 4, fontWeight: 'bold'}}>SCANNABLE TICKET</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.qrTokenText} numberOfLines={1}>Token: {t.qrToken}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* CHECKOUT MODAL */}
      <Modal
        visible={checkoutVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCheckoutVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Checkout — Bus Aesh</Text>
            
            <View style={styles.modalDetails}>
              <Text style={styles.detailsText}>Amount: <Text style={{fontWeight: 'bold', color: '#38bdf8'}}>160.00 EGP</Text></Text>
              <Text style={styles.detailsText}>Selected Seat: <Text style={{fontWeight: 'bold'}}>Seat {selectedSeat}</Text></Text>
            </View>

            {/* Payment Method selector */}
            <View style={styles.paymentMethodRow}>
              <TouchableOpacity
                onPress={() => setPaymentMethod('visa')}
                style={[styles.paymentMethodBtn, paymentMethod === 'visa' && styles.activePaymentBtn]}
              >
                <Text style={[styles.paymentMethodText, paymentMethod === 'visa' && styles.activePaymentText]}>Credit Card</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPaymentMethod('instapay')}
                style={[styles.paymentMethodBtn, paymentMethod === 'instapay' && styles.activePaymentBtn]}
              >
                <Text style={[styles.paymentMethodText, paymentMethod === 'instapay' && styles.activePaymentText]}>Instapay</Text>
              </TouchableOpacity>
            </View>

            {paymentMethod === 'visa' ? (
              <View style={{gap: 8, marginTop: 12}}>
                <TextInput
                  placeholder="Card Number"
                  placeholderTextColor="#64748b"
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  style={styles.input}
                />
                <View style={{flexDirection: 'row', gap: 8}}>
                  <TextInput
                    placeholder="MM/YY"
                    placeholderTextColor="#64748b"
                    style={[styles.input, {flex: 1}]}
                  />
                  <TextInput
                    placeholder="CVV"
                    secureTextEntry
                    placeholderTextColor="#64748b"
                    style={[styles.input, {flex: 1}]}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.instapayContainer}>
                <Text style={styles.instapayAddress}>Send to: <Text style={{fontWeight: 'bold', color: '#38bdf8'}}>01007883492@instapay</Text></Text>
                <TextInput
                  placeholder="Enter Transfer Ref / Mobile No."
                  placeholderTextColor="#64748b"
                  value={receiptRef}
                  onChangeText={setReceiptRef}
                  style={styles.input}
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setCheckoutVisible(false)}
                style={[styles.modalActionBtn, {backgroundColor: '#1e293b'}]}
              >
                <Text style={styles.modalActionText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleBookingSubmit}
                disabled={isProcessingPay}
                style={[styles.modalActionBtn, {backgroundColor: '#38bdf8'}]}
              >
                {isProcessingPay ? (
                  <ActivityIndicator color="#0b0f19" />
                ) : (
                  <Text style={[styles.modalActionText, {color: '#0b0f19'}]}>Confirm Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0b0f19',
    padding: 16,
    paddingTop: 48,
  },
  loginContainer: {
    flexGrow: 1,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    padding: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  logoBadgeText: {
    fontSize: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#fff',
  },
  button: {
    backgroundColor: '#38bdf8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#0b0f19',
    fontSize: 15,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#1e293b33',
    borderColor: '#38bdf81d',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  infoText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  infoTextSub: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 4,
  },
  // Main Dashboard Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    color: '#64748b',
    fontSize: 12,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signOutBtn: {
    padding: 8,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  signOutText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  supervisorBanner: {
    backgroundColor: '#8b5cf622',
    borderWidth: 1,
    borderColor: '#8b5cf644',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  supervisorBannerText: {
    color: '#c084fc',
    fontSize: 13,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  selectLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  fakeDropdown: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
  },
  fakeDropdownText: {
    color: '#fff',
    fontSize: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    marginRight: 8,
  },
  activeChip: {
    backgroundColor: '#38bdf8',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  activeChipText: {
    color: '#0b0f19',
    fontWeight: 'bold',
  },
  directionToggle: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeToggleBtn: {
    backgroundColor: '#38bdf8',
  },
  toggleText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: 'bold',
  },
  activeToggleText: {
    color: '#0b0f19',
  },
  // Seat Selector styles
  seatGridContainer: {
    alignItems: 'center',
  },
  seatLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    color: '#94a3b8',
    fontSize: 10,
  },
  busLayout: {
    width: 260,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 24,
    padding: 16,
  },
  busFront: {
    alignSelf: 'center',
    width: 80,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    marginBottom: 16,
  },
  busFrontText: {
    color: '#334155',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  gridRowContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  seat: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  aisleSpace: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payBtn: {
    width: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  payBtnText: {
    color: '#0b0f19',
    fontSize: 13,
    fontWeight: 'bold',
  },
  // Ticket History Cards
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 10,
  },
  noTicketsText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  ticketCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 12,
  },
  ticketRoute: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  ticketTime: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  ticketSeatBadge: {
    backgroundColor: '#38bdf81a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38bdf833',
  },
  ticketSeatText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  qrContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  qrMockPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrTokenText: {
    fontSize: 9,
    color: '#475569',
    marginTop: 6,
    width: '100%',
    textAlign: 'center',
  },
  // Modal checkout
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalDetails: {
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 4,
  },
  detailsText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 12,
  },
  paymentMethodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activePaymentBtn: {
    backgroundColor: '#38bdf8',
  },
  paymentMethodText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activePaymentText: {
    color: '#0b0f19',
  },
  instapayContainer: {
    marginTop: 12,
    gap: 8,
  },
  instapayAddress: {
    fontSize: 12,
    color: '#94a3b8',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  modalActionBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  }
});
