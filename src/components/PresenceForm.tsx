import React, { useState, useRef } from 'react';
import {
  Calendar,
  Building,
  Clock,
  MapPin,
  Send,
  AlertTriangle,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { AttendeeRecord, EventConfig } from '../types';
import { addAttendeeRecord } from '../services/storage';
import { SignatureCanvas, SignatureCanvasHandle } from './SignatureCanvas';
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
  const signatureRef = useRef<SignatureCanvasHandle | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEventActive = event.isActive !== false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isEventActive) {
      setFormError('Kegiatan ini berstatus Tidak Aktif. Presensi kehadiran saat ini sedang ditutup.');
      return;
    }

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

      // Fast non-blocking save with compressed base64 signature (~4-8KB) and atomic counter
      const savedRecord = await addAttendeeRecord(newRecord, event);

      // Reset form fields
      setNip('');
      setNama('');
      setUnitKerja('');
      setJabatan('');
      setSignatureDataUrl('');
      if (signatureRef.current) {
        signatureRef.current.clear();
      }

      onSuccess(savedRecord);
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan saat menyimpan presensi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6" id="presence-form-container">
      {/* Event Header Banner Card with Large Clear Typography following the Active Event */}
      <div
        className={`text-white rounded-3xl p-6 sm:p-8 shadow-xl border relative overflow-hidden transition-all ${
          isEventActive
            ? 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border-blue-800/40'
            : 'bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 border-slate-700/60'
        }`}
        id="presence-event-header-card"
      >
        <div className="absolute -right-8 -bottom-8 w-52 h-52 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
          {/* Status Badge: Aktif / Tidak Aktif */}
          {isEventActive ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs sm:text-sm font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Kegiatan Aktif • Presensi Terbuka
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs sm:text-sm font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Kegiatan Tidak Aktif • Presensi Ditutup
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs sm:text-sm font-bold">
            <Calendar className="w-4 h-4 text-blue-300" />
            {event.date} • {event.startTime || '08:30'} - {event.endTime || '12:00'} WITA
          </span>

          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-slate-200 text-xs sm:text-sm font-bold">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            Pemerintah Kota Samarinda
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight tracking-tight">
          {event.name}
        </h1>

        {event.description && (
          <p className="text-xs sm:text-sm text-slate-300 mt-2 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        )}

        <div className="mt-4 pt-3.5 border-t border-white/15 flex flex-wrap items-center gap-y-2 gap-x-6 text-sm sm:text-base text-slate-200 font-medium">
          <span className="flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-400 shrink-0" />
            {event.organizer || 'Sekretariat Daerah Kota Samarinda'}
          </span>
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
            {event.locationName}
          </span>
        </div>
      </div>

      {/* Inactive Notice Banner if event is paused / closed */}
      {!isEventActive && (
        <div className="p-4 sm:p-5 bg-amber-50 border-2 border-amber-300 rounded-3xl text-amber-900 text-sm flex items-start gap-3.5 shadow-sm">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-base">Presensi Sedang Ditutup (Kegiatan Tidak Aktif)</p>
            <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
              Formulir daftar hadir untuk kegiatan ini sedang dinonaktifkan oleh panitia pelaksana.
              Silakan hubungi administrator atau panitia pelaksana untuk mengaktifkan kembali formulir presensi.
            </p>
          </div>
        </div>
      )}

      {/* Main Form Box with Large Text & Generous Padding */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl p-6 sm:p-9 shadow-sm border border-slate-200 space-y-7"
        id="form-presensi-pegawai"
      >
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Formulir Daftar Hadir Peserta
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Silakan lengkapi data NIP, nama lengkap, unit kerja, jabatan, dan bubuhkan tanda tangan digital di bawah ini.
          </p>
        </div>

        {formError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Perhatian</p>
              <p className="mt-0.5">{formError}</p>
            </div>
          </div>
        )}

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* NIP */}
            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-800 mb-2">
                Nomor Induk Pegawai (NIP) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="input-nip"
                required
                disabled={!isEventActive}
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Contoh: 19850712 201001 1 005"
                className="w-full px-4 py-3 sm:py-3.5 text-sm sm:text-base font-mono bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-blue-600 focus:ring-3 focus:ring-blue-100 focus:outline-hidden transition text-slate-900 placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* Nama Lengkap */}
            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-800 mb-2">
                Nama Lengkap & Gelar <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="input-nama"
                required
                disabled={!isEventActive}
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama lengkap beserta gelar"
                className="w-full px-4 py-3 sm:py-3.5 text-sm sm:text-base font-medium bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-blue-600 focus:ring-3 focus:ring-blue-100 focus:outline-hidden transition text-slate-900 placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
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
            <label className="block text-sm sm:text-base font-bold text-slate-800 mb-2">
              Jabatan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="input-jabatan"
              required
              disabled={!isEventActive}
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
              placeholder="Contoh: Kepala Dinas / Camat / Kepala Bidang / Analis Kebijakan / Staf"
              className="w-full px-4 py-3 sm:py-3.5 text-sm sm:text-base font-medium bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-blue-600 focus:ring-3 focus:ring-blue-100 focus:outline-hidden transition text-slate-900 placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Digital Signature Canvas Section */}
        <div className="pt-2 border-t border-slate-100">
          <SignatureCanvas
            ref={signatureRef}
            onSave={(url) => {
              setSignatureDataUrl(url);
            }}
            onClear={() => {
              setSignatureDataUrl('');
            }}
          />
        </div>

        {/* Submit Button */}
        <div className="pt-3">
          <button
            type="submit"
            id="btn-submit-presensi"
            disabled={isSubmitting || !isEventActive}
            className={`w-full py-4 px-6 text-base sm:text-lg font-black rounded-2xl shadow-xl flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isEventActive
                ? 'bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 active:from-blue-800 text-white shadow-blue-700/20'
                : 'bg-slate-300 text-slate-600 shadow-none'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Menyimpan Presensi...</span>
              </>
            ) : !isEventActive ? (
              <span>Formulir Presensi Ditutup (Kegiatan Tidak Aktif)</span>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Kirim & Bubuhkan Tanda Tangan Kehadiran</span>
              </>
            )}
          </button>
          <p className="text-xs sm:text-sm text-center text-slate-500 mt-3 font-medium">
            {isEventActive
              ? 'Data tersimpan instan ke cloud database Firebase dan otomatis disinkronkan ke rekap Google Sheets.'
              : 'Aktifkan kegiatan ini di menu Pengaturan untuk membuka kembali pengisian presensi.'}
          </p>
        </div>
      </form>
    </div>
  );
};
