import React, { useState, useEffect, useRef } from 'react';
import { X, Barcode, Camera, Zap, Check, Search, AlertCircle, Loader2, Sparkles, Disc } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { lookupBarcode } from '../lib/api';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeScanned: (data: any) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onBarcodeScanned
}) => {
  const [manualCode, setManualCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  if (!isOpen) return null;

  // Sample instant test barcodes
  const PRESET_BARCODES = [
    { name: 'Oppenheimer 4K Steelbook', code: '025192067082' },
    { name: 'The Dark Knight 4K', code: '088392902096' },
    { name: 'Dune: Part Two 4K Steelbook', code: '883929813987' },
    { name: 'Breaking Bad Complete Box Set', code: '031398240212' },
    { name: 'Interstellar 4K Steelbook', code: '088392945765' },
    { name: 'Inception 4K Ultra-HD', code: '088392913917' }
  ];

  // Start HTML5 Web Camera scanner
  const startCamera = async () => {
    setErrorMessage('');
    setIsCameraActive(true);
    try {
      const html5Qrcode = new Html5Qrcode('barcode-reader');
      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 160 }
        },
        (decodedText) => {
          // Success callback
          stopCamera();
          handleLookup(decodedText);
        },
        (errorMessage) => {
          // parse frame error - silent
        }
      );
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setIsCameraActive(false);
      setErrorMessage('Camera access unavailable or permission denied. You can enter barcode digits manually below!');
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        // ignore
      }
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleLookup = async (codeToSearch: string) => {
    const cleanCode = codeToSearch.trim();
    if (!cleanCode) return;

    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await lookupBarcode(cleanCode);
      onBarcodeScanned(data);
      onClose();
    } catch (err: any) {
      setErrorMessage(`Lookup failed: ${err.message || 'Error parsing barcode'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLookup(manualCode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto text-slate-100 flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Disc Barcode Scanner</h3>
              <p className="text-xs text-slate-400 font-mono">Scan UPC / EAN on DVD & Blu-Ray cases</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Scanner Container */}
        <div className="p-6 space-y-5">
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-[4/3] flex flex-col items-center justify-center">
            <div id="barcode-reader" className="w-full h-full" />

            {!isCameraActive && (
              <div className="text-center p-6 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-cyan-950/80 border border-cyan-700/50 flex items-center justify-center mx-auto text-cyan-400">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Live Camera Barcode Reader</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                    Point your device webcam or phone camera at the barcode on the back of any disc case.
                  </p>
                </div>
                <button
                  onClick={startCamera}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 mx-auto"
                >
                  <Camera className="w-4 h-4" />
                  <span>Activate Webcam Scanner</span>
                </button>
              </div>
            )}

            {isCameraActive && (
              <button
                onClick={stopCamera}
                className="absolute top-3 right-3 z-10 px-3 py-1 rounded-lg bg-slate-950/80 text-xs text-slate-300 border border-slate-700 hover:bg-slate-800"
              >
                Stop Camera
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Manual Digits Form */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="text-xs text-slate-400 font-semibold block">Or Type Barcode Number Manually</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. 025192067082"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isLoading || !manualCode.trim()}
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Lookup</span>
              </button>
            </div>
          </form>

          {/* Preset Instant Test Barcodes */}
          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Instant Barcode Test Presets
            </span>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_BARCODES.map((p) => (
                <button
                  key={p.code}
                  onClick={() => handleLookup(p.code)}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-600/50 text-left transition-all group"
                >
                  <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 block truncate">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block">UPC #{p.code}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
