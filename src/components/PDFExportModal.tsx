import React, { useState } from 'react';
import {
  FileText,
  Download,
  X,
  Printer,
  CheckCircle,
  Building,
  Calendar,
  Filter,
} from 'lucide-react';
import { AttendeeRecord, EventConfig, PDFExportOptions } from '../types';
import { generateAttendancePDF } from '../services/pdfReport';

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendees: AttendeeRecord[];
  event: EventConfig;
}

export const PDFExportModal: React.FC<PDFExportModalProps> = ({
  isOpen,
  onClose,
  attendees,
  event,
}) => {
  const [options, setOptions] = useState<PDFExportOptions>({
    institutionName: 'PEMERINTAH KOTA SAMARINDA',
    subHeader: event.organizer || 'SEKRETARIAT DAERAH KOTA SAMARINDA',
    addressHeader: 'Jl. Kusuma Bangsa No. 82, Kel. Sungai Pinang Luar, Kota Samarinda, Kalimantan Timur 75121',
    eventName: event.name,
    eventDate: event.date,
    eventLocation: event.locationName,
    picName: event.picName || 'H. Hero Mardanus Satyawan, S.T., M.T.',
    picNip: event.picNip || '19700315 199603 1 004',
    picTitle: 'Ketua Panitia Pelaksana / Pimpinan Rapat',
    filterUnitKerja: 'Semua',
  });

  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const unitList = ['Semua', ...Array.from(new Set(attendees.map((a) => a.unitKerja)))];

  const filteredAttendees =
    options.filterUnitKerja === 'Semua'
      ? attendees
      : attendees.filter((a) => a.unitKerja === options.filterUnitKerja);

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      await generateAttendancePDF(filteredAttendees, event, options);
    } catch (e: any) {
      alert(`Gagal membuat PDF: ${e.message}`);
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      id="pdf-export-modal"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Cetak Laporan PDF Daftar Hadir
              </h3>
              <p className="text-xs text-slate-500">
                Format resmi dengan Kop Surat, tanda tangan digital, & tanda tangan pejabat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Form */}
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Kop Instansi Utama (Baris 1):
            </label>
            <input
              type="text"
              value={options.institutionName}
              onChange={(e) => setOptions({ ...options, institutionName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Sub-Kop / Penyelenggara (Baris 2):
            </label>
            <input
              type="text"
              value={options.subHeader}
              onChange={(e) => setOptions({ ...options, subHeader: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Alamat Kantor / Instansi (Kop):
            </label>
            <input
              type="text"
              value={options.addressHeader}
              onChange={(e) => setOptions({ ...options, addressHeader: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 text-slate-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Filter Unit Kerja:
              </label>
              <select
                value={options.filterUnitKerja}
                onChange={(e) => setOptions({ ...options, filterUnitKerja: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              >
                {unitList.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Jabatan Pengesah (PIC):
              </label>
              <input
                type="text"
                value={options.picTitle}
                onChange={(e) => setOptions({ ...options, picTitle: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nama Pengesah (PIC):
              </label>
              <input
                type="text"
                value={options.picName}
                onChange={(e) => setOptions({ ...options, picName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                NIP Pengesah (PIC):
              </label>
              <input
                type="text"
                value={options.picNip}
                onChange={(e) => setOptions({ ...options, picNip: e.target.value })}
                className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Summary Info */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Total <strong>{filteredAttendees.length}</strong> peserta akan dicetak lengkap dengan tanda tangan digital
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Memproses PDF...' : 'Unduh Berkas PDF Sekarang'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
