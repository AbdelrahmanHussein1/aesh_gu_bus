'use client';
import { useState } from 'react';
import { useApp } from '@/hooks/useAppStore';

interface Props {
  onSwitchTab: (tab: 'login' | 'register' | 'forgot-password') => void;
}

export default function LoginForm({ onSwitchTab }: Props) {
  const { login } = useApp();
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
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
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

      <div className="flex flex-col gap-2">
        <label className="font-body-sm text-body-sm text-text-primary font-medium" htmlFor="email">University Email</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">mail</span>
          <input
            id="email"
            name="gu_login_email"
            type="email"
            required
            autoComplete="off"
            placeholder="name@gu.edu.eg"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full h-[44px] pl-10 pr-4 bg-surface-bright border border-border-whisper rounded-[6px] font-body-md text-body-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <label className="font-body-sm text-body-sm text-text-primary font-medium" htmlFor="password">Password</label>
          <button type="button" onClick={() => onSwitchTab('forgot-password')} className="font-body-sm text-body-sm text-primary-container hover:underline">Forgot password?</button>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">lock</span>
          <input
            id="password"
            name="gu_login_pass"
            type={showPw ? 'text' : 'password'}
            required
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full h-[44px] pl-10 pr-10 bg-surface-bright border border-border-whisper rounded-[6px] font-body-md text-body-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
          />
          <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
            <span className="material-symbols-outlined text-lg">{showPw ? 'visibility' : 'visibility_off'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <input id="remember" type="checkbox" className="w-4 h-4 rounded border-border-whisper text-primary-container focus:ring-primary-container bg-surface-bright cursor-pointer" />
        <label htmlFor="remember" className="font-body-sm text-body-sm text-text-secondary cursor-pointer">Remember me</label>
      </div>

      <button
        type="submit" disabled={loading}
        className="w-full h-[44px] bg-primary-container text-on-primary font-body-md font-medium rounded-[6px] hover:bg-primary-container/90 active:scale-[0.98] transition-all mt-2 shadow-sm flex items-center justify-center gap-2"
      >
        {loading ? (
          <><span className="material-symbols-outlined animate-spin text-lg">sync</span><span>Accessing Portal...</span></>
        ) : (
          <span>Access Portal</span>
        )}
      </button>

      <div className="pt-4 border-t border-border-whisper text-center text-xs text-text-secondary">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={() => onSwitchTab('register')}
          className="text-primary-container font-semibold hover:underline"
        >
          Register as Student (إنشاء حساب طالب)
        </button>
      </div>
    </form>
  );
}
