'use client';
import { useState } from 'react';
import { getApiBaseUrl } from '@/lib/api';

const FACULTIES = [
  'Computer Science & Engineering',
  'Engineering',
  'Medicine',
  'Dentistry',
  'Pharmacy',
  'Administrative Sciences',
  'Art & Design',
  'Applied Health Sciences',
  'Physiotherapy',
  'Basic Sciences',
];

interface Props {
  onSwitchTab?: (tab: 'login' | 'register') => void;
}

export default function RegisterForm({ onSwitchTab }: Props = {}) {
  const [step, setStep] = useState<'details' | 'verify_code'>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [academicId, setAcademicId] = useState('');
  const [faculty, setFaculty] = useState(FACULTIES[0]);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const apiUrl = getApiBaseUrl();

    // Client-side domain check
    const cleanEmail = email.toLowerCase().trim();
    if (
      !cleanEmail.endsWith('@gu.edu.eg') &&
      !cleanEmail.endsWith('@galala.edu.eg') &&
      !cleanEmail.startsWith('aes') &&
      !cleanEmail.startsWith('test.')
    ) {
      setError('Registration is restricted to Galala University students (@gu.edu.eg)');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/auth/verify-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          fullName: name,
          academicId: academicId.trim(),
          faculty,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.messageAr || data.error || 'Verification failed');
      }

      setSuccessNotice(data.messageAr || 'تم إرسال كود التحقق إلى بريدك الجامعي');
      setStep('verify_code');
    } catch (err: any) {
      setError(err.message || 'Failed to verify student credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const apiUrl = getApiBaseUrl();

    try {
      // 1. Confirm 6-digit code
      const verifyRes = await fetch(`${apiUrl}/api/auth/confirm-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          code: verificationCode.trim(),
        }),
      });

      if (!verifyRes.ok) {
        const errData = await verifyRes.json();
        throw new Error(errData.messageAr || errData.error || 'Invalid code');
      }

      // 2. Register student account
      const regRes = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          fullName: name,
          role: 'rider',
          password,
          academicId: academicId.trim(),
          faculty,
          phone,
          sheerIdVerificationId: `verified_${academicId}`,
        }),
      });

      const regData = await regRes.json();
      if (!regRes.ok) {
        throw new Error(regData.messageAr || regData.error || 'Registration failed');
      }

      alert('تم إنشاء حسابك وتأكيد القيد الطلابي بنجاح! يمكنك الآن تسجيل الدخول.');
      if (onSwitchTab) {
        onSwitchTab('login');
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || 'Verification or registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="bg-error-container/50 border border-error-container text-on-error-container px-4 py-3 rounded-lg text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{error}</span>
        </div>
      )}

      {successNotice && (
        <div className="bg-emerald-950/50 border border-emerald-500 text-emerald-300 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">mark_email_read</span>
          <span>{successNotice}</span>
        </div>
      )}

      {step === 'details' ? (
        <form onSubmit={handleSendVerification} autoComplete="off" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-primary" htmlFor="reg-name">Student Full Name (الاسم بالكامل)</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-base">badge</span>
              <input
                id="reg-name" type="text" required placeholder="Ahmed Mohamed Ali"
                autoComplete="off"
                value={name} onChange={e => setName(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-surface-bright border border-border-whisper rounded-lg text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-container"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-primary" htmlFor="reg-email">Galala Email (@gu.edu.eg)</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-base">school</span>
              <input
                id="reg-email" type="email" required placeholder="student@gu.edu.eg"
                autoComplete="off"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-surface-bright border border-border-whisper rounded-lg text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-container"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-primary" htmlFor="reg-academic-id">Academic ID (رقم القيد)</label>
              <input
                id="reg-academic-id" type="text" required placeholder="21010012"
                autoComplete="off"
                value={academicId} onChange={e => setAcademicId(e.target.value)}
                className="w-full h-10 px-3 bg-surface-bright border border-border-whisper rounded-lg text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-container"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-primary" htmlFor="reg-phone">Phone No. (الموبايل)</label>
              <input
                id="reg-phone" type="tel" required placeholder="010XXXXXXXX"
                autoComplete="off"
                value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full h-10 px-3 bg-surface-bright border border-border-whisper rounded-lg text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-container"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-primary" htmlFor="reg-faculty">Faculty / Field (الكلية)</label>
            <select
              id="reg-faculty" value={faculty} onChange={e => setFaculty(e.target.value)}
              className="w-full h-10 px-3 bg-surface-bright border border-border-whisper rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary-container"
            >
              {FACULTIES.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-primary" htmlFor="reg-password">Password (كلمة المرور)</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-base">lock</span>
              <input
                id="reg-password" type="password" required placeholder="••••••••" minLength={6}
                autoComplete="new-password"
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-surface-bright border border-border-whisper rounded-lg text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-container"
              />
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full h-11 bg-primary-container text-on-primary font-medium rounded-lg hover:bg-primary-container/90 transition-all mt-2 shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="material-symbols-outlined animate-spin text-base">sync</span><span>Verifying Student ID...</span></>
            ) : (
              <><span className="material-symbols-outlined text-base">verified</span><span>Verify Galala Student Status</span></>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleConfirmAndRegister} className="flex flex-col gap-4">
          <div className="bg-surface-bright p-3 rounded-lg border border-border-whisper text-xs text-text-secondary">
            <p>تم إرسال رمز التحقق الأكاديمي إلى: <strong className="text-text-primary">{email}</strong></p>
            <p className="mt-1 text-[11px] text-cyan-400">تنبيه: يمكنك استخدام الرمز التجريبي <strong>123456</strong> للتسجيل الفوري.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-primary" htmlFor="reg-code">6-Digit Verification Code</label>
            <input
              id="reg-code" type="text" maxLength={6} required placeholder="123456"
              value={verificationCode} onChange={e => setVerificationCode(e.target.value)}
              className="w-full h-12 text-center text-xl tracking-widest font-mono font-bold bg-surface-bright border border-border-whisper rounded-lg text-text-primary focus:outline-none focus:border-primary-container"
            />
          </div>

          <div className="flex gap-2 mt-2">
            <button
              type="button" onClick={() => setStep('details')}
              className="flex-1 h-11 bg-surface-bright border border-border-whisper text-text-secondary hover:text-text-primary rounded-lg text-sm font-medium"
            >
              Back
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-2 h-11 bg-primary-container text-on-primary font-medium rounded-lg hover:bg-primary-container/90 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="material-symbols-outlined animate-spin text-base">sync</span><span>Finalizing...</span></>
              ) : (
                <span>Confirm & Complete Registration</span>
              )}
            </button>
          </div>
        </form>
      )}
      <div className="pt-3 border-t border-border-whisper text-center text-xs text-text-secondary">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => (onSwitchTab ? onSwitchTab('login') : window.location.reload())}
          className="text-primary-container font-semibold hover:underline"
        >
          Sign In (تسجيل الدخول)
        </button>
      </div>
    </div>
  );
}
