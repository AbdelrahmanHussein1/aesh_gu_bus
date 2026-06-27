'use client';
import { useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/hooks/useAppStore';
import jsQR from 'jsqr';

export default function QRScanner() {
  const {
    scanInputToken, setScanInputToken, scanResult, setScanResult,
    isScanning, isCameraActive, cameraStream, cameraError,
    handleSimulatedScan, startCameraScan, stopCameraScan, setIsScanning,
  } = useApp();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const lastScannedRef = useRef<{ token: string; at: number } | null>(null);

  const decodeFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState < 2) { animRef.current = requestAnimationFrame(decodeFrame); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code) {
      const now = Date.now();
      if (lastScannedRef.current?.token === code.data && now - lastScannedRef.current.at < 3000) {
        animRef.current = requestAnimationFrame(decodeFrame);
        return;
      }
      lastScannedRef.current = { token: code.data, at: now };
      setScanInputToken(code.data);
      handleSimulatedScan();
      return;
    }
    animRef.current = requestAnimationFrame(decodeFrame);
  }, [isCameraActive, handleSimulatedScan, setScanInputToken]);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    if (isCameraActive && !scanResult) {
      animRef.current = requestAnimationFrame(decodeFrame);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [isCameraActive, scanResult, decodeFrame]);

  return (
    <div className="xl:col-span-1 bg-surface-container border border-border-whisper rounded-xl p-6 flex flex-col items-center h-fit space-y-4 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)]">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-text-primary flex items-center justify-center gap-2 mb-1">
          <span className="material-symbols-outlined text-xl text-success-galala">photo_camera</span>
          Boarding Scanner
        </h2>
        <p className="text-xs text-text-secondary font-medium">Verify passengers&apos; tickets and log boarding events.</p>
      </div>

      <div className="w-full max-w-[280px] aspect-[3/4] bg-navigation-dark rounded-2xl border-4 border-outline relative overflow-hidden flex flex-col text-center justify-center">
        {isScanning ? (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="bg-navigation-dark/90 p-4 rounded-xl border border-outline shadow-xl inline-block text-center">
              <span className="material-symbols-outlined text-success-galala text-2xl animate-spin">sync</span>
              <p className="text-[10px] text-success-galala font-bold uppercase tracking-widest mt-2">Verifying...</p>
            </div>
          </div>
        ) : scanResult ? (
          <div className="absolute inset-0 flex items-center justify-center z-20 p-4">
            <div className="bg-navigation-dark/95 py-4 px-4 rounded-xl border border-outline shadow-xl w-full text-center space-y-3">
              {scanResult.success ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-success-galala/20 flex items-center justify-center mx-auto border border-success-galala/35">
                    <span className="material-symbols-outlined text-success-galala text-2xl">check_circle</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Valid Ticket</h4>
                    <p className="text-xs text-success-galala font-semibold mt-1">{scanResult.riderName}</p>
                    <p className="text-lg font-extrabold text-primary-fixed-dim mt-1">Seat: {scanResult.seatNumber}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-destructive-alt/20 flex items-center justify-center mx-auto border border-destructive-alt/35">
                    <span className="material-symbols-outlined text-destructive-alt text-2xl">error</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-destructive-alt uppercase tracking-wider">Access Denied</h4>
                    <p className="text-[11px] text-surface-variant mt-2 font-medium">{scanResult.message}</p>
                  </div>
                </>
              )}
              <button onClick={() => { setScanResult(null); setScanInputToken(''); lastScannedRef.current = null; }} className="px-4 py-1.5 bg-outline text-white rounded-lg text-[10px] font-semibold hover:opacity-80">Scan Next</button>
            </div>
          </div>
        ) : isCameraActive ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 border-[3px] border-success-galala/60 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-1/3 border-2 border-success-galala/80 rounded-xl pointer-events-none" />
          </>
        ) : (
          <div className="my-auto text-text-secondary space-y-2 z-10">
            <span className="material-symbols-outlined text-3xl opacity-30">qr_code</span>
            <p className="text-xs">Camera inactive</p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="w-full flex flex-col gap-2">
        {cameraError && (
          <p className="text-center text-[10px] text-destructive-alt font-medium bg-error-container/50 border border-error-container p-2.5 rounded-xl">{cameraError}</p>
        )}
        {isCameraActive ? (
          <button onClick={stopCameraScan} className="w-full py-2.5 px-4 bg-destructive-alt hover:opacity-90 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition">
            <span className="material-symbols-outlined text-sm">videocam_off</span> Stop Camera
          </button>
        ) : (
          <button onClick={startCameraScan} disabled={isScanning}
            className="w-full py-2.5 px-4 bg-success-galala hover:opacity-90 text-navigation-dark rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md">
            <span className="material-symbols-outlined text-sm">photo_camera</span> Start Camera
          </button>
        )}
      </div>

      <div className="w-full space-y-2 pt-3 border-t border-border-whisper">
        <label className="text-[10px] text-text-secondary font-semibold block uppercase tracking-wider">Or Paste Token Manually:</label>
        <div className="flex gap-2">
          <input type="text" value={scanInputToken} onChange={e => setScanInputToken(e.target.value)} placeholder="Paste QR payload..."
            className="flex-1 bg-surface border border-border-whisper rounded-xl px-4 py-2 text-xs text-text-primary focus:outline-none focus:border-primary-container" />
          <button onClick={handleSimulatedScan} disabled={!scanInputToken || isScanning || isCameraActive}
            className="px-4 py-2 bg-primary-container hover:opacity-90 text-on-primary-container rounded-xl text-xs font-semibold disabled:opacity-40 transition">Verify</button>
        </div>
      </div>
    </div>
  );
}
