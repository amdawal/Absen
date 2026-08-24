import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  X,
  Printer,
  CheckCircle,
  Building,
  Calendar,
  Filter,
  RefreshCw,
  Database,
  Users,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { AttendeeRecord, EventConfig, PDFExportOptions } from '../types';
import { generateAttendancePDF } from '../services/pdfReport';
import {
  getAllAttendeesForReport,
  getLatestEventConfig,
  getAllEvents,
  getDistinctAttendeeDates,
} from '../services/storage';

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
  // All Events from Firestore
  const [allEvents, setAllEvents] = useState<EventConfig[]>([event]);
  const [selectedEventId, setSelectedEventId] = useState<string>(event.id);
  const [selectedEvent, setSelectedEvent] = useState<EventConfig>(event);

  // Available dates for selected event
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('Semua Tanggal');

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
    selectedEventId: event.id,
    selectedDate: 'Semua Tanggal',
  });

  const [dbAttendees, setDbAttendees] = useState<AttendeeRecord[]>(attendees);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // When modal opens or default event changes
  useEffect(() => {
    if (isOpen) {
      setSelectedEventId(event.id);
      setSelectedEvent(event);
      loadAllEventsAndData(event.id);
    }
  }, [isOpen, event]);

  const loadAllEventsAndData = async (targetEventId: string) => {
    setIsLoadingData(true);
    try {
      // 1. Fetch all events
      const events = await getAllEvents();
      if (events && events.length > 0) {
        setAllEvents(events);
      }

      const activeTarget = events.find((e) => e.id === targetEventId) || event;
      setSelectedEvent(activeTarget);

      // 2. Fetch fresh attendees from Firestore for this event
      const freshAttendees = await getAllAttendeesForReport(targetEventId);
      setDbAttendees(freshAttendees);

      // 3. Extract distinct dates
      const distinctDates = new Set<string>();
      if (activeTarget.date) distinctDates.add(activeTarget.date);
      freshAttendees.forEach((r) => {
        if (r.timestamp) {
          distinctDates.add(r.timestamp.split('T')[0]);
        }
      });
      const dateList = Array.from(distinctDates).sort().reverse();
      setAvailableDates(dateList);

      // 4. Update PDF Options header fields
      setOptions((prev) => ({
        ...prev,
        institutionName: 'PEMERINTAH KOTA SAMARINDA',
        subHeader: activeTarget.organizer || 'SEKRETARIAT DAERAH KOTA SAMARINDA',
        eventName: activeTarget.name,
        eventDate: activeTarget.date,
        eventLocation: activeTarget.locationName,
        picName: activeTarget.picName || 'H. Hero Mardanus Satyawan, S.T., M.T.',
        picNip: activeTarget.picNip || '19700315 199603 1 004',
        selectedEventId: targetEventId,
        selectedDate: 'Semua Tanggal',
      }));
    } catch (err) {
      console.warn('Error loading events for PDF report:', err);
      setDbAttendees(attendees);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Handle Switching Event from Dropdown
  const handleEventChange = async (newEventId: string) => {
    setSelectedEventId(newEventId);
    setSelectedDateFilter('Semua Tanggal');
    setIsLoadingData(true);

    try {
      let targetEvt = allEvents.find((e) => e.id === newEventId);
      if (!targetEvt && newEventId !== 'all') {
        targetEvt = await getLatestEventConfig(newEventId);
      }

      if (targetEvt) {
        setSelectedEvent(targetEvt);
        setOptions((prev) => ({
          ...prev,
          eventName: targetEvt.name,
          eventDate: targetEvt.date,
          eventLocation: targetEvt.locationName,
          subHeader: targetEvt.organizer || prev.subHeader,
          picName: targetEvt.picName || prev.picName,
          picNip: targetEvt.picNip || prev.picNip,
          selectedEventId: newEventId,
          selectedDate: 'Semua Tanggal',
        }));
      }

      const freshList = await getAllAttendeesForReport(newEventId);
      setDbAttendees(freshList);

      // Refresh dates list
      const dates = new Set<string>();
      if (targetEvt?.date) dates.add(targetEvt.date);
      freshList.forEach((r) => {
        if (r.timestamp) dates.add(r.timestamp.split('T')[0]);
      });
      setAvailableDates(Array.from(dates).sort().reverse());
    } catch (err) {
      console.warn('Error switching event in PDF modal:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Handle Switching Date from Dropdown
  const handleDateChange = (newDate: string) => {
    setSelectedDateFilter(newDate);
    setOptions((prev) => ({
      ...prev,
      selectedDate: newDate,
      eventDate: newDate !== 'Semua Tanggal' ? newDate : selectedEvent.date,
    }));
  };

  if (!isOpen) return null;

  // Filter attendees by selected date & unit
  const filteredByDate =
    selectedDateFilter === 'Semua Tanggal'
      ? dbAttendees
      : dbAttendees.filter((a) => {
          const isoDate = a.timestamp ? a.timestamp.split('T')[0] : '';
          const formatted = a.dateFormatted || '';
          return isoDate === selectedDateFilter || formatted.includes(selectedDateFilter);
        });

  const unitList = ['Semua', ...Array.from(new Set(filteredByDate.map((a) => a.unitKerja)))];

  const finalFilteredAttendees =
    options.filterUnitKerja === 'Semua'
      ? filteredByDate
      : filteredByDate.filter((a) => a.unitKerja === options.filterUnitKerja);

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      // Re-fetch right before generating to guarantee absolute latest records
      let recordsToPrint = finalFilteredAttendees;
      try {
        const freshList = await getAllAttendeesForReport(
          selectedEventId,
          selectedDateFilter !== 'Semua Tanggal' ? selectedDateFilter : undefined
        );
        if (freshList && freshList.length > 0) {
          recordsToPrint =
            options.filterUnitKerja === 'Semua'
              ? freshList
              : freshList.filter((a) => a.unitKerja === options.filterUnitKerja);
        }
      } catch {
        // use fallback recordsToPrint
      }

      await generateAttendancePDF(recordsToPrint, selectedEvent, options);
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
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
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
                Pilih kegiatan, tanggal acara, serta kop surat dan tanda tangan pengesahan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Event & Date Filter Selector Box */}
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-700" />
              Pilihan Kegiatan & Tanggal Laporan:
            </span>
            <button
              type="button"
              onClick={() => loadAllEventsAndData(selectedEventId)}
              disabled={isLoadingData}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-white hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer disabled:opacity-50"
              title="Perbarui data langsung dari database"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingData ? 'animate-spin' : ''}`} />
              Perbarui Data
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Event Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Pilih Kegiatan:
              </label>
              <select
                id="select-pdf-event"
                value={selectedEventId}
                onChange={(e) => handleEventChange(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-blue-200 rounded-xl focus:outline-hidden focus:border-blue-600 text-slate-900"
              >
                {allEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name} ({evt.date})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Pilih Tanggal Kegiatan:
              </label>
              <select
                id="select-pdf-date"
                value={selectedDateFilter}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-white border border-blue-200 rounded-xl focus:outline-hidden focus:border-blue-600 text-slate-900"
              >
                <option value="Semua Tanggal">Semua Tanggal Pelaksanaan</option>
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Database Live Status Indicator */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Database className="w-4 h-4 text-blue-600" />
            <span>
              Status Data:{' '}
              {isLoadingData ? (
                <span className="text-amber-600 font-semibold animate-pulse">
                  Menyinkronkan presensi dari Firestore...
                </span>
              ) : (
                <span className="text-emerald-700 font-bold">
                  {finalFilteredAttendees.length} peserta siap dicetak ke PDF
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Kop & Signer Customization Form */}
        <div className="space-y-3 text-xs">
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

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Judul Kegiatan pada Laporan PDF:
            </label>
            <input
              type="text"
              value={options.eventName}
              onChange={(e) => setOptions({ ...options, eventName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Filter Unit Kerja (OPD):
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
                Tanggal Tertera di Laporan:
              </label>
              <input
                type="text"
                value={options.eventDate}
                onChange={(e) => setOptions({ ...options, eventDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nama Pejabat PIC / Pengesah:
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
                NIP Pejabat PIC / Pengesah:
              </label>
              <input
                type="text"
                value={options.picNip}
                onChange={(e) => setOptions({ ...options, picNip: e.target.value })}
                className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Jabatan Pejabat Pengesah:
            </label>
            <input
              type="text"
              value={options.picTitle}
              onChange={(e) => setOptions({ ...options, picTitle: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
            />
          </div>
        </div>

        {/* Summary Info */}
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Total <strong>{finalFilteredAttendees.length}</strong> presensi terdaftar untuk kegiatan{' '}
              <strong>"{selectedEvent.name}"</strong>
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            id="btn-download-pdf-submit"
            onClick={handleDownload}
            disabled={isExporting || isLoadingData}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Membuat Berkas PDF...' : 'Unduh Berkas PDF Sekarang'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
