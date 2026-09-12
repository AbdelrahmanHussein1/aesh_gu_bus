'use client';
import { useApp } from '@/hooks/useAppStore';
import { TRANSIT_CONFIG } from '@/lib/config';

export default function CheckoutModal() {
  const {
    showCheckout, setShowCheckout, selectedSeat,
    bookingType, activeTrip, activeArrivalTrip, activeReturnTrip,
    paymentMethod, setPaymentMethod, cardNumber, setCardNumber,
    receiptRef, setReceiptRef, checkoutError, isPaying,
    handleCheckoutSubmit, user,
  } = useApp();

  if (!showCheckout || !selectedSeat) return null;
  if (bookingType === 'round_trip' && (!activeArrivalTrip || !activeReturnTrip)) return null;
  if (bookingType !== 'round_trip' && !activeTrip) return null;

  const fare = activeTrip?.priceEgp || activeArrivalTrip?.priceEgp || TRANSIT_CONFIG.DEFAULT_FARE_EGP;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container w-full max-w-md rounded-xl p-6 border border-border-whisper space-y-6 shadow-2xl">
        <div className="flex justify-between items-start border-b border-border-whisper pb-4">
          <div>
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">credit_card</span>
              Payment Gateway
            </h3>
            <p className="text-xs text-text-secondary mt-0.5 font-medium">Galala Booking Transaction Portal</p>
          </div>
          <button onClick={() => setShowCheckout(false)} className="text-text-secondary hover:text-text-primary text-lg font-medium">&times;</button>
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
              <span className="font-label-mono text-base font-bold text-primary-container">{fare}.00 EGP</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleCheckoutSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs text-text-secondary font-semibold">Choose Payment Type</label>
            <div className="flex border-b border-border-whisper">
              {(['visa_mock', 'instapay', 'telda'] as const).map(m => (
                <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                  className={`flex-1 py-2 text-xs font-semibold border-b-2 transition ${paymentMethod === m ? 'border-primary-container text-primary-container font-bold' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
                  {m === 'visa_mock' ? 'Credit Card' : m === 'instapay' ? 'Instapay' : 'Telda'}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'visa_mock' ? (
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
                  <span className="font-label-mono text-label-mono">galalatransit@instapay</span>
                  <button type="button" className="text-primary-container hover:opacity-80"><span className="material-symbols-outlined text-sm">content_copy</span></button>
                </div>
              </div>
              <div className="border-2 border-dashed border-border-whisper rounded-lg p-8 flex flex-col items-center justify-center bg-surface hover:bg-surface-container-low transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-4xl text-outline mb-2">upload_file</span>
                <p className="font-headline-sm text-headline-sm text-text-secondary mb-1">Upload Receipt</p>
                <p className="font-body-sm text-body-sm text-text-secondary opacity-70">Drag & drop or click to browse</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-text-secondary font-medium">Or enter receipt reference</label>
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

          <button type="submit" disabled={isPaying}
            className="w-full bg-primary-container text-on-primary-container font-headline-md py-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
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
