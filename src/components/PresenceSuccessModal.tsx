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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in"
      id="presence-success-modal"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-9 max-w-lg w-full shadow-2xl border border-slate-200 text-center space-y-6 animate-in zoom-in-95 duration-150">
        {/* Success Icon */}
        <div className="w-18 h-18 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-11 h-11" />
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs sm:text-sm font-bold border border-emerald-200">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Presensi Berhasil Direkam
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2.5">
            Terima Kasih atas Kehadiran Anda
          </h2>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Data kehadiran telah dicatat secara resmi ke dalam daftar hadir kegiatan
          </p>
        </div>

        {/* Attendee Details Card with Large, Readable Typography */}
        <div className="bg-slate-50 rounded-2xl p-5 text-left text-sm sm:text-base space-y-3 border border-slate-200/80">
          <div className="flex justify-between items-start pb-2.5 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Nama Lengkap:</span>
            <span className="font-extrabold text-slate-900 text-right">{record.nama}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">NIP:</span>
            <span className="font-mono font-bold text-slate-800">{record.nip}</span>
          </div>

          <div className="flex justify-between items-start">
            <span className="text-slate-500 font-medium">Unit Kerja:</span>
            <span className="font-bold text-slate-800 text-right max-w-[260px]">{record.unitKerja}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Jabatan:</span>
            <span className="font-bold text-slate-800">{record.jabatan}</span>
          </div>

          <div className="flex justify-between items-center pt-2.5 border-t border-slate-200">
            <span className="text-slate-500 font-medium">Waktu Hadir:</span>
            <span className="font-extrabold text-blue-700">{record.timeFormatted}</span>
          </div>
        </div>

        {/* Signature Preview */}
        {record.signatureDataUrl && (
          <div className="bg-white rounded-2xl p-3 border border-slate-200 text-left">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Tanda Tangan Digital Tersimpan:
            </span>
            <div className="h-20 bg-slate-50 rounded-xl flex items-center justify-center p-2 border border-slate-100">
              <img
                src={record.signatureDataUrl}
                alt="TTD"
                className="max-h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Action Buttons with Large Clickable Area */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={onNewPresence}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-black text-base rounded-2xl shadow-lg shadow-blue-700/20 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Isi Presensi Peserta Lainnya</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
