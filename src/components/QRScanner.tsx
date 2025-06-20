import React, { useRef, useEffect, useState } from 'react';
import { X, Camera, CameraOff, Zap } from 'lucide-react';
import QrScanner from 'qr-scanner';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (url: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [flashEnabled, setFlashEnabled] = useState(false);

  useEffect(() => {
    if (!isOpen || !videoRef.current) return;

    const initScanner = async () => {
      try {
        setError('');
        setIsScanning(true);

        // Check if camera is available
        const hasCamera = await QrScanner.hasCamera();
        setHasCamera(hasCamera);

        if (!hasCamera) {
          setError('Камера није доступна на овом уређају');
          setIsScanning(false);
          return;
        }

        // Create scanner instance
        const scanner = new QrScanner(
          videoRef.current!,
          (result) => {
            const scannedText = result.data;
            
            // Check if the scanned text is a URL
            const urlRegex = /(https?:\/\/[^\s]+)/;
            const isUrl = urlRegex.test(scannedText) || 
                         scannedText.includes('.') && 
                         !scannedText.includes(' ');

            if (isUrl) {
              onScan(scannedText);
              onClose();
            } else {
              // If it's not a URL, show it as an error but continue scanning
              setError(`Скениран текст није URL: ${scannedText}`);
              setTimeout(() => setError(''), 3000);
            }
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: 'environment', // Use back camera if available
            maxScansPerSecond: 5,
          }
        );

        scannerRef.current = scanner;
        await scanner.start();
        setIsScanning(true);

      } catch (err) {
        console.error('Scanner initialization error:', err);
        setError('Грешка при покретању камере. Проверите дозволе.');
        setIsScanning(false);
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
      setIsScanning(false);
      setFlashEnabled(false);
    };
  }, [isOpen, onScan, onClose]);

  const toggleFlash = async () => {
    if (scannerRef.current) {
      try {
        if (flashEnabled) {
          await scannerRef.current.turnFlashOff();
          setFlashEnabled(false);
        } else {
          await scannerRef.current.turnFlashOn();
          setFlashEnabled(true);
        }
      } catch (err) {
        console.error('Flash toggle error:', err);
      }
    }
  };

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <h2 className="text-white text-xl font-bold flex items-center gap-2">
            <Camera className="w-6 h-6" />
            Скенирај QR код
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="relative">
          {hasCamera ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-80 object-cover bg-black"
                playsInline
                muted
              />
              
              {/* Scanning Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative">
                  {/* Scanning frame */}
                  <div className="w-48 h-48 border-2 border-blue-400 rounded-lg relative">
                    {/* Corner indicators */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
                    
                    {/* Scanning line animation */}
                    {isScanning && (
                      <div className="absolute inset-0 overflow-hidden rounded-lg">
                        <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Flash Toggle Button */}
              <button
                onClick={toggleFlash}
                className={`absolute top-4 right-4 p-3 rounded-full transition-all ${
                  flashEnabled 
                    ? 'bg-yellow-500/80 text-yellow-900' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
                title={flashEnabled ? 'Искључи блиц' : 'Укључи блиц'}
              >
                <Zap className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="h-80 flex items-center justify-center bg-gray-800">
              <div className="text-center">
                <CameraOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-white text-lg font-medium">Камера није доступна</p>
                <p className="text-gray-300 text-sm">Проверите дозволе за камеру</p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions and Error */}
        <div className="p-4 space-y-3">
          {error ? (
            <div className="p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          ) : (
            <div className="p-3 bg-blue-500/20 border border-blue-400/30 rounded-lg">
              <p className="text-blue-200 text-sm text-center">
                Усмерите камеру на QR код који садржи URL
              </p>
            </div>
          )}

          {isScanning && (
            <div className="flex items-center justify-center gap-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Скенирање активно...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};