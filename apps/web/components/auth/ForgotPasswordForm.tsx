'use client';
import { useState } from 'react';
import { API_URL } from '@/lib/api';

interface Props {
  onBack: () => void;
}

export default function ForgotPasswordForm({ onBack }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to request reset'); }
      setMessage('A temporary password has been sent to your email.');
      setEmail('');
      setTimeout(onBack, 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="text-center pb-4 mb-2 border-b border-border-whisper">
        <h2 className="font-headline-md text-headline-md text-text-primary">Reset Password</h2>
        <p className="font-body-sm text-body-sm text-text-secondary mt-1">Enter your university email to receive reset code</p>
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="bg-error-container/50 border border-error-container text-on-error-container px-4 py-3 rounded-lg text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-2 text-start">
        <label className="font-body-sm text-body-sm text-text-primary font-medium" htmlFor="forgot-email">University Email</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute start-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg pointer-events-none">mail</span>
          <input id="forgot-email" type="email" required placeholder="student@gu.edu.eg" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full h-[44px] ps-10 pe-4 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-[6px] font-body-md text-body-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all" />
        </div>
      </div>

      <button type="submit" disabled={loading}
        className="w-full h-[44px] bg-primary-container text-on-primary font-body-md font-medium rounded-[6px] hover:bg-primary-container/90 active:scale-[0.98] transition-all mt-2 shadow-sm flex items-center justify-center gap-2">
        {loading ? <><span className="material-symbols-outlined animate-spin text-lg">sync</span><span>Requesting Reset...</span></> : <span>Send Reset Password</span>}
      </button>

      <button type="button" onClick={onBack} className="w-full py-2 text-center text-xs text-text-secondary hover:text-text-primary font-medium transition">
        &larr; Back to Sign In
      </button>
    </form>
  );
}
