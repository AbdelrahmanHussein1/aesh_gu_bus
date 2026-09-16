'use client';
import { useState } from 'react';
import { useApp } from '@/hooks/useAppStore';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Props {
  onSwitchTab: (tab: 'login' | 'register' | 'forgot-password') => void;
}

export default function LoginForm({ onSwitchTab }: Props) {
  const { login } = useApp();
  const { t, locale } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const saved = typeof window !== 'undefined' ? localStorage.getItem('aesh_web_user') : null;
      const userRole = saved ? JSON.parse(saved).role : 'rider';
      if (userRole === 'supervisor') window.location.href = '/supervisor';
      else if (userRole === 'admin') window.location.href = '/admin';
      else window.location.href = '/rider';
    } catch (err: any) {
      setError(err.message || (locale === 'ar' ? 'فشل تسجيل الدخول. يرجى مراجعة البيانات.' : 'Authentication failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col gap-5">
      {/* Honeypot / dummy fields to deter aggressive browser autofill */}
      <input type="text" name="prevent_autofill_user" tabIndex={-1} aria-hidden="true" className="hidden opacity-0 absolute -top-9999px -left-9999px h-0 w-0 pointer-events-none" />
      <input type="password" name="prevent_autofill_pwd" tabIndex={-1} aria-hidden="true" className="hidden opacity-0 absolute -top-9999px -left-9999px h-0 w-0 pointer-events-none" />

      {error && (
        <div className="bg-error-container/50 border border-error-container text-on-error-container px-4 py-3 rounded-lg text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          <span className="font-semibold">{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-2 text-start">
        <label className="font-body-sm text-body-sm text-text-primary font-medium" htmlFor="email">
          {t('email')}
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg pointer-events-none">mail</span>
          <input
            id="email"
            name="gu_login_email"
            type="email"
            required
            autoComplete="off"
            placeholder={locale === 'ar' ? 'student@gu.edu.eg' : 'name@gu.edu.eg'}
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full h-[44px] ps-10 pe-4 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[6px] font-body-md text-body-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 text-start">
        <label className="font-body-sm text-body-sm text-text-primary font-medium" htmlFor="password">
          {t('password')}
        </label>
        <div className="relative">
          <span className="material-symbols-outlined absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg pointer-events-none">lock</span>
          <input
            id="password"
            name="gu_login_pass"
            type={showPw ? 'text' : 'password'}
            required
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full h-[44px] ps-10 pe-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[6px] font-body-md text-body-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
          />
          <button type="button" onClick={() => setShowPw(p => !p)} className="absolute end-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
            <span className="material-symbols-outlined text-lg">{showPw ? 'visibility' : 'visibility_off'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1 text-start">
        <input id="remember" type="checkbox" className="w-4 h-4 rounded border-border-whisper text-primary-container focus:ring-primary-container bg-[var(--input-bg)] cursor-pointer" />
        <label htmlFor="remember" className="font-body-sm text-body-sm text-text-secondary cursor-pointer">
          {locale === 'ar' ? 'تذكر بيانات الدخول' : 'Remember me'}
        </label>
      </div>

      <button
        type="submit" disabled={loading}
        className="w-full h-[44px] bg-primary-container text-on-primary font-body-md font-medium rounded-[6px] hover:bg-primary-container/90 active:scale-[0.98] transition-all mt-2 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <><span className="material-symbols-outlined animate-spin text-lg">sync</span><span>{locale === 'ar' ? 'جاري الدخول...' : 'Accessing Portal...'}</span></>
        ) : (
          <span>{locale === 'ar' ? 'الدخول للمنظومة' : 'Access Portal'}</span>
        )}
      </button>

      <div className="pt-4 border-t border-border-whisper text-center text-xs text-text-secondary">
        {locale === 'ar' ? 'ليس لديك حساب رسمي؟ ' : "Don't have an account? "}
        <button
          type="button"
          onClick={() => onSwitchTab('register')}
          className="text-primary-container font-semibold hover:underline cursor-pointer"
        >
          {locale === 'ar' ? 'إنشاء حساب طالب جديد' : 'Register as Student'}
        </button>
      </div>
    </form>
  );
}
