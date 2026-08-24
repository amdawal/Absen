import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { AttendeeRecord, EventConfig } from './types';
import {
  DEFAULT_EVENT,
  subscribeToActiveEvent,
  subscribeToAttendees,
  syncOfflineAttendees,
} from './services/storage';
import {
  ensureDefaultAdmin,
  getActiveAdminSession,
  logoutAdminSession,
  AdminUser,
} from './services/adminAuth';
import { initAuth, googleSignIn } from './services/auth';
import { Navbar } from './components/Navbar';
import { PresenceForm } from './components/PresenceForm';
import { AdminDashboard } from './components/AdminDashboard';
import { SettingsTab } from './components/SettingsTab';
import { AdminLoginModal } from './components/AdminLoginModal';
import { PresenceSuccessModal } from './components/PresenceSuccessModal';
import { WifiOff, Building2, CloudCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'presensi' | 'admin' | 'settings'>('presensi');
  const [activeEvent, setActiveEvent] = useState<EventConfig>(DEFAULT_EVENT);
  const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);
  const [attendeesLimit, setAttendeesLimit] = useState<number>(50);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Admin Authentication State
  const [adminUser, setAdminUser] = useState<AdminUser | null>(getActiveAdminSession());
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const isAdmin = adminUser !== null;

  // Success Modal State
  const [recentRecord, setRecentRecord] = useState<AttendeeRecord | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Ensure default admin in Firebase on load
  useEffect(() => {
    ensureDefaultAdmin();
  }, []);

  // Listen to Active Event from Firebase Firestore
  useEffect(() => {
    const unsubscribeEvent = subscribeToActiveEvent(DEFAULT_EVENT.id, (eventData) => {
      setActiveEvent(eventData);
    });
    return () => unsubscribeEvent();
  }, []);

  // 3. Listen to Attendees ONLY when in Admin Tab and logged in as Admin
  useEffect(() => {
    if (activeTab !== 'admin' || !isAdmin) {
      return;
    }

    const unsubscribeAttendees = subscribeToAttendees(
      activeEvent.id,
      (records) => {
        setAttendees(records);
      },
      attendeesLimit
    );

    return () => {
      unsubscribeAttendees();
    };
  }, [activeTab, isAdmin, activeEvent.id, attendeesLimit]);

  // Listen to Google Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (authenticatedUser) => {
        setUser(authenticatedUser);
      },
      () => {
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Listen to network status
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (activeEvent.spreadsheetId && attendees.length > 0) {
        try {
          await syncOfflineAttendees(activeEvent, attendees);
        } catch (e) {
          console.warn('Auto sync on online failed:', e);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeEvent, attendees]);

  const handlePresenceSuccess = (record: AttendeeRecord) => {
    setRecentRecord(record);
    setIsSuccessModalOpen(true);
  };

  const handleAdminLoginSuccess = (admin: AdminUser) => {
    setAdminUser(admin);
    setIsAdminModalOpen(false);
    setActiveTab('admin'); // Directly open Admin Dashboard for convenience
  };

  const handleAdminLogout = () => {
    logoutAdminSession();
    setAdminUser(null);
    setActiveTab('presensi');
  };

  const handleTabChange = (tab: 'presensi' | 'admin' | 'settings') => {
    // If not admin and trying to open admin/settings, prompt login
    if (!isAdmin && (tab === 'admin' || tab === 'settings')) {
      setIsAdminModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white" id="app-root">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        event={activeEvent}
        isOnline={isOnline}
        isAdmin={isAdmin}
        adminUser={adminUser}
        onOpenAdminLogin={() => setIsAdminModalOpen(true)}
        onAdminLogout={handleAdminLogout}
      />

      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-inner" id="offline-network-banner">
          <WifiOff className="w-4 h-4" />
          <span>
            Mode Offline: Data presensi dan tanda tangan digital disimpan di antrean perangkat dan disinkronkan langsung ke Firebase Firestore saat online.
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Public Default View: Presence Form */}
        {activeTab === 'presensi' && (
          <PresenceForm
            event={activeEvent}
            onSuccess={handlePresenceSuccess}
          />
        )}

        {/* Admin Dashboard (Only accessible by Admin) */}
        {activeTab === 'admin' && isAdmin && (
          <AdminDashboard
            attendees={attendees}
            event={activeEvent}
            onRefresh={() => {}}
            onOpenSettings={() => setActiveTab('settings')}
            onLoadMore={() => setAttendeesLimit((prev) => prev + 50)}
            hasMore={attendees.length >= attendeesLimit}
          />
        )}

        {/* Settings Tab (Only accessible by Admin) */}
        {activeTab === 'settings' && isAdmin && (
          <SettingsTab
            event={activeEvent}
            user={user}
            adminUser={adminUser}
            onEventUpdated={(updated) => {
              setActiveEvent(updated);
            }}
            onUserChanged={(u) => setUser(u)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <Building2 className="w-4 h-4 text-blue-700" />
            <span>Sistem Presensi Kehadiran Pegawai Pemerintah Kota Samarinda</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Firebase Firestore Cloud Database • Tanda Tangan Digital • Ekspor PDF Resmi • Terintegrasi Google Sheets.
          </p>
        </div>
      </footer>

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Presence Confirmation Modal */}
      <PresenceSuccessModal
        record={recentRecord}
        event={activeEvent}
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        onNewPresence={() => {
          setIsSuccessModalOpen(false);
          setActiveTab('presensi');
        }}
      />
    </div>
  );
}
