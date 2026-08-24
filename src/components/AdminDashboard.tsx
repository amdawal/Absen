import React, { useState, useEffect } from 'react';
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
  Layers,
  CheckCircle,
} from 'lucide-react';
import { AttendeeRecord, EventConfig } from '../types';
import {
  syncOfflineAttendees,
  deleteAttendeeRecord,
  getAllEvents,
  subscribeToAllEvents,
  subscribeToAttendees,
  setActiveEventIdInDb,
} from '../services/storage';
import { PDFExportModal } from './PDFExportModal';

interface AdminDashboardProps {
  attendees: AttendeeRecord[];
  event: EventConfig;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  attendees,
  event,
  onRefresh,
  onOpenSettings,
  onLoadMore,
  hasMore,
}) => {
  const [allEvents, setAllEvents] = useState<EventConfig[]>([event]);
  const [selectedEventId, setSelectedEventId] = useState<string>(event.id);
  const [currentEvent, setCurrentEvent] = useState<EventConfig>(event);
  const [eventAttendees, setEventAttendees] = useState<AttendeeRecord[]>(attendees);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('Semua');
  const [selectedDate, setSelectedDate] = useState('Semua Tanggal');
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendeeRecord | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Subscribe to all events
  useEffect(() => {
    const unsub = subscribeToAllEvents((evts) => {
      setAllEvents(evts);
      const match = evts.find((e) => e.id === selectedEventId) || evts.find((e) => e.id === event.id) || evts[0];
      if (match) {
        setCurrentEvent(match);
      }
    });
    return () => unsub();
  }, [selectedEventId, event.id]);

  // Subscribe to attendees of selected event
  useEffect(() => {
    if (selectedEventId === event.id) {
      setEventAttendees(attendees.filter((a) => a.eventId === event.id));
    } else {
      const unsubAtt = subscribeToAttendees(
        selectedEventId,
        (records) => {
          setEventAttendees(records);
        },
        100
      );
      return () => unsubAtt();
    }
  }, [selectedEventId, event.id, attendees]);

  // Handle Event selection change
  const handleEventChange = (newId: string) => {
    setSelectedEventId(newId);
    setSelectedDate('Semua Tanggal');
    const match = allEvents.find((e) => e.id === newId);
    if (match) {
      setCurrentEvent(match);
    }
  };

  const handleMakeActiveEvent = async () => {
    try {
      await setActiveEventIdInDb(currentEvent.id);
      setSyncMessage(`"${currentEvent.name}" telah diaktifkan untuk formulir publik.`);
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (e: any) {
      alert(`Gagal mengaktifkan kegiatan: ${e.message}`);
    }
  };

  // Extract distinct dates for date filter
  const distinctDates = new Set<string>();
  if (currentEvent.date) distinctDates.add(currentEvent.date);
  eventAttendees.forEach((r) => {
    if (r.timestamp) {
      distinctDates.add(r.timestamp.split('T')[0]);
    }
  });
  const dateOptions = ['Semua Tanggal', ...Array.from(distinctDates).sort().reverse()];

  // Filter attendees by search, unit, and date
  const filteredList = eventAttendees.filter((rec) => {
    const matchSearch =
      rec.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.nip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.unitKerja.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.jabatan.toLowerCase().includes(searchTerm.toLowerCase());

    const matchUnit = selectedUnit === 'Semua' || rec.unitKerja === selectedUnit;

    let matchDate = true;
    if (selectedDate !== 'Semua Tanggal') {
      const recIso = rec.timestamp ? rec.timestamp.split('T')[0] : '';
      const recFormatted = rec.dateFormatted || '';
      matchDate = recIso === selectedDate || recFormatted.includes(selectedDate);
    }

    return matchSearch && matchUnit && matchDate;
  });

  // Metrics based on current event
  const totalCount = eventAttendees.length;
  const uniqueUnitsCount = new Set(eventAttendees.map((a) => a.unitKerja)).size;
  const signatureCount = eventAttendees.filter((a) => a.signatureDataUrl).length;
  const syncedCount = eventAttendees.filter((a) => a.isSyncedToSheets).length;
  const pendingOfflineCount = eventAttendees.filter((a) => !a.isSyncedToSheets).length;

  const uniqueUnits = ['Semua', ...Array.from(new Set(eventAttendees.map((a) => a.unitKerja)))];

  const handleManualSync = async () => {
    if (!currentEvent.spreadsheetId) {
      alert('Google Spreadsheet belum ditautkan untuk kegiatan ini. Silakan hubungkan di tab Pengaturan.');
      onOpenSettings();
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncOfflineAttendees(currentEvent, eventAttendees);
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
      'Kegiatan',
      'Waktu Presensi',
      'Tanggal',
      'NIP',
      'Nama Lengkap',
      'Jenis Kelamin',
      'No. HP / WA',
      'Unit Kerja',
      'Jabatan',
      'Status Sinkronisasi Sheets',
    ];

    const rows = filteredList.map((r) => [
      `"${r.id}"`,
      `"${currentEvent.name}"`,
      `"${r.timeFormatted}"`,
      `"${r.dateFormatted}"`,
      `"'${r.nip}"`,
      `"${r.nama}"`,
      `"${r.gender || '-'}"`,
      `"${r.phone ? `'${r.phone}` : '-'}"`,
      `"${r.unitKerja}"`,
      `"${r.jabatan}"`,
      `"${r.isSyncedToSheets ? 'Tersinkron' : 'Pending'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Presensi_${currentEvent.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${selectedDate.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isCurrentActive = currentEvent.id === event.id || currentEvent.isActive;

  return (
    <div className="w-full space-y-6" id="admin-dashboard-container">
      {/* Top Banner with Event Selector & Quick Actions */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold uppercase tracking-wider">
              Rekap & Laporan Admin
            </span>
            {isCurrentActive ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                Formulir Presensi Aktif
              </span>
            ) : (
              <button
                type="button"
                onClick={handleMakeActiveEvent}
                className="px-2.5 py-0.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 text-[10px] font-bold transition cursor-pointer"
                title="Aktifkan kegiatan ini untuk form presensi publik"
              >
                Aktifkan di Form Presensi
              </button>
            )}
          </div>

          {/* Event Selector Dropdown */}
          <div className="pt-1">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Pilih Kegiatan untuk Ditinjau / Dicetak:
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <select
                id="select-admin-event"
                value={selectedEventId}
                onChange={(e) => handleEventChange(e.target.value)}
                className="px-3.5 py-2 text-sm font-extrabold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:bg-white max-w-xl"
              >
                {allEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name} ({evt.date})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold underline px-1 cursor-pointer"
              >
                + Kelola Kegiatan di Pengaturan
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 flex items-center gap-2 pt-0.5">
            <span>📅 {currentEvent.date} ({currentEvent.startTime} - {currentEvent.endTime} WITA)</span>
            <span>•</span>
            <span>📍 {currentEvent.locationName}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            id="btn-open-pdf-modal"
            onClick={() => setIsPDFModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Cetak Laporan PDF
          </button>

          {currentEvent.spreadsheetUrl ? (
            <a
              href={currentEvent.spreadsheetUrl}
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
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              <CloudOff className="w-4 h-4 text-slate-500" />
              Tautkan Sheets
            </button>
          )}

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer"
            title="Sinkronkan data offline ke Google Sheets"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
            Sinkronkan ({pendingOfflineCount})
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
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

      {/* Filter and Search Bar (Search, Unit Filter, and Date Filter) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
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

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Date Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
            >
              {dateOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Kerja Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
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
                <th className="py-3.5 px-4">Gender & Kontak</th>
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
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-600">Belum ada data kehadiran yang sesuai</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Pilih tanggal atau kegiatan lain, atau isi form presensi untuk menambahkan peserta.
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

                    {/* Gender & Kontak */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-slate-800 font-medium">
                        {record.gender === 'Perempuan' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-pink-100 text-pink-700">
                            👩 Perempuan
                          </span>
                        ) : record.gender === 'Laki-laki' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700">
                            👨 Laki-laki
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </div>
                      {record.phone && (
                        <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                          📞 {record.phone}
                        </div>
                      )}
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
                          className="inline-block p-1 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition cursor-pointer"
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
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Lihat Rincian Presensi"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(record.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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

        {onLoadMore && hasMore && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
            <button
              type="button"
              id="btn-load-more-attendees"
              onClick={onLoadMore}
              className="px-5 py-2 text-xs font-bold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 rounded-xl shadow-xs transition cursor-pointer"
            >
              Muat Lebih Banyak Data Presensi (+50)
            </button>
          </div>
        )}
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
                className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">Jenis Kelamin:</span>
                <span className="font-semibold">{selectedRecord.gender || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">No. HP / WhatsApp:</span>
                <span className="font-semibold">{selectedRecord.phone || '-'}</span>
              </div>
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
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
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
        event={currentEvent}
      />
    </div>
  );
};
