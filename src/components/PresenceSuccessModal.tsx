import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Calendar,
  Clock,
  Building,
  User,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CloudCheck,
} from 'lucide-react';
import { AttendeeRecord, EventConfig } from '../types';

interface PresenceSuccessModalProps {
  record: AttendeeRecord | null;
  event: EventConfig;
  isOpen: boolean;
  onClose: () => void;
  onNewPresence: () => void;
}

export const PresenceSuccessModal: React.FC<PresenceSuccessModalProps> = ({
  record,
  event,
  isOpen,
  onClose,
  onNewPresence,
}) => {
  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.65 },
      });
    }
  }, [isOpen]);

  if (!isOpen || !record) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      id="presence-success-modal"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-5 animate-in zoom-in-95 duration-150">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div>
          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <Sparkles className="w-3 h-3" />
            Presensi Berhasil Direkam
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 mt-2">
            Terima Kasih atas Kehadiran Anda
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Data kehadiran telah dicatat secara resmi ke dalam daftar hadir kegiatan
          </p>
        </div>

        {/* Attendee Details Card */}
        <div className="bg-slate-50 rounded-2xl p-4 text-left text-xs space-y-2 border border-slate-100">
          <div className="flex justify-between items-start pb-2 border-b border-slate-200/70">
            <span className="text-slate-400">Nama Lengkap:</span>
            <span className="font-bold text-slate-900 text-right">{record.nama}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">NIP:</span>
            <span className="font-mono font-bold text-slate-800">{record.nip}</span>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-slate-400">Unit Kerja:</span>
            <span className="font-semibold text-slate-800 text-right max-w-[220px]">{record.unitKerja}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Jabatan:</span>
            <span className="font-semibold text-slate-800">{record.jabatan}</span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-200/70">
            <span className="text-slate-400">Waktu Hadir:</span>
            <span className="font-bold text-blue-700">{record.timeFormatted}</span>
          </div>
        </div>

        {/* Signature Preview */}
        {record.signatureDataUrl && (
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200 text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Tanda Tangan Digital Tersimpan:
            </span>
            <div className="h-16 bg-slate-50 rounded-xl flex items-center justify-center p-1 border border-slate-100">
              <img
                src={record.signatureDataUrl}
                alt="TTD"
                className="max-h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onNewPresence}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Isi Presensi Peserta Lainnya</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
