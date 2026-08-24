import React, { useState } from 'react';
import { ShieldCheck, Lock, User, KeyRound, AlertCircle, X, ArrowRight } from 'lucide-react';
import { authenticateAdmin, AdminUser } from '../services/adminAuth';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (admin: AdminUser) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim()) {
      setErrorMessage('Username admin wajib diisi');
      return;
    }
    if (!password) {
      setErrorMessage('Password admin wajib diisi');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authenticateAdmin(username, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
        setPassword('');
        onClose();
      } else {
        setErrorMessage(res.error || 'Autentikasi admin gagal');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat memeriksa akun di Firebase');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
      id="admin-login-modal"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                Masuk Akses Administrator
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Menu Rekap, Ekspor PDF Resmi, & Pengaturan Sistem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5">
              Username Admin:
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="admin-username-input"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username admin"
                className="w-full pl-11 pr-4 py-3 text-sm sm:text-base bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-hidden font-medium text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5">
              Kata Sandi / Password:
            </label>
            <div className="relative">
              <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                id="admin-password-input"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi admin"
                className="w-full pl-11 pr-4 py-3 text-sm sm:text-base bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-hidden text-slate-900"
              />
            </div>
          </div>

          {/* Helper info */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>Kredensial Masuk Administrator:</span>
            </div>
            <p className="text-slate-600">
              Username: <strong className="text-slate-900 font-mono text-sm">admin</strong> • Sandi default awal: <strong className="text-slate-900 font-mono text-sm">admin123</strong>
            </p>
            <p className="text-xs text-slate-500">
              * Jika kata sandi sudah pernah diubah di menu Pengaturan, gunakan kata sandi terbaru Anda. Sandi lama otomatis tidak berlaku lagi.
            </p>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="submit"
              id="btn-submit-admin-login"
              disabled={isLoading}
              className="flex-1 py-3.5 px-4 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-sm sm:text-base rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Memeriksa Akun di Firebase...</span>
              ) : (
                <>
                  <span>Masuk sebagai Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
