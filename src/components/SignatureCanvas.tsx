import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { RotateCcw, CheckCircle, Edit3, Trash2 } from 'lucide-react';

export interface SignatureCanvasHandle {
  clear: () => void;
}

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  initialSignature?: string;
}

export const SignatureCanvas = forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(
  ({ onSave, onClear, initialSignature }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [history, setHistory] = useState<ImageData[]>([]);

    // Downscale resolution: cap devicePixelRatio at 2
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#1e3a8a'; // Dark Navy ink

        if (initialSignature) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, rect.width, rect.height);
            setHasDrawn(true);
          };
          img.src = initialSignature;
        }
      }
    }, [initialSignature]);

    const getJpegDataUrl = (): string => {
      const canvas = canvasRef.current;
      if (!canvas) return '';

      const offCanvas = document.createElement('canvas');
      offCanvas.width = canvas.width;
      offCanvas.height = canvas.height;
      const offCtx = offCanvas.getContext('2d');
      if (offCtx) {
        offCtx.fillStyle = '#ffffff';
        offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);
        offCtx.drawImage(canvas, 0, 0);
        return offCanvas.toDataURL('image/jpeg', 0.7);
      }
      return canvas.toDataURL('image/jpeg', 0.7);
    };

    useImperativeHandle(ref, () => ({
      clear: handleClear,
    }));

    const getCoordinates = (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();

      if ('touches' in e) {
        const touch = e.touches[0];
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      } else {
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      }
    };

    const startDrawing = (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Save history before drawing
      const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev.slice(-10), currentState]);

      const { x, y } = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
      setHasDrawn(true);
    };

    const draw = (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      if (!isDrawing) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { x, y } = getCoordinates(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      if (!isDrawing) return;
      setIsDrawing(false);
      const dataUrl = getJpegDataUrl();
      onSave(dataUrl);
    };

    const handleClear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
      setHistory([]);
      onSave('');
      if (onClear) onClear();
    };

    const handleUndo = () => {
      const canvas = canvasRef.current;
      if (!canvas || history.length === 0) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const lastState = history[history.length - 1];
      ctx.putImageData(lastState, 0, 0);
      const newHistory = history.slice(0, -1);
      setHistory(newHistory);
      if (newHistory.length === 0) {
        setHasDrawn(false);
      }

      const dataUrl = getJpegDataUrl();
      onSave(dataUrl);
    };

    return (
      <div className="flex flex-col w-full" id="digital-signature-container">
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-800">
            <Edit3 className="w-4 h-4 text-blue-700" />
            Tanda Tangan Digital Peserta <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                type="button"
                id="btn-undo-signature"
                onClick={handleUndo}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                title="Undo goresan terakhir"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Undo
              </button>
            )}
            <button
              type="button"
              id="btn-clear-signature"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs sm:text-sm font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus
            </button>
          </div>
        </div>

        <div className="relative w-full h-44 sm:h-48 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden touch-none hover:border-blue-400 transition-colors focus-within:border-blue-600 focus-within:ring-3 focus-within:ring-blue-100">
          <canvas
            ref={canvasRef}
            id="presence-signature-canvas"
            className="w-full h-full cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />

          {!hasDrawn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 select-none p-4 text-center">
              <Edit3 className="w-8 h-8 mb-2 text-slate-300" />
              <span className="text-sm sm:text-base font-semibold text-slate-600">
                Goreskan tanda tangan Anda di sini (Layar Sentuh / Mouse)
              </span>
              <span className="text-xs sm:text-sm text-slate-400 mt-1">
                Tersimpan langsung untuk verifikasi daftar hadir dan laporan PDF resmi
              </span>
            </div>
          )}

          {hasDrawn && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-xl text-xs sm:text-sm font-bold border border-emerald-300 pointer-events-none shadow-xs">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Tanda tangan terekam
            </div>
          )}
        </div>
      </div>
    );
  }
);

SignatureCanvas.displayName = 'SignatureCanvas';
