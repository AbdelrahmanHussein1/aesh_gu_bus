'use client';
import { useState } from 'react';
import { API_URL } from '@/lib/api';
import type { Role } from '@/lib/types';

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('rider');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName: name, role, password }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Registration failed'); }
      alert('Registration successful! Please log in.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="bg-error-container/50 border border-error-container text-on-error-container px-4 py-3 rounded-lg text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="font-body-sm text-body-sm text-text-primary font-medium" htmlFor="reg-name">Full Name</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">person</span>
          <input id="reg-name" type="text" required placeholder="Enter full name" value={name} onChange={e => setName(e.target.value)}
            className="w-full h-[44px] pl-10 pr-4 bg-surface-bright border border-border-whisper rounded-[6px] font-body-md text-body-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-body-sm text-body-sm text-text-primary font-medium" htmlFor="reg-email">University Email</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">mail</span>
          <input id="reg-email" type="email" required placeholder="student@galala.edu.eg" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full h-[44px] pl-10 pr-4 bg-surface-bright border border-border-whisper rounded-[6px] font-body-md text-body-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-body-sm text-body-sm text-text-primary font-medium" htmlFor="reg-role">Account Role</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">shield</span>
          <select id="reg-role" required value={role} onChange={(e: any) => setRole(e.target.value)}
            className="w-full h-[44px] pl-10 pr-4 bg-surface-bright border border-border-whisper rounded-[6px] font-body-md text-body-md text-text-primary focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all appearance-none">
            <option value="rider">Rider / Student</option>
            <option value="supervisor">Supervisor / Driver</option>
            <option value="admin">System Admin</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-body-sm text-body-sm text-text-primary font-medium" htmlFor="reg-password">Password</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg">lock</span>
          <input id="reg-password" type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full h-[44px] pl-10 pr-4 bg-surface-bright border border-border-whisper rounded-[6px] font-body-md text-body-md text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all" />
        </div>
      </div>

      <button type="submit" disabled={loading}
        className="w-full h-[44px] bg-primary-container text-on-primary font-body-md font-medium rounded-[6px] hover:bg-primary-container/90 active:scale-[0.98] transition-all mt-2 shadow-sm flex items-center justify-center gap-2">
        {loading ? <><span className="material-symbols-outlined animate-spin text-lg">sync</span><span>Creating Account...</span></> : <span>Register & Log In</span>}
      </button>
    </form>
  );
}
