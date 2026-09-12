'use client';
import React from 'react';
import { useApp } from '@/hooks/useAppStore';

export interface SupervisorCancellationAlertData {
  visible: boolean;
  bookingId: string;
  boardingCode?: string;
  seatNumber?: number;
  routeNameAr?: string;
  refundAmount?: number;
  messageAr?: string;
  messageEn?: string;
  timestamp?: string;
}

interface Props {
  alertData: SupervisorCancellationAlertData | null;
  onDismiss: () => void;
}

export default function SupervisorCancellationModal({ alertData, onDismiss }: Props) {
  const { role } = useApp();
  if (role !== 'rider' || !alertData || !alertData.visible) return null;

  const refundAmt = alertData.refundAmount ?? 160;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div 
        className="bg-surface-container-highest border-2 border-red-500/40 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-5 animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Alert Icon & Badge */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0 text-red-500">
            <span className="material-symbols-outlined text-3xl animate-bounce">warning</span>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-500 border border-red-500/25 mb-1">
              <span>إشعار إلغاء واسترداد فوري</span>
              <span>•</span>
              <span>Cancellation Notice</span>
            </div>
            <h3 className="text-lg font-extrabold text-text-primary">
              تم إلغاء حجزك من قبل مشرف الخط
            </h3>
            <p className="text-xs text-text-secondary">
              Ticket Cancelled by Line Supervisor
            </p>
          </div>
        </div>

        {/* Notice Message Card */}
        <div className="bg-surface-container p-4 rounded-xl border border-border-whisper space-y-2">
          <p className="text-sm font-semibold text-text-primary leading-relaxed" dir="rtl">
            {alertData.messageAr || `قام مشرف الرحلة بإلغاء حجزك للمقعد رقم (${alertData.seatNumber || '—'}). تم تحويل أمر استرداد فوري للمبلغ بالكامل لحسابك.`}
          </p>
          {alertData.messageEn && (
            <p className="text-xs text-text-secondary">
              {alertData.messageEn}
            </p>
          )}
        </div>

        {/* Refund & Ticket Details Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="bg-surface-container-low p-3 rounded-xl border border-border-whisper flex flex-col justify-center">
            <span className="text-text-secondary mb-1">قيمة الاسترداد / Refund:</span>
            <span className="font-extrabold text-emerald-500 text-base flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">currency_exchange</span>
              {refundAmt} EGP (مسترد)
            </span>
          </div>

          <div className="bg-surface-container-low p-3 rounded-xl border border-border-whisper flex flex-col justify-center">
            <span className="text-text-secondary mb-1">كود الصعود / Pass Code:</span>
            <span className="font-mono font-bold text-text-primary text-sm">
              {alertData.boardingCode || 'GU-PASS'}
            </span>
          </div>

          {alertData.seatNumber && (
            <div className="bg-surface-container-low p-3 rounded-xl border border-border-whisper flex flex-col justify-center">
              <span className="text-text-secondary mb-1">رقم المقعد / Seat:</span>
              <span className="font-bold text-text-primary text-sm">
                المقعد #{alertData.seatNumber}
              </span>
            </div>
          )}

          <div className="bg-surface-container-low p-3 rounded-xl border border-border-whisper flex flex-col justify-center">
            <span className="text-text-secondary mb-1">حالة التذكرة / Status:</span>
            <span className="font-bold text-red-500 text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">cancel</span>
              ملغاة ومستردة
            </span>
          </div>
        </div>

        {/* Reassurance Policy Note */}
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2">
          <span className="material-symbols-outlined text-base shrink-0 mt-0.5">verified_user</span>
          <span>
            وفقاً لسياسة جامعة الجلالة، يتم استرداد المبلغ إلى نفس وسيلة الدفع تلقائياً وبدون أي رسوم إلغاء.
          </span>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-bold text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span>فهمت، إغلاق التنبيه | Acknowledge & Dismiss</span>
        </button>
      </div>
    </div>
  );
}
