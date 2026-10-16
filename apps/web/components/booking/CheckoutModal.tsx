'use client';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/hooks/useAppStore';
import { TRANSIT_CONFIG } from '@/lib/config';

export default function CheckoutModal() {
  const {
    showCheckout, setShowCheckout, selectedSeat,
    bookingType, activeTrip, activeArrivalTrip, activeReturnTrip,
    paymentMethod, setPaymentMethod, cardNumber, setCardNumber,
    receiptRef, setReceiptRef, checkoutError, isPaying,
    handleCheckoutSubmit, user, seatLoadStatus, lockingSeatNumber,
  } = useApp();
  const dialogRef = useRef<HTMLDivElement>(null);
  const payingRef = useRef(isPaying);
  payingRef.current = isPaying;
  const [copyStatus, setCopyStatus] = useState('');
  const isOpen = Boolean(showCheckout && selectedSeat && (bookingType === 'round_trip' ? activeArrivalTrip && activeReturnTrip : activeTrip));

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (!dialog) return;
    setCopyStatus('');
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')).filter(element => element.getClientRects().length > 0);
    (controls()[0] || dialog).focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!payingRef.current) setShowCheckout(false);
      } else if (event.key === 'Tab') {
        const items = controls();
        const first = items[0] || dialog;
        const last = items[items.length - 1] || dialog;
        const outside = !dialog.contains(document.activeElement);
        if (outside || event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last || !items.length) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen, setShowCheckout]);

  const copyPaymentAddress = async () => {
    try {
      await navigator.clipboard.writeText('galalatransit@instapay');
      setCopyStatus('Payment address copied.');
    } catch {
      setCopyStatus('Copy is unavailable. Select the payment address to copy it manually.');
    }
  };

  if (!isOpen) return null;

  const fare = bookingType === 'round_trip'
    ? Number(activeArrivalTrip?.priceEgp ?? 0) + Number(activeReturnTrip?.priceEgp ?? 0)
    : Number(activeTrip?.priceEgp ?? TRANSIT_CONFIG.DEFAULT_FARE_EGP);
  const isFreeTrip = bookingType === 'round_trip'
    ? Number(activeArrivalTrip?.priceEgp) === 0 && Number(activeReturnTrip?.priceEgp) === 0
    : Number(activeTrip?.priceEgp) === 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="checkout-title" className="bg-surface-container w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-xl p-6 border border-border-whisper space-y-6 shadow-2xl">
        <div className="flex justify-between items-start border-b border-border-whisper pb-4">
          <div>
            <h3 id="checkout-title" className="text-lg font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">credit_card</span>
              {isFreeTrip ? 'Free Booking' : 'Payment Gateway'}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5 font-medium">Galala Booking Transaction Portal</p>
          </div>
          <button type="button" aria-label="Close checkout" disabled={isPaying} onClick={() => setShowCheckout(false)} className="min-h-11 min-w-11 text-text-secondary hover:text-text-primary text-lg font-medium disabled:opacity-40">&times;</button>
        </div>

        <div className="bg-surface-container-low p-5 rounded-xl border border-border-whisper space-y-3">
          <h4 className="font-bold text-xs text-primary uppercase tracking-wider">Booking Summary</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-text-secondary">Rider Name</span><span className="font-semibold text-text-primary">{user?.fullName}</span></div>
            {bookingType === 'round_trip' ? (
              <>
                <div className="flex justify-between"><span className="text-text-secondary">Arrival Bus</span><span className="font-semibold text-text-primary">{activeArrivalTrip?.bus.name.split('/')[0]} ({activeArrivalTrip?.departureTime})</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Return Bus</span><span className="font-semibold text-text-primary">{activeReturnTrip?.bus.name.split('/')[0]} ({activeReturnTrip?.departureTime})</span></div>
              </>
            ) : (
              <div className="flex justify-between"><span className="text-text-secondary">Bus Line</span><span className="font-semibold text-text-primary">{activeTrip?.bus.name.split('/')[0]} ({activeTrip?.departureTime})</span></div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Selected Seat</span>
              <span className="font-label-mono text-label-mono-sm bg-surface-variant text-text-primary px-2.5 py-0.5 rounded font-bold">{selectedSeat}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border-whisper pt-3 mt-1">
              <span className="text-text-primary font-bold">Total Fare</span>
              <span className="font-label-mono text-base font-bold text-primary-container">{fare} EGP</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleCheckoutSubmit} className="space-y-5">
          {!isFreeTrip && <div className="space-y-2">
            <label className="text-xs text-text-secondary font-semibold">Choose Payment Type</label>
            <div className="flex border-b border-border-whisper">
              {([...(process.env.NEXT_PUBLIC_ENABLE_MOCK_PAYMENTS === 'true' ? ['visa_mock' as const] : []), 'instapay' as const, 'telda' as const]).map(m => (
                <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                  className={`flex-1 py-2 text-xs font-semibold border-b-2 transition ${paymentMethod === m ? 'border-primary-container text-primary-container font-bold' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
                  {m === 'visa_mock' ? 'Credit Card' : m === 'instapay' ? 'Instapay' : 'Telda'}
                </button>
              ))}
            </div>
          </div>}

          {isFreeTrip ? (
            <p className="text-xs text-text-secondary">No payment or receipt is needed for this trip.</p>
          ) : paymentMethod === 'visa_mock' ? (
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs text-text-secondary font-medium">Card Number (Simulated)</label>
                <input type="text" required placeholder="4000 1234 5678 9010" value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                  className="w-full bg-surface border border-border-whisper rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary-container text-text-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary font-medium">Expiry Date</label>
                  <input type="text" required placeholder="MM/YY" className="w-full bg-surface border border-border-whisper rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary-container text-text-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary font-medium">CVV</label>
                  <input type="password" required maxLength={3} placeholder="123" className="w-full bg-surface border border-border-whisper rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary-container text-text-primary" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div>
                <p className="font-body-sm text-body-sm text-text-secondary mb-2">Send payment to:</p>
                <div className="bg-surface-variant p-3 rounded flex justify-between items-center">
                  <span dir="ltr" className="font-label-mono text-label-mono select-all break-all">galalatransit@instapay</span>
                  <button type="button" aria-label="Copy payment address" onClick={copyPaymentAddress} className="min-h-11 min-w-11 shrink-0 text-primary-container hover:opacity-80"><span className="material-symbols-outlined text-sm">content_copy</span></button>
                </div>
                {copyStatus && <p role="status" className="text-xs text-text-secondary mt-2">{copyStatus}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-secondary font-medium">Receipt reference</label>
                <input type="text" placeholder="Receipt #" value={receiptRef} onChange={e => setReceiptRef(e.target.value)}
                  className="w-full bg-surface border border-border-whisper rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary-container text-text-primary" />
              </div>
            </div>
          )}

          {checkoutError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm shrink-0">error</span>
              <span className="font-semibold">
                {typeof checkoutError === 'string' && checkoutError !== '[object Object]'
                  ? checkoutError
                  : 'حدث خطأ أثناء إتمام الدفع. يرجى مراجعة البيانات والمحاولة ثانية.'}
              </span>
            </div>
          )}

          {seatLoadStatus !== 'ready' && <p role="status" className="text-sm text-text-secondary">Checking seat availability. Booking is paused until the seat map is available.</p>}
          <button type="submit" disabled={isPaying || seatLoadStatus !== 'ready' || lockingSeatNumber !== null}
            className="w-full bg-primary-container text-on-primary-container font-headline-md py-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
            {isPaying ? (
              <><span className="material-symbols-outlined animate-spin">sync</span> Processing...</>
            ) : (
              <>Confirm Booking <span className="material-symbols-outlined">arrow_forward</span></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
