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
} from 'lucide-react';
import { EventConfig } from '../types';
import { googleSignIn, logout } from '../services/auth';
import { createAttendanceSpreadsheet } from '../services/googleSheets';
import { updateEventConfig } from '../services/storage';
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
  const [formData, setFormData] = useState<EventConfig>(event);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
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

  useEffect(() => {
    setFormData(event);
    setManualSheetId(event.spreadsheetId || '');
  }, [event]);

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
      onEventUpdated(updated);
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
    onEventUpdated(updated);
    setSheetStatusMessage('Tautan Spreadsheet berhasil diperbarui di Firebase!');
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateEventConfig(formData);
      onEventUpdated(formData);
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
    <div className="w-full max-w-3xl mx-auto space-y-6" id="settings-tab-container">
      {/* Header Form */}
      <form onSubmit={handleSaveAll} className="space-y-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Pengaturan Sistem Presensi</h1>
              <p className="text-xs text-slate-500">
                Penyimpanan Cloud Firebase, Integrasi Google Sheets, & Keamanan Admin
              </p>
            </div>
          </div>

          <button
            type="submit"
            id="btn-save-settings"
            disabled={isSaving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Menyimpan...' : 'Simpan ke Firebase'}
          </button>
        </div>

        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">Seluruh pengaturan berhasil disimpan ke Firebase Cloud Firestore!</span>
          </div>
        )}

        {/* 1. Google Sheets Integration Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Integrasi Google Sheets (Rekap Real-time)
                </h2>
                <p className="text-xs text-slate-500">
                  Sinkronkan rekaman presensi pegawai langsung ke spreadsheet Google Drive secara otomatis
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

        {/* 2. Event Details Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Informasi Rincian Acara & Pejabat Penanggung Jawab</h2>
              <p className="text-xs text-slate-500">
                Data tersimpan di Firebase dan dicetak pada Kop Laporan PDF resmi
              </p>
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
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden"
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
      </form>

      {/* 3. Admin Security & Password Change in Firebase */}
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
    </div>
  );
};
