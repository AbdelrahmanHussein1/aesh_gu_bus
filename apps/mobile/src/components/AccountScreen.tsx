import React, { useRef, useState } from 'react';
import {
  Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator,
  Modal, Alert, Image, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, apiRequest } from '../api';
import { useAppContext } from '../app-context';
import styles from '../styles/home';

const FACULTIES = [
  'Computer Science & Engineering',
  'Engineering',
  'Medicine',
  'Dentistry',
  'Pharmacy',
  'Administrative Sciences',
  'Art & Design',
  'Applied Health Sciences',
];

function authenticatedUser(data: any) {
  const account = data?.user;
  if (!data?.token || !account?.id || !account?.email || !account?.role) {
    throw new ApiError('The server did not return a complete authenticated session.', 502, 'INVALID_SESSION');
  }
  return {
    id: String(account.id),
    email: String(account.email),
    fullName: String(account.fullName || account.email),
    role: String(account.role),
    token: String(data.token),
  };
}

export default function AccountScreen() {
  const { serverUrl, serverUrlError, setServerUrl, setUser } = useAppContext();
  const insets = useSafeAreaInsets();
  const passwordInput = useRef<TextInput>(null);
  const loginInProgress = useRef(false);
  // Server URL configuration
  const [showServerModal, setShowServerModal] = useState(false);
  const [customServerInput, setCustomServerInput] = useState('');

  // Auth states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Student Registration States
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regStep, setRegStep] = useState<'details' | 'verify_code'>('details');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAcademicId, setRegAcademicId] = useState('');
  const [regFaculty, setRegFaculty] = useState(FACULTIES[0]);
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [regVerificationId, setRegVerificationId] = useState('');
  const [registrationPreverified, setRegistrationPreverified] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  // Handle Login via Real API
  const handleLogin = async () => {
    if (loginInProgress.current) return;
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    loginInProgress.current = true;
    setIsLoggingIn(true);

    try {
      const data = await apiRequest<any>('/api/auth/login', {
        baseUrl: serverUrl,
        method: 'POST',
        body: { email: email.trim(), password },
      });
      setUser(authenticatedUser(data));
    } catch (err: any) {
      Alert.alert('Login Error', err.message || 'Unable to reach the authentication server.');
    } finally {
      loginInProgress.current = false;
      setIsLoggingIn(false);
    }
  };

  // Student Registration Step 1: Request Outlook OTP
  const handleRegisterSendOtp = async () => {
    if (!regEmail || !regAcademicId) {
      Alert.alert('Error', 'Galala Email (@gu.edu.eg) and Academic ID are required');
      return;
    }

    const cleanEmail = regEmail.toLowerCase().trim();
    if (!cleanEmail.endsWith('@gu.edu.eg') && !cleanEmail.endsWith('@galala.edu.eg')) {
      Alert.alert('Domain Error', 'Registration is restricted to official Galala University student emails (@gu.edu.eg).');
      return;
    }

    setRegLoading(true);
    try {
      const data = await apiRequest<any>('/api/auth/verify-student', {
        baseUrl: serverUrl,
        method: 'POST',
        body: {
          email: cleanEmail,
          fullName: regName.trim(),
          academicId: regAcademicId.trim(),
          faculty: regFaculty,
        },
      });
      if (!data?.verificationId) throw new ApiError('The server did not return a verification ID.', 502, 'INVALID_VERIFICATION');

      Alert.alert(
        '📧 رمز التحقق',
        'تم إرسال رمز التحقق (OTP) إلى بريد Outlook الأكاديمي الخاص بك. يرجى مراجعة صندوق الوارد.',
        [{ text: 'متابعة' }]
      );
      setRegOtp('');
      setRegVerificationId(String(data.verificationId));
      setRegistrationPreverified(data.status === 'APPROVED');
      setRegStep('verify_code');
    } catch (err: any) {
      Alert.alert('Verification Error', err.message || 'Could not verify student ID.');
    } finally {
      setRegLoading(false);
    }
  };

  // Student Registration Step 2: Confirm OTP & Create Account
  const handleRegisterConfirm = async () => {
    if (!registrationPreverified && !regOtp) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }

    setRegLoading(true);
    try {
      // 1. Confirm code
      if (!registrationPreverified) {
        await apiRequest('/api/auth/confirm-code', {
          baseUrl: serverUrl,
          method: 'POST',
          body: { email: regEmail.toLowerCase().trim(), code: regOtp.trim() },
        });
      }

      // 2. Register user
      await apiRequest('/api/auth/register', {
        baseUrl: serverUrl,
        method: 'POST',
        body: {
          email: regEmail.toLowerCase().trim(),
          password: regPassword,
          fullName: regName.trim(),
          academicId: regAcademicId.trim(),
          faculty: regFaculty,
          phone: regPhone,
          role: 'rider',
          sheerIdVerificationId: regVerificationId,
        },
      });

      const session = await apiRequest<any>('/api/auth/login', {
        baseUrl: serverUrl,
        method: 'POST',
        body: { email: regEmail.toLowerCase().trim(), password: regPassword },
      });

      Alert.alert('🎉 تم التسجيل بنجاح', 'مرحباً بك في منظومة باصات جامعة الجلالة! تم تسجيل حسابك بنجاح.');
      setShowRegisterModal(false);
      setUser(authenticatedUser(session));
    } catch (err: any) {
      Alert.alert('Registration Error', err.message || 'Registration failed.');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.loginContainer} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        {/* Server Config Button */}
        <TouchableOpacity accessibilityRole="button"
          onPress={() => { setCustomServerInput(serverUrl); setShowServerModal(true); }}
          style={styles.serverConfigBtn}
        >
          <Text numberOfLines={2} style={styles.serverConfigBtnText}>⚙️ Server: {serverUrl ? serverUrl.replace(/https?:\/\//, '') : 'Not configured'}</Text>
        </TouchableOpacity>

        {serverUrlError ? <Text accessibilityRole="alert" style={styles.inlineErrorText}>{serverUrlError}</Text> : null}

        <Image
          source={require('../../assets/icon.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.title}>bus<Text style={{color: '#38bdf8'}}>.aesh</Text></Text>
        <Text style={styles.subtitle}>Galala University Transit System</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Galala Email / Username</Text>
          <TextInput
            accessibilityLabel="Galala email or username"
            keyboardType="email-address"
            autoComplete="username"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordInput.current?.focus()}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            placeholder="student@gu.edu.eg"
            placeholderTextColor="#64748b"
            style={styles.input}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            ref={passwordInput}
            accessibilityLabel="Password"
            autoComplete="current-password"
            returnKeyType="done"
            onSubmitEditing={() => void handleLogin()}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            style={styles.input}
          />
        </View>

        <TouchableOpacity accessibilityRole="button"
          onPress={handleLogin}
          disabled={isLoggingIn}
          accessibilityState={{ disabled: isLoggingIn, busy: isLoggingIn }}
          style={[styles.button, isLoggingIn && styles.disabledButton]}
        >
          {isLoggingIn ? (
            <ActivityIndicator color="#0b0f19" />
          ) : (
            <Text style={styles.buttonText}>Log In to Transit Portal</Text>
          )}
        </TouchableOpacity>

        {/* Register Button */}
        <TouchableOpacity accessibilityRole="button"
          onPress={() => { setRegStep('details'); setRegistrationPreverified(false); setShowRegisterModal(true); }}
          style={styles.registerBtn}
        >
          <Text style={styles.registerBtnText}>🎓 Register as Galala Student (حساب جديد)</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Galala University Transportation</Text>
          <Text style={styles.infoTextSub}>Students: Please register with your @gu.edu.eg email.</Text>
        </View>

        {/* Server Config Modal */}
        <Modal
          visible={showServerModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowServerModal(false)}
        >
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.modalContent, { maxHeight: '90%', paddingBottom: Math.max(24, insets.bottom) }]}>
              <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              <Text style={styles.modalTitle}>Configure API Server</Text>
              <Text style={{color: '#94a3b8', fontSize: 12, marginTop: 4}}>
                Enter the HTTP(S) server origin only (host and optional port). Do not include /api, a query, or a fragment:
              </Text>
              <TextInput
                accessibilityLabel="API server origin"
                keyboardType="url"
                autoCorrect={false}
                value={customServerInput}
                onChangeText={setCustomServerInput}
                placeholder="http://192.168.1.7:3000"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                style={[styles.input, {marginTop: 12}]}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity accessibilityRole="button"
                  onPress={() => setShowServerModal(false)}
                  style={[styles.modalActionBtn, {backgroundColor: '#1e293b'}]}
                >
                  <Text style={styles.modalActionText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button"
                  onPress={() => {
                    try {
                      setServerUrl(customServerInput);
                      setShowServerModal(false);
                    } catch (error) {
                      Alert.alert('Invalid server URL', error instanceof Error ? error.message : 'Enter a valid API URL.');
                    }
                  }}
                  style={[styles.modalActionBtn, {backgroundColor: '#38bdf8'}]}
                >
                  <Text style={[styles.modalActionText, {color: '#0b0f19'}]}>Save URL</Text>
                </TouchableOpacity>
              </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Student Registration Modal */}
        <Modal
          visible={showRegisterModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowRegisterModal(false)}
        >
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.modalContent, { paddingBottom: Math.max(24, insets.bottom), maxHeight: '85%'}]}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                <Text style={styles.modalTitle}>
                  {regStep === 'details' ? '🎓 New Student Registration' : '🔐 Verify Outlook Email'}
                </Text>
                <Text style={{color: '#94a3b8', fontSize: 12, marginTop: 4, marginBottom: 12}}>
                  {regStep === 'details'
                    ? 'Registration is restricted to Galala University students (@gu.edu.eg).'
                    : registrationPreverified ? 'Your student status was approved by the university verification service.' : 'A 6-digit OTP code has been sent to your Outlook mailbox.'}
                </Text>

                {regStep === 'details' ? (
                  <View style={{gap: 10}}>
                    <View>
                      <Text style={styles.label}>Full Name</Text>
                      <TextInput
                        value={regName}
                        onChangeText={setRegName}
                        placeholder="Ahmed Mohamed Ali"
                        placeholderTextColor="#64748b"
                        style={styles.input}
                      />
                    </View>

                    <View>
                      <Text style={styles.label}>Galala University Email (@gu.edu.eg)</Text>
                      <TextInput
                        accessibilityLabel="University email"
                        keyboardType="email-address"
                        autoCorrect={false}
                        value={regEmail}
                        onChangeText={setRegEmail}
                        autoCapitalize="none"
                        placeholder="student@gu.edu.eg"
                        placeholderTextColor="#64748b"
                        style={styles.input}
                      />
                    </View>

                    <View>
                      <Text style={styles.label}>Academic ID (رقم القيد)</Text>
                      <TextInput
                        value={regAcademicId}
                        onChangeText={setRegAcademicId}
                        placeholder="21010012"
                        placeholderTextColor="#64748b"
                        style={styles.input}
                      />
                    </View>

                    <View>
                      <Text style={styles.label}>Phone Number (رقم الهاتف)</Text>
                      <TextInput
                        value={regPhone}
                        onChangeText={setRegPhone}
                        keyboardType="phone-pad"
                        placeholder="010XXXXXXXX"
                        placeholderTextColor="#64748b"
                        style={styles.input}
                      />
                    </View>

                    <View>
                      <Text style={styles.label}>Password</Text>
                      <TextInput
                        accessibilityLabel="New password"
                        autoComplete="new-password"
                        value={regPassword}
                        onChangeText={setRegPassword}
                        secureTextEntry
                        placeholder="••••••••"
                        placeholderTextColor="#64748b"
                        style={styles.input}
                      />
                    </View>

                    <TouchableOpacity accessibilityRole="button"
                      onPress={handleRegisterSendOtp}
                      disabled={regLoading}
                      style={[styles.button, {marginTop: 10}]}
                    >
                      {regLoading ? (
                        <ActivityIndicator color="#0b0f19" />
                      ) : (
                        <Text style={styles.buttonText}>Send Outlook OTP Code</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{gap: 12}}>
                    {registrationPreverified ? (
                      <Text style={styles.emptyHint}>The server verified this student automatically. Continue to create the account.</Text>
                    ) : (
                      <>
                        <TouchableOpacity accessibilityRole="button"
                          onPress={() => Linking.openURL('https://outlook.office.com/mail/')}
                          style={styles.outlookBtn}
                        >
                          <Text style={styles.outlookBtnText}>📥 Open Galala Outlook Webmail</Text>
                        </TouchableOpacity>
                        <View>
                          <Text style={styles.label}>Enter 6-Digit OTP Code</Text>
                          <TextInput
                            accessibilityLabel="Email verification code"
                            textContentType="oneTimeCode"
                            value={regOtp}
                            onChangeText={setRegOtp}
                            keyboardType="number-pad"
                            maxLength={6}
                            placeholder="Enter the code sent to your email"
                            placeholderTextColor="#64748b"
                            style={[styles.input, {textAlign: 'center', fontSize: 24, letterSpacing: 6, fontWeight: 'bold'}]}
                          />
                        </View>
                      </>
                    )}

                    <View style={styles.modalActions}>
                      <TouchableOpacity accessibilityRole="button"
                        onPress={() => setRegStep('details')}
                        style={[styles.modalActionBtn, {backgroundColor: '#1e293b'}]}
                      >
                        <Text style={styles.modalActionText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity accessibilityRole="button"
                        onPress={handleRegisterConfirm}
                        disabled={regLoading}
                        style={[styles.modalActionBtn, {backgroundColor: '#38bdf8'}]}
                      >
                        {regLoading ? (
                          <ActivityIndicator color="#0b0f19" />
                        ) : (
                          <Text style={[styles.modalActionText, {color: '#0b0f19'}]}>Verify & Complete</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <TouchableOpacity accessibilityRole="button"
                  onPress={() => setShowRegisterModal(false)}
                  style={{minHeight: 44, justifyContent: 'center', marginTop: 16, alignItems: 'center'}}
                >
                  <Text style={{color: '#64748b', fontSize: 12}}>Close Window</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
