'use client';
import { useState, useEffect } from 'react';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { useApp } from '@/hooks/useAppStore';

type AuthView = 'login' | 'register' | 'forgot';

export default function AuthPage() {
  const { user } = useApp();
  const [authView, setAuthView] = useState<AuthView>('login');

  useEffect(() => {
    if (user?.role === 'rider') window.location.href = '/rider';
    else if (user?.role === 'supervisor') window.location.href = '/supervisor';
    else if (user?.role === 'admin') window.location.href = '/admin';
  }, [user]);

  const handleSuccess = () => {
    window.location.href = '/rider';
  };

  return (
    <div className="min-h-screen bg-surface-bright flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-container rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="material-symbols-outlined text-on-primary-container text-3xl">directions_bus</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Bus Aesh</h1>
          <p className="text-sm text-text-secondary mt-1">Galala University Booking Portal</p>
        </div>

        <div className="bg-surface-container rounded-xl border border-border-whisper p-6 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)]">
          {authView !== 'forgot' && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-surface-container-low rounded-lg border border-border-whisper mb-6">
              <button
                type="button"
                onClick={() => setAuthView('login')}
                className={`py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  authView === 'login'
                    ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-sm">login</span>
                <span>Sign In (دخول)</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthView('register')}
                className={`py-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  authView === 'register'
                    ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-sm">person_add</span>
                <span>Register (تسجيل طالب)</span>
              </button>
            </div>
          )}

          {authView === 'login' && <LoginForm onSwitchTab={(t) => setAuthView(t as AuthView)} />}
          {authView === 'register' && <RegisterForm onSwitchTab={(t) => setAuthView(t as AuthView)} />}
          {authView === 'forgot' && <ForgotPasswordForm onBack={() => setAuthView('login')} />}
        </div>

        <div className="mt-6 text-center">
          <span className="material-symbols-outlined text-outline align-middle text-sm">security</span>
          <span className="text-[10px] text-text-secondary ml-1">Secured by Galala SSO</span>
        </div>
      </div>
    </div>
  );
}
