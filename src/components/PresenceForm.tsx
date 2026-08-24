import React, { useState } from 'react';
import {
  Calendar,
  Building,
  Clock,
  MapPin,
  Send,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { AttendeeRecord, EventConfig } from '../types';
import { addAttendeeRecord } from '../services/storage';
import { SignatureCanvas } from './SignatureCanvas';
import { UnitKerjaCombobox } from './UnitKerjaCombobox';

interface PresenceFormProps {
  event: EventConfig;
  onSuccess: (record: AttendeeRecord) => void;
}

export const PresenceForm: React.FC<PresenceFormProps> = ({ event, onSuccess }) => {
  const [nip, setNip] = useState('');
  const [nama, setNama] = useState('');
  const [unitKerja, setUnitKerja] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!nip.trim()) {
      setFormError('Nomor Induk Pegawai (NIP) wajib diisi.');
      return;
    }
    if (!nama.trim()) {
      setFormError('Nama Lengkap & Gelar wajib diisi.');
      return;
    }
    if (!unitKerja.trim()) {
      setFormError('Silakan pilih Unit Kerja / OPD Kota Samarinda.');
      return;
    }
    if (!jabatan.trim()) {
      setFormError('Jabatan Pegawai wajib diisi.');
      return;
    }
    if (!signatureDataUrl) {
      setFormError('Tanda tangan digital wajib dibubuhkan pada kolom tanda tangan.');
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date();
      const timeFormatted =
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WITA';

      const dateFormatted = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now);

      const newRecord: AttendeeRecord = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        eventId: event.id,
        nip: nip.trim(),
        nama: nama.trim(),
        unitKerja: unitKerja.trim(),
        jabatan: jabatan.trim(),
        timestamp: now.toISOString(),
        timeFormatted,
        dateFormatted,
        signatureDataUrl,
        isSyncedToSheets: false,
      };

      await addAttendeeRecord(newRecord, event);

      // Reset form fields
      setNip('');
      setNama('');
      setUnitKerja('');
      setJabatan('');
      setSignatureDataUrl('');

      onSuccess(newRecord);
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan saat menyimpan presensi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6" id="presence-form-container">
      {/* Event Header Banner Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5" />
            {event.date} • {event.startTime} - {event.endTime} WITA
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
            <UserCheck className="w-3.5 h-3.5" />
            Pemerintah Kota Samarinda
          </span>
        </div>

        <h1 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
          {event.name}
        </h1>

        <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            {event.organizer}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            {event.locationName}
          </span>
        </div>
      </div>

      {/* Main Form Box */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6"
        id="form-presensi-pegawai"
      >
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-base font-bold text-slate-900">
            Formulir Daftar Hadir Peserta
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Silakan masukkan NIP, nama lengkap, pilih unit kerja, jabatan, dan tanda tangani digital
          </p>
        </div>

        {formError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Mohon Lengkapi Data</p>
              <p className="mt-0.5">{formError}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* NIP */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nomor Induk Pegawai (NIP) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="input-nip"
                required
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Contoh: 19850712 201001 1 005"
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition"
              />
            </div>

            {/* Nama Lengkap */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nama Lengkap & Gelar <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="input-nama"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama lengkap beserta gelar"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition"
              />
            </div>
          </div>

          {/* Unit Kerja Searchable Combobox (Kota Samarinda) */}
          <div>
            <UnitKerjaCombobox
              value={unitKerja}
              onChange={(val) => setUnitKerja(val)}
              required
            />
          </div>

          {/* Jabatan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Jabatan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="input-jabatan"
              required
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
              placeholder="Contoh: Kepala Bidang / Analis Kebijakan Ahli Muda / Staf"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-hidden transition"
            />
          </div>
        </div>

        {/* Digital Signature Canvas Section */}
        <div className="pt-2 border-t border-slate-100">
          <SignatureCanvas
            onSave={(url) => setSignatureDataUrl(url)}
            onClear={() => setSignatureDataUrl('')}
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            id="btn-submit-presensi"
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 active:from-blue-800 active:to-indigo-800 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-700/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Menyimpan Kehadiran...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Kirim & Bubuhkan Tanda Tangan Kehadiran
              </>
            )}
          </button>
          <p className="text-[11px] text-center text-slate-400 mt-2.5">
            Waktu kehadiran direkam otomatis dan disinkronkan langsung ke rekap Google Sheets.
          </p>
        </div>
      </form>
    </div>
  );
};
