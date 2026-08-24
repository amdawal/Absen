import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  Users,
  Settings,
  Wifi,
  WifiOff,
  CloudCheck,
  FileSpreadsheet,
  Building2,
  FileCheck2,
  Lock,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { EventConfig } from '../types';
import { AdminUser } from '../services/adminAuth';

interface NavbarProps {
  activeTab: 'presensi' | 'admin' | 'settings';
  setActiveTab: (tab: 'presensi' | 'admin' | 'settings') => void;
  event: EventConfig;
  isOnline: boolean;
  isAdmin: boolean;
  adminUser: AdminUser | null;
  onOpenAdminLogin: () => void;
  onAdminLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  event,
  isOnline,
  isAdmin,
  adminUser,
  onOpenAdminLogin,
  onAdminLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs" id="app-main-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-700/20">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                  SI-PRESENSI
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                  Kota Samarinda
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-extrabold">
                    <ShieldCheck className="w-3 h-3 text-amber-600" />
                    Admin Panel
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[180px] sm:max-w-[320px]">
                {event.name}
              </p>
            </div>
          </div>

          {/* Admin Navigation Tab Pills - ONLY visible if Admin is logged in */}
          {isAdmin && (
            <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/70" id="navbar-nav-tabs">
              <button
                type="button"
                id="tab-btn-presensi"
                onClick={() => setActiveTab('presensi')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'presensi'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                Form Presensi
              </button>

              <button
                type="button"
                id="tab-btn-admin"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Rekap & Cetak PDF
              </button>

              <button
                type="button"
                id="tab-btn-settings"
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                Pengaturan & Akun
              </button>
            </nav>
          )}

          {/* Right Action & Status Area */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Cloud & Online status */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200"
              title="Terhubung ke Firebase Cloud Firestore"
            >
              <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Firebase Cloud</span>
            </div>

            {/* Admin Login / Logout Actions */}
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 pl-2 pr-3 py-1 bg-slate-100 rounded-full border border-slate-200 text-xs font-bold text-slate-800">
                  <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px]">
                    A
                  </div>
                  <span>{adminUser?.username || 'Admin'}</span>
                </div>
                <button
                  type="button"
                  id="btn-admin-logout"
                  onClick={onAdminLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  title="Keluar dari mode admin"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar Admin</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="btn-open-admin-login"
                onClick={onOpenAdminLogin}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                title="Akses menu Rekap dan Pengaturan khusus Administrator"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Login Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row for Admin */}
        {isAdmin && (
          <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('presensi')}
              className={`flex flex-col items-center py-1 px-3 text-[10px] font-bold ${
                activeTab === 'presensi' ? 'text-blue-700' : 'text-slate-500'
              }`}
            >
              <Users className="w-4 h-4 mb-0.5" />
              Presensi
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`flex flex-col items-center py-1 px-3 text-[10px] font-bold ${
                activeTab === 'admin' ? 'text-blue-700' : 'text-slate-500'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 mb-0.5" />
              Rekap & PDF
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center py-1 px-3 text-[10px] font-bold ${
                activeTab === 'settings' ? 'text-blue-700' : 'text-slate-500'
              }`}
            >
              <Settings className="w-4 h-4 mb-0.5" />
              Pengaturan
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
