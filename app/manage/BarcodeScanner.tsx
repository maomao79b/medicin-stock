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
    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true;

    const startScanner = async () => {
      try {
        // Ensure the element exists before initializing
        const element = document.getElementById("reader");
        if (!element) return;

        html5QrCode = new Html5Qrcode("reader");
        
        // Check if still mounted before starting
        if (!isMounted) return;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            if (isMounted) {
              onScan(decodedText);
            }
          },
          () => {
            // Ignore scan errors
          }
        );
      } catch (err: any) {
        if (isMounted) {
          console.error("Scanner Error:", err);
          setError(err.message || "ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์การเข้าถึงกล้อง");
        }
      }
    };

    // Use a small delay to ensure DOM is ready
    const timer = setTimeout(startScanner, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (html5QrCode) {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().then(() => {
            html5QrCode?.clear();
          }).catch(err => console.warn("Error stopping scanner:", err));
        }
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
