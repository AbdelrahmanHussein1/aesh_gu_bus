import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, TextInput, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ApiError, apiRequest } from '../src/api';
import { useAppContext } from '../src/app-context';

interface ScanResult {
  success: boolean;
  result?: string;
  message?: string;
  riderName?: string;
  seatNumber?: number;
  route?: string;
  bus?: string;
}

export default function QRScanner() {
  const router = useRouter();
  const { legType } = useLocalSearchParams<{ legType?: string }>();
  const { serverUrl, user } = useAppContext();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const scanInProgress = useRef(false);
  const isSupervisor = !!user && ['supervisor', 'admin'].includes(user.role);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (!isSupervisor || scanInProgress.current) return;
    scanInProgress.current = true;
    setScanned(true);
    setIsVerifying(true);
    setResult(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);

    try {
      const backendResult = await apiRequest<ScanResult>('/api/scan/verify', {
        baseUrl: serverUrl,
        token: user.token,
        method: 'POST',
        body: {
          token: data.trim(),
          expectedLegType: ['to_campus', 'from_campus'].includes(legType || '') ? legType : undefined,
        },
        timeoutMs: 8000,
      });
      setResult(backendResult);
      void Haptics.notificationAsync(backendResult.success
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      setResult({
        success: false,
        result: apiError?.status === 401 || apiError?.status === 403
          ? 'unauthorized'
          : apiError?.status === 0 ? 'network_error' : 'unverified',
        message: apiError?.message || 'Unable to verify this ticket with the server. Reconnect and try again.',
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualCodeInput.trim() || scanInProgress.current) return;
    const code = manualCodeInput.trim().toUpperCase();
    setManualModalVisible(false);
    setManualCodeInput('');
    void handleBarcodeScanned({ data: code });
  };

  const resetScanner = () => {
    scanInProgress.current = false;
    setScanned(false);
    setResult(null);
  };

  if (!isSupervisor) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Sign in with a supervisor account to use boarding scan.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={() => router.replace('/')}>
          <Text style={styles.permissionBtnText}>Return to sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!scanned ? (
        permission?.granted ? <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          {/* Target Reticle overlay */}
          <View style={styles.overlayContainer}>
            <View style={styles.reticleFrame}>
              <View style={styles.scanLine} />
            </View>
            <Text style={styles.overlayInstructions}>Position QR Code inside reticle</Text>
          </View>
        </CameraView> : <View style={styles.verifyingState}>
          {permission ? <>
            <Text style={styles.permissionText}>Camera permission is needed to scan QR codes. You can still enter a boarding code manually.</Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Grant Permission</Text>
            </TouchableOpacity>
          </> : <ActivityIndicator size="large" color="#38bdf8" />}
        </View>
      ) : (
        <View style={styles.resultContainer}>
          {isVerifying ? (
            <View style={styles.verifyingState}>
              <ActivityIndicator size="large" color="#38bdf8" />
              <Text style={styles.verifyingText}>Verifying Ticket...</Text>
            </View>
          ) : result ? (
            <View style={styles.resultCard}>
              <View style={[
                styles.resultStatusHeader, 
                  { backgroundColor: result.success ? '#10b981' : result.result === 'network_error' ? '#d97706' : '#ef4444' }
              ]}>
                <Text style={styles.resultStatusText}>
                  {result.success ? '✅ VALID TICKET' : result.result === 'payment_pending' ? '⚠️ PAYMENT NOT VERIFIED' : result.result === 'already_checked_in' ? '⛔ ALREADY USED' : result.result === 'expired' ? '⌛ EXPIRED TICKET' : result.result === 'network_error' ? '⚠️ NETWORK ERROR' : result.result === 'unauthorized' ? '🔒 SESSION UNAUTHORIZED' : '❌ INVALID TICKET'}
                </Text>
              </View>

              <View style={styles.resultBody}>
                {result.success ? (
                  <>
                    <Text style={styles.riderName}>{result.riderName}</Text>
                    <Text style={styles.seatNum}>Seat {result.seatNumber}</Text>
                    <Text style={styles.routeDetails}>{result.route}</Text>
                    <Text style={styles.busDetails}>{result.bus}</Text>
                  </>
                ) : (
                  <Text style={styles.errorMsg}>{result.message}</Text>
                )}

                <TouchableOpacity style={styles.scanNextBtn} onPress={resetScanner}>
                  <Text style={styles.scanNextBtnText}>Scan Next Passenger</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      )}

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        {!scanned && (
          <TouchableOpacity style={styles.manualCodeBtn} onPress={() => setManualModalVisible(true)}>
            <Text style={styles.manualCodeBtnText}>⌨ Enter Code Manually (رمز الصعود)</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>✕ Close Scanner</Text>
        </TouchableOpacity>
      </View>

      {/* Manual Code Modal */}
      <Modal
        visible={manualModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManualModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.manualModalCard}>
            <Text style={styles.manualModalTitle}>Manual Boarding Code</Text>
            <Text style={styles.manualModalSubtitle}>Type student's unique 4-character code (e.g. GU-7X4K or 7X4K)</Text>
            <TextInput
              style={styles.manualInput}
              value={manualCodeInput}
              onChangeText={setManualCodeInput}
              placeholder="GU-7X4K"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#1e293b' }]}
                onPress={() => { setManualModalVisible(false); setManualCodeInput(''); }}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#38bdf8' }]}
                onPress={handleManualSubmit}
                disabled={!manualCodeInput.trim()}
              >
                <Text style={[styles.modalBtnText, { color: '#0b0f19', fontWeight: 'bold' }]}>Verify & Board</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  permissionBtn: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionBtnText: {
    color: '#0b0f19',
    fontSize: 14,
    fontWeight: 'bold',
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(11, 15, 25, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleFrame: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: '#38bdf8',
    borderStyle: 'dashed',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#38bdf8',
  },
  overlayInstructions: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  resultContainer: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  verifyingState: {
    alignItems: 'center',
    gap: 12,
  },
  verifyingText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  resultStatusHeader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  resultStatusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  resultBody: {
    padding: 24,
    alignItems: 'center',
  },
  riderName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  seatNum: {
    color: '#38bdf8',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 8,
  },
  routeDetails: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 8,
  },
  busDetails: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  errorMsg: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  scanNextBtn: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  scanNextBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 36,
    left: 20,
    right: 20,
    alignItems: 'center',
    gap: 12,
  },
  manualCodeBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  manualCodeBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  backBtn: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manualModalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
    alignItems: 'center',
  },
  manualModalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  manualModalSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 16,
  },
  manualInput: {
    width: '100%',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#38bdf8',
    borderRadius: 12,
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
    paddingVertical: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  }
});
