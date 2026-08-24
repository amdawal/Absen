import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  Settings,
  FileSpreadsheet,
  Calendar,
  Save,
  CheckCircle,
  ExternalLink,
  Plus,
  RefreshCw,
  LogOut,
  Building,
  UserCheck,
  ShieldCheck,
  KeyRound,
  Lock,
  AlertTriangle,
  Radio,
  Trash2,
  Edit,
  Clock,
  MapPin,
  Sparkles,
  Layers,
} from 'lucide-react';
import { EventConfig } from '../types';
import { googleSignIn, logout } from '../services/auth';
import { createAttendanceSpreadsheet } from '../services/googleSheets';
import {
  updateEventConfig,
  createEvent,
  deleteEvent,
  subscribeToAllEvents,
  setActiveEventIdInDb,
  setEventActiveStatus,
} from '../services/storage';
import { changeAdminPassword, AdminUser } from '../services/adminAuth';

interface SettingsTabProps {
  event: EventConfig;
  user: FirebaseUser | null;
  adminUser: AdminUser | null;
  onEventUpdated: (updated: EventConfig) => void;
  onUserChanged: (user: FirebaseUser | null) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  event,
  user,
  adminUser,
  onEventUpdated,
  onUserChanged,
}) => {
  // All Events State
  const [eventsList, setEventsList] = useState<EventConfig[]>([event]);
  const [selectedEventId, setSelectedEventId] = useState<string>(event.id);
  const [formData, setFormData] = useState<EventConfig>(event);
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);

  // New Event Form State
  const [newEventData, setNewEventData] = useState<Partial<EventConfig>>({
    name: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:30',
    endTime: '12:00',
    locationName: 'Ruang Rapat Mangkupalas, Balaikota Samarinda, Jl. Kusuma Bangsa',
    organizer: 'Sekretariat Daerah Kota Samarinda',
    picName: event.picName || 'H. Hero Mardanus Satyawan, S.T., M.T.',
    picNip: event.picNip || '19700315 199603 1 004',
    isActive: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [eventActionMessage, setEventActionMessage] = useState<string | null>(null);

  // Google Sheets State
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [sheetStatusMessage, setSheetStatusMessage] = useState<string | null>(null);
  const [manualSheetId, setManualSheetId] = useState(event.spreadsheetId || '');

  // Admin Password Management State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(null);

  // Real-time subscribe to all events from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToAllEvents((events) => {
      setEventsList(events);
      const current = events.find((e) => e.id === selectedEventId) || events.find((e) => e.isActive) || events[0];
      if (current) {
        setFormData(current);
        setSelectedEventId(current.id);
        setManualSheetId(current.spreadsheetId || '');
      }
    });

    return () => unsubscribe();
  }, []);

  // Update form data when switching event selection
  const handleSelectEventToEdit = (evt: EventConfig) => {
    setSelectedEventId(evt.id);
    setFormData(evt);
    setManualSheetId(evt.spreadsheetId || '');
    setEventActionMessage(null);
  };

  // Switch / Toggle Active Status for an Event
  const handleToggleEventStatus = async (evt: EventConfig, makeActive: boolean) => {
    try {
      await setEventActiveStatus(evt.id, makeActive);
      const updated = { ...evt, isActive: makeActive };
      if (makeActive) {
        onEventUpdated(updated);
        setEventActionMessage(`Kegiatan "${evt.name}" kini AKTIF sebagai formulir presensi utama.`);
      } else {
        setEventActionMessage(`Kegiatan "${evt.name}" kini NONAKTIF (presensi ditutup).`);
      }
      setTimeout(() => setEventActionMessage(null), 4000);
    } catch (err: any) {
      alert(`Gagal mengubah status kegiatan: ${err.message}`);
    }
  };

  const handleSetActiveEvent = async (evt: EventConfig) => {
    await handleToggleEventStatus(evt, true);
  };

  // Handle Add New Event Submit
  const handleCreateNewEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventData.name?.trim()) {
      alert('Nama kegiatan wajib diisi.');
      return;
    }
    if (!newEventData.date) {
      alert('Tanggal kegiatan wajib diisi.');
      return;
    }

    setIsCreatingEvent(true);
    try {
      const newEvent: EventConfig = {
        id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: newEventData.name.trim(),
        description: newEventData.description?.trim() || `Kegiatan ${newEventData.name.trim()}`,
        date: newEventData.date,
        startTime: newEventData.startTime || '08:30',
        endTime: newEventData.endTime || '12:00',
        locationName: newEventData.locationName?.trim() || 'Balaikota Samarinda',
        organizer: newEventData.organizer?.trim() || 'Pemerintah Kota Samarinda',
        picName: newEventData.picName?.trim() || 'Pejabat Penanggung Jawab',
        picNip: newEventData.picNip?.trim() || '-',
        isActive: newEventData.isActive ?? true,
        createdAt: new Date().toISOString(),
      };

      const saved = await createEvent(newEvent);
      setSelectedEventId(saved.id);
      setFormData(saved);
      setManualSheetId('');
      if (saved.isActive) {
        onEventUpdated(saved);
      }

      setIsNewEventModalOpen(false);
      // Reset form
      setNewEventData({
        name: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '08:30',
        endTime: '12:00',
        locationName: 'Ruang Rapat Mangkupalas, Balaikota Samarinda, Jl. Kusuma Bangsa',
        organizer: 'Sekretariat Daerah Kota Samarinda',
        picName: formData.picName || 'H. Hero Mardanus Satyawan, S.T., M.T.',
        picNip: formData.picNip || '19700315 199603 1 004',
        isActive: true,
      });

      setEventActionMessage(`Kegiatan baru "${saved.name}" berhasil disimpan ke Firebase Firestore!`);
      setTimeout(() => setEventActionMessage(null), 5000);
    } catch (err: any) {
      alert(`Gagal membuat kegiatan baru: ${err.message}`);
    } finally {
      setIsCreatingEvent(false);
    }
  };

  // Handle Delete Event
  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (eventsList.length <= 1) {
      alert('Tidak dapat menghapus kegiatan satu-satunya. Sisakan minimal 1 kegiatan.');
      return;
    }

    if (window.confirm(`Yakin ingin menghapus kegiatan "${eventName}" dari database Firebase?`)) {
      try {
        await deleteEvent(eventId);
        const remaining = eventsList.filter((e) => e.id !== eventId);
        if (remaining.length > 0) {
          handleSelectEventToEdit(remaining[0]);
          if (eventId === event.id) {
            handleSetActiveEvent(remaining[0]);
          }
        }
        setEventActionMessage(`Kegiatan "${eventName}" berhasil dihapus.`);
        setTimeout(() => setEventActionMessage(null), 4000);
      } catch (err: any) {
        alert(`Gagal menghapus: ${err.message}`);
      }
    }
  };

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        onUserChanged(res.user);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal login dengan Google');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onUserChanged(null);
  };

  const handleCreateAutoSheet = async () => {
    if (!user) {
      alert('Silakan Masuk dengan Akun Google terlebih dahulu.');
      return;
    }

    setIsCreatingSheet(true);
    setSheetStatusMessage(null);
    try {
      const result = await createAttendanceSpreadsheet(formData);
      const updated = {
        ...formData,
        spreadsheetId: result.spreadsheetId,
        spreadsheetUrl: result.spreadsheetUrl,
      };
      setFormData(updated);
      setManualSheetId(result.spreadsheetId);
      await updateEventConfig(updated);
      if (updated.id === event.id) {
        onEventUpdated(updated);
      }
      setSheetStatusMessage('Google Spreadsheet baru berhasil dibuat dan ditautkan otomatis!');
    } catch (err: any) {
      setSheetStatusMessage(`Gagal membuat spreadsheet: ${err.message}`);
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleLinkManualSheet = async () => {
    if (!manualSheetId.trim()) {
      alert('Masukkan ID atau URL Google Spreadsheet');
      return;
    }

    let cleanId = manualSheetId.trim();
    if (cleanId.includes('/d/')) {
      const match = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        cleanId = match[1];
      }
    }

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;
    const updated = {
      ...formData,
      spreadsheetId: cleanId,
      spreadsheetUrl: sheetUrl,
    };

    setFormData(updated);
    await updateEventConfig(updated);
    if (updated.id === event.id) {
      onEventUpdated(updated);
    }
    setSheetStatusMessage('Tautan Spreadsheet berhasil diperbarui di Firebase!');
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (formData.isActive !== undefined) {
        await setEventActiveStatus(formData.id, formData.isActive);
      }
      await updateEventConfig(formData);
      if (formData.id === event.id || formData.isActive) {
        onEventUpdated(formData);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Gagal menyimpan ke Firebase: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMessage(null);
    setPasswordErrorMessage(null);

    if (!currentPassword) {
      setPasswordErrorMessage('Masukkan kata sandi saat ini');
      return;
    }
    if (newPassword.length < 5) {
      setPasswordErrorMessage('Kata sandi baru minimal 5 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrorMessage('Konfirmasi kata sandi baru tidak sesuai');
      return;
    }

    setIsChangingPassword(true);
    try {
      const targetUser = adminUser?.username || 'admin';
      const res = await changeAdminPassword(targetUser, currentPassword, newPassword);
      if (res.success) {
        setPasswordSuccessMessage('Kata sandi admin berhasil diperbarui di Firebase Firestore!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordErrorMessage(res.error || 'Gagal mengubah kata sandi');
      }
    } catch (err: any) {
      setPasswordErrorMessage(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6" id="settings-tab-container">
      {/* Header Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pengaturan & Manajemen Kegiatan</h1>
            <p className="text-xs text-slate-500">
              Kelola daftar kegiatan, cloud database Firebase Firestore, Google Sheets, & akun admin
            </p>
          </div>
        </div>

        <button
          type="button"
          id="btn-open-create-event"
          onClick={() => setIsNewEventModalOpen(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 active:from-blue-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kegiatan Baru</span>
        </button>
      </div>

      {eventActionMessage && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{eventActionMessage}</span>
        </div>
      )}

      {/* 1. Event Selection & Management Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-blue-700" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Daftar Kegiatan Tersimpan</h2>
              <p className="text-xs text-slate-500">
                Pilih kegiatan untuk diedit atau jadikan sebagai kegiatan aktif
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-500 px-3 py-1 bg-slate-100 rounded-xl self-start sm:self-auto">
            Total {eventsList.length} Kegiatan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {eventsList.map((evt) => {
            const isSelected = evt.id === selectedEventId;
            const isCurrentlyActive = evt.id === event.id || evt.isActive;

            return (
              <div
                key={evt.id}
                onClick={() => handleSelectEventToEdit(evt)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-2 ring-blue-100'
                    : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      {evt.date} • {evt.startTime || '08:30'} WITA
                    </span>
                    {/* Status Pill Badge & Action Button */}
                    <div className="flex items-center gap-1.5">
                      {evt.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold shrink-0">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 border border-slate-300 text-[10px] font-bold shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Tidak Aktif
                        </span>
                      )}

                      {/* Quick Status Toggle Button */}
                      {evt.isActive ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleEventStatus(evt, false);
                          }}
                          className="px-2 py-0.5 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-200 text-[10px] font-bold transition cursor-pointer"
                          title="Klik untuk menonaktifkan kegiatan ini (menutup presensi)"
                        >
                          Nonaktifkan
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleEventStatus(evt, true);
                          }}
                          className="px-2 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition cursor-pointer shadow-2xs"
                          title="Klik untuk mengaktifkan kegiatan ini sebagai formulir presensi utama"
                        >
                          Aktifkan
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 line-clamp-2 leading-snug">
                    {evt.name}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    {evt.locationName}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-600 font-medium truncate max-w-[170px]">
                    PIC: {evt.picName}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectEventToEdit(evt);
                      }}
                      className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                      title="Edit rincian kegiatan"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {eventsList.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(evt.id, evt.name);
                        }}
                        className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                        title="Hapus kegiatan ini dari Firestore"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Event Editor Form */}
      <form onSubmit={handleSaveAll} className="space-y-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Rincian & Informasi Kegiatan:{' '}
                  <span className="text-blue-700">{formData.name}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Perubahan data disimpan ke Firebase dan otomatis tercetak pada Kop Surat & Laporan PDF
                </p>
              </div>
            </div>

            <button
              type="submit"
              id="btn-save-event-changes"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>

          {saveSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">Rincian kegiatan berhasil disimpan ke Firebase Cloud Firestore!</span>
            </div>
          )}

          {/* Status Keaktifan Kegiatan Selector */}
          <div className="p-4 rounded-2xl border bg-slate-50/80 border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Status Keaktifan Formulir Presensi:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition ${
                  formData.isActive
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="event_active_status"
                  checked={formData.isActive === true}
                  onChange={() => setFormData({ ...formData, isActive: true })}
                  className="w-4 h-4 text-emerald-600"
                />
                <div>
                  <span className="text-xs font-bold flex items-center gap-1 text-emerald-800">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Status Aktif (Formulir Terbuka)
                  </span>
                  <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                    Kegiatan ini menjadi formulir utama di halaman depan
                  </p>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition ${
                  !formData.isActive
                    ? 'border-slate-400 bg-slate-100 text-slate-900 font-bold shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="event_active_status"
                  checked={formData.isActive === false}
                  onChange={() => setFormData({ ...formData, isActive: false })}
                  className="w-4 h-4 text-slate-600"
                />
                <div>
                  <span className="text-xs font-bold flex items-center gap-1 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    Status Tidak Aktif (Formulir Ditutup)
                  </span>
                  <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                    Formulir dinonaktifkan / tidak menerima pengisian baru
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Kegiatan Resmi:
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden font-semibold text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deskripsi / Agenda Kegiatan:
              </label>
              <textarea
                rows={2}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tempat / Ruang Kegiatan:
              </label>
              <input
                type="text"
                required
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tanggal Pelaksanaan:
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mulai (WITA):</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Selesai (WITA):</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Penyelenggara / Instansi:</label>
              <input
                type="text"
                value={formData.organizer}
                onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Pejabat PIC / Pengesah:</label>
              <input
                type="text"
                value={formData.picName}
                onChange={(e) => setFormData({ ...formData, picName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">NIP Pejabat PIC / Pengesah:</label>
              <input
                type="text"
                value={formData.picNip}
                onChange={(e) => setFormData({ ...formData, picNip: e.target.value })}
                className="w-full px-3 py-2 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* 3. Google Sheets Integration Section for this event */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Integrasi Google Sheets untuk Kegiatan Ini
                </h2>
                <p className="text-xs text-slate-500">
                  Sinkronkan rekaman presensi langsung ke spreadsheet Google Drive secara otomatis
                </p>
              </div>
            </div>
          </div>

          {/* Google Auth Status */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {user ? (
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  {user.email?.[0].toUpperCase() || 'U'}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {user ? user.displayName || user.email : 'Belum Terhubung Akun Google'}
                  </span>
                  {user && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Terhubung
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {user ? user.email : 'Masuk untuk sinkronisasi langsung ke Google Drive & Sheets Anda'}
                </p>
              </div>
            </div>

            <div>
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar Google
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-google-sign-in"
                  onClick={handleSignIn}
                  disabled={isLoggingIn}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  {isLoggingIn ? 'Menghubungkan...' : 'Sign in with Google'}
                </button>
              )}
            </div>
          </div>

          {/* Spreadsheet Actions */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                id="btn-create-auto-sheet"
                onClick={handleCreateAutoSheet}
                disabled={isCreatingSheet}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isCreatingSheet ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Membuat Spreadsheet...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Buat Spreadsheet Otomatis di Google Drive
                  </>
                )}
              </button>

              {formData.spreadsheetUrl && (
                <a
                  href={formData.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
                >
                  <ExternalLink className="w-4 h-4 text-emerald-600" />
                  Buka Spreadsheet Aktif
                </a>
              )}
            </div>

            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Atau Tautkan ID / URL Google Spreadsheet yang Sudah Ada:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualSheetId}
                  onChange={(e) => setManualSheetId(e.target.value)}
                  placeholder="Contoh: 1BxiMVs0XRmQ5Fod... atau tempel URL lengkap"
                  className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleLinkManualSheet}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
                >
                  Tautkan
                </button>
              </div>
            </div>

            {sheetStatusMessage && (
              <p className="text-xs text-blue-700 bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                {sheetStatusMessage}
              </p>
            )}
          </div>
        </div>
      </form>

      {/* 4. Admin Security & Password Change in Firebase */}
      <form
        onSubmit={handleChangePasswordSubmit}
        className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4"
        id="form-change-admin-password"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <ShieldCheck className="w-5 h-5 text-amber-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Keamanan Akun & Ubah Kata Sandi Admin
            </h2>
            <p className="text-xs text-slate-500">
              Kata sandi tersimpan langsung di database Firebase Firestore (<span className="font-mono">admin_users</span>)
            </p>
          </div>
        </div>

        {passwordSuccessMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{passwordSuccessMessage}</span>
          </div>
        )}

        {passwordErrorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{passwordErrorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kata Sandi Saat Ini:
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Sandi lama"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kata Sandi Baru:
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 5 karakter"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ulangi Sandi Baru:
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi sandi baru"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            id="btn-submit-change-password"
            disabled={isChangingPassword}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            {isChangingPassword ? 'Memperbarui di Firebase...' : 'Perbarui Kata Sandi Admin'}
          </button>
        </div>
      </form>

      {/* Modal: Tambah Kegiatan Baru */}
      {isNewEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Tambah Kegiatan Baru</h3>
                  <p className="text-xs text-slate-500">
                    Disimpan langsung ke database Firebase Firestore
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewEventModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewEventSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Kegiatan / Acara: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newEventData.name || ''}
                  onChange={(e) => setNewEventData({ ...newEventData, name: e.target.value })}
                  placeholder="Contoh: Rapat Koordinasi Perangkat Daerah"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tempat / Ruangan Kegiatan: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newEventData.locationName || ''}
                  onChange={(e) => setNewEventData({ ...newEventData, locationName: e.target.value })}
                  placeholder="Contoh: Ruang Rapat Utama Balaikota Samarinda"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tanggal Kegiatan: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newEventData.date || ''}
                    onChange={(e) => setNewEventData({ ...newEventData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mulai:</label>
                    <input
                      type="time"
                      value={newEventData.startTime || '08:30'}
                      onChange={(e) => setNewEventData({ ...newEventData, startTime: e.target.value })}
                      className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Selesai:</label>
                    <input
                      type="time"
                      value={newEventData.endTime || '12:00'}
                      onChange={(e) => setNewEventData({ ...newEventData, endTime: e.target.value })}
                      className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Penyelenggara / Instansi:
                </label>
                <input
                  type="text"
                  value={newEventData.organizer || ''}
                  onChange={(e) => setNewEventData({ ...newEventData, organizer: e.target.value })}
                  placeholder="Contoh: Sekretariat Daerah Kota Samarinda"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Pejabat PIC / Pengesah:
                  </label>
                  <input
                    type="text"
                    value={newEventData.picName || ''}
                    onChange={(e) => setNewEventData({ ...newEventData, picName: e.target.value })}
                    placeholder="Nama beserta gelar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    NIP Pejabat PIC:
                  </label>
                  <input
                    type="text"
                    value={newEventData.picNip || ''}
                    onChange={(e) => setNewEventData({ ...newEventData, picNip: e.target.value })}
                    placeholder="19800101..."
                    className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Status Awal Kegiatan */}
              <div className="pt-2">
                <label className="block font-bold text-slate-700 mb-1.5">
                  Status Awal Kegiatan:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                      newEventData.isActive
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="new_event_active_status"
                      checked={newEventData.isActive ?? true}
                      onChange={() => setNewEventData({ ...newEventData, isActive: true })}
                      className="w-3.5 h-3.5 text-emerald-600"
                    />
                    <span className="text-[11px]">Aktifkan Langsung</span>
                  </label>
                  <label
                    className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                      !newEventData.isActive
                        ? 'border-slate-400 bg-slate-100 text-slate-900 font-bold'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="new_event_active_status"
                      checked={newEventData.isActive === false}
                      onChange={() => setNewEventData({ ...newEventData, isActive: false })}
                      className="w-3.5 h-3.5 text-slate-600"
                    />
                    <span className="text-[11px]">Simpan Sebagai Draf</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  disabled={isCreatingEvent}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isCreatingEvent ? 'Menyimpan ke Firebase...' : 'Simpan Kegiatan Baru'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewEventModalOpen(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
