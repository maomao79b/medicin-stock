"use client";

import { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function BarcodeScanner({ 
  onScan 
}: { 
  onScan: (text: string) => void 
}) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let html5QrCode: Html5Qrcode;
    
    // Slight delay to ensure the DOM element is fully mounted
    const timer = setTimeout(() => {
      const startScanner = async () => {
        try {
          html5QrCode = new Html5Qrcode("reader");
          await html5QrCode.start(
            { facingMode: "environment" }, // Prioritize back camera for mobile
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
              // Successfully decoded
              onScan(decodedText);
              
              // We could stop the scanner here, but it's handled by unmounting in the parent when showScanner is false.
            },
            (errorMessage) => {
              // Ignore standard frame errors (they trigger every tick that doesn't have a barcode)
            }
          );
        } catch (err: any) {
          setError(err.message || "Failed to start camera. Please ensure camera permissions are granted.");
        }
      };

      startScanner();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (html5QrCode && html5QrCode.isScanning) {
        // Suppress unmount errors 
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto', overflow: 'hidden', borderRadius: '8px' }}>
      <div id="reader" style={{ width: '100%' }}></div>
      {error && <p style={{ color: 'var(--brand-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
    </div>
  );
}
