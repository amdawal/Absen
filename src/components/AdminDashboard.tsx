import React, { useState } from 'react';
import {
  FileText,
  Download,
  Search,
  Filter,
  FileCheck,
  RefreshCw,
  ExternalLink,
  Eye,
  Trash2,
  Users,
  Building,
  Calendar,
  CloudCheck,
  CloudOff,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { AttendeeRecord, EventConfig } from '../types';
import { syncOfflineAttendees, deleteAttendeeRecord } from '../services/storage';
import { PDFExportModal } from './PDFExportModal';

interface AdminDashboardProps {
  attendees: AttendeeRecord[];
  event: EventConfig;
  onRefresh: () => void;
  onOpenSettings: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  attendees,
  event,
  onRefresh,
  onOpenSettings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('Semua');
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendeeRecord | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Filter attendees for this event
  const eventAttendees = attendees.filter((a) => a.eventId === event.id);

  // Summary Metrics
  const totalCount = eventAttendees.length;
  const uniqueUnitsCount = new Set(eventAttendees.map((a) => a.unitKerja)).size;
  const signatureCount = eventAttendees.filter((a) => a.signatureDataUrl).length;
  const syncedCount = eventAttendees.filter((a) => a.isSyncedToSheets).length;
  const pendingOfflineCount = eventAttendees.filter((a) => !a.isSyncedToSheets).length;

  // Filtered List
  const filteredList = eventAttendees.filter((rec) => {
    const matchSearch =
      rec.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.nip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.unitKerja.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.jabatan.toLowerCase().includes(searchTerm.toLowerCase());

    const matchUnit = selectedUnit === 'Semua' || rec.unitKerja === selectedUnit;

    return matchSearch && matchUnit;
  });

  const uniqueUnits = ['Semua', ...Array.from(new Set(eventAttendees.map((a) => a.unitKerja)))];

  const handleManualSync = async () => {
    if (!event.spreadsheetId) {
      alert('Google Spreadsheet belum ditautkan. Silakan hubungkan spreadsheet di tab Pengaturan.');
      onOpenSettings();
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncOfflineAttendees(event, attendees);
      if (res.error) {
        setSyncMessage(`Peringatan: ${res.error}`);
      } else {
        setSyncMessage(`Berhasil menyinkronkan ${res.syncedCount} data presensi ke Google Sheets!`);
      }
      onRefresh();
    } catch (err: any) {
      setSyncMessage(err.message || 'Gagal menyinkronkan data');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (window.confirm('Hapus catatan presensi ini dari database Firebase?')) {
      try {
        await deleteAttendeeRecord(id);
        onRefresh();
      } catch (err: any) {
        alert(`Gagal menghapus: ${err.message}`);
      }
    }
  };

  const handleExportCSV = () => {
    if (filteredList.length === 0) return;
    const headers = [
      'ID Presensi',
      'Waktu Presensi',
      'Tanggal',
      'NIP',
      'Nama Lengkap',
      'Unit Kerja',
      'Jabatan',
      'Status Sinkronisasi Sheets',
    ];

    const rows = filteredList.map((r) => [
      `"${r.id}"`,
      `"${r.timeFormatted}"`,
      `"${r.dateFormatted}"`,
      `"'${r.nip}"`,
      `"${r.nama}"`,
      `"${r.unitKerja}"`,
      `"${r.jabatan}"`,
      `"${r.isSyncedToSheets ? 'Tersinkron' : 'Pending'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Presensi_${event.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-6" id="admin-dashboard-container">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold uppercase tracking-wider">
              Rekap & Laporan Admin
            </span>
            <span className="text-xs text-slate-400">• {event.date}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
            Rekapitulasi Kehadiran Peserta
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {event.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            id="btn-open-pdf-modal"
            onClick={() => setIsPDFModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Cetak Laporan PDF
          </button>

          {event.spreadsheetUrl ? (
            <a
              href={event.spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-xs rounded-xl transition"
            >
              <FileCheck className="w-4 h-4 text-emerald-600" />
              Buka Google Sheets
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          ) : (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
            >
              <CloudOff className="w-4 h-4 text-slate-500" />
              Tautkan Sheets
            </button>
          )}

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition disabled:opacity-50"
            title="Sinkronkan data offline ke Google Sheets"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
            Sinkronkan ({pendingOfflineCount})
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition"
            title="Ekspor CSV"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-blue-800 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{syncMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncMessage(null)}
            className="text-xs text-blue-600 font-bold hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Metrics Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Peserta */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold">Total Peserta Hadir</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{totalCount}</div>
          <span className="text-[10px] text-slate-500">Pegawai terdaftar</span>
        </div>

        {/* OPD Terwakili */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold">OPD / Unit Kerja</span>
            <Building className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-600">{uniqueUnitsCount}</div>
          <span className="text-[10px] text-slate-500">Unit hadir</span>
        </div>

        {/* TTD Terverifikasi */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold">Tanda Tangan Digital</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">{signatureCount}</div>
          <span className="text-[10px] text-slate-500">100% Terverifikasi</span>
        </div>

        {/* Google Sheets Sync */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold">Rekap Google Sheets</span>
            {pendingOfflineCount === 0 ? (
              <CloudCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <CloudOff className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{syncedCount}</div>
          <span
            className={`text-[10px] ${
              pendingOfflineCount > 0 ? 'text-amber-600 font-bold' : 'text-slate-500'
            }`}
          >
            {pendingOfflineCount > 0
              ? `${pendingOfflineCount} Pending Offline`
              : 'Tersinkron Penuh'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            id="admin-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari NIP, Nama Lengkap, OPD, Jabatan..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Unit Kerja Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full sm:w-64 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
            >
              {uniqueUnits.map((unit) => (
                <option key={unit} value={unit}>
                  Unit: {unit}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden" id="attendance-data-table-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4 text-center w-12">No</th>
                <th className="py-3.5 px-4">Pegawai & NIP</th>
                <th className="py-3.5 px-4">Unit Kerja (OPD)</th>
                <th className="py-3.5 px-4">Jabatan</th>
                <th className="py-3.5 px-4">Waktu Hadir</th>
                <th className="py-3.5 px-4 text-center">Tanda Tangan</th>
                <th className="py-3.5 px-4 text-center">Sync Sheets</th>
                <th className="py-3.5 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-600">Belum ada data kehadiran yang sesuai</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Gunakan formulir presensi untuk mencatat kehadiran peserta kegiatan.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map((record, index) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                      {index + 1}
                    </td>

                    {/* Pegawai & NIP */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{record.nama}</div>
                      <div className="text-[11px] font-mono text-slate-500">NIP. {record.nip}</div>
                    </td>

                    {/* Unit Kerja */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{record.unitKerja}</div>
                    </td>

                    {/* Jabatan */}
                    <td className="py-3 px-4">
                      <div className="text-slate-600">{record.jabatan}</div>
                    </td>

                    {/* Waktu Presensi */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{record.timeFormatted}</div>
                      <div className="text-[10px] text-slate-400">{record.dateFormatted}</div>
                    </td>

                    {/* Tanda Tangan */}
                    <td className="py-3 px-4 text-center">
                      {record.signatureDataUrl ? (
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(record)}
                          className="inline-block p-1 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition"
                          title="Klik untuk memperbesar tanda tangan"
                        >
                          <img
                            src={record.signatureDataUrl}
                            alt="TTD"
                            className="h-7 w-14 object-contain"
                          />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-300">-</span>
                      )}
                    </td>

                    {/* Sync Sheets */}
                    <td className="py-3 px-4 text-center">
                      {record.isSyncedToSheets ? (
                        <span
                          className="inline-flex items-center gap-1 text-emerald-600 text-[10px] font-semibold"
                          title="Tersinkron ke Google Sheets"
                        >
                          <CloudCheck className="w-3.5 h-3.5" />
                          Tersinkron
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-amber-600 text-[10px] font-semibold"
                          title="Tersimpan di antrean offline lokal"
                        >
                          <CloudOff className="w-3.5 h-3.5" />
                          Offline
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(record)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Lihat Rincian Presensi"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(record.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus Catatan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Record Detail Modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
          id="detail-record-modal"
        >
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  ID: #{selectedRecord.id.slice(0, 8)}
                </span>
                <h3 className="text-base font-bold text-slate-900">{selectedRecord.nama}</h3>
                <p className="text-xs font-mono text-slate-600">NIP. {selectedRecord.nip}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">Unit Kerja:</span>
                <span className="font-semibold">{selectedRecord.unitKerja}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jabatan:</span>
                <span className="font-semibold">{selectedRecord.jabatan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Waktu Presensi:</span>
                <span className="font-semibold">
                  {selectedRecord.dateFormatted}, {selectedRecord.timeFormatted}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status Sinkronisasi:</span>
                <span className="font-semibold text-emerald-700">
                  {selectedRecord.isSyncedToSheets ? 'Tersinkron Google Sheets' : 'Tersimpan Offline'}
                </span>
              </div>
            </div>

            {/* Signature Preview */}
            <div className="border border-slate-200 rounded-2xl p-3 bg-white">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                Tanda Tangan Digital Peserta
              </span>
              <div className="h-24 bg-slate-50 rounded-xl flex items-center justify-center p-2 border border-slate-100">
                <img
                  src={selectedRecord.signatureDataUrl}
                  alt="Tanda Tangan"
                  className="max-h-full object-contain"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export Modal */}
      <PDFExportModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        attendees={eventAttendees}
        event={event}
      />
    </div>
  );
};
