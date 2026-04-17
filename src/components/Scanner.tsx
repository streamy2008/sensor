import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect, useState } from 'react';

export function Scanner({ onScanSuccess }: { onScanSuccess: (decodedText: string) => void }) {
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    if (!isScanning) return;
    
    // Create instance
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        setIsScanning(false);
        onScanSuccess(decodedText);
      },
      (error) => {
        // Ignored for continuous scanning
      }
    );

    return () => {
      scanner.clear().catch(e => console.error("Failed to clear scanner", e));
    };
  }, [isScanning, onScanSuccess]);

  if (!isScanning) {
    return null;
  }

  return (
    <div id="reader" className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl border border-black/10"></div>
  );
}
