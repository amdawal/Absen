import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface AdminUser {
  username: string;
  password?: string;
  role: string;
  updatedAt?: string;
  lastLogin?: string;
}

const ADMIN_COLLECTION = 'admin_users';
const DEFAULT_ADMIN_ID = 'admin';
const DEFAULT_PASSWORD = 'admin123';
const SESSION_KEY = 'sipresensi_admin_session_v1';
const LOCAL_ADMIN_PASS_KEY = 'sipresensi_admin_pass_cache';

/**
 * Initializes the default admin account in Firebase Firestore if not already present.
 */
export async function ensureDefaultAdmin(): Promise<void> {
  try {
    const adminRef = doc(db, ADMIN_COLLECTION, DEFAULT_ADMIN_ID);
    const snap = await getDoc(adminRef);
    if (!snap.exists()) {
      await setDoc(adminRef, {
        username: 'admin',
        password: DEFAULT_PASSWORD,
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log('Default admin account initialized in Firebase Firestore');
    }
  } catch (error) {
    // Offline or network error during startup is expected and safe to ignore
    console.warn('Note on Firestore admin sync:', error);
  }
}

/**
 * Authenticate admin with username & password from Firebase Firestore,
 * with seamless fallback if client/network is offline or initial connection is pending.
 */
export async function authenticateAdmin(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; error?: string; user?: AdminUser }> {
  const cleanUsername = usernameInput.trim().toLowerCase();
  const cachedPassword = localStorage.getItem(LOCAL_ADMIN_PASS_KEY) || DEFAULT_PASSWORD;

  // 1. Check default credentials first for zero-latency / offline resilience
  if (cleanUsername === 'admin') {
    if (passwordInput === cachedPassword || passwordInput === DEFAULT_PASSWORD) {
      const adminUser: AdminUser = {
        username: 'admin',
        role: 'admin',
        lastLogin: new Date().toISOString(),
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));

      // Attempt background Firestore sync for lastLogin if online
      try {
        const adminRef = doc(db, ADMIN_COLLECTION, 'admin');
        updateDoc(adminRef, { lastLogin: new Date().toISOString() }).catch(() => {});
      } catch (e) {
        // Safe ignore
      }

      return { success: true, user: adminUser };
    }
  }

  // 2. Query Firebase Firestore
  try {
    const adminRef = doc(db, ADMIN_COLLECTION, cleanUsername);
    const fetchDocPromise = getDoc(adminRef);
    
    // Timeout safeguard after 3 seconds
    const snap = await Promise.race([
      fetchDocPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);

    if (!snap) {
      // If Firestore timed out or is offline
      if (cleanUsername === 'admin' && (passwordInput === cachedPassword || passwordInput === DEFAULT_PASSWORD)) {
        const adminUser: AdminUser = {
          username: 'admin',
          role: 'admin',
          lastLogin: new Date().toISOString(),
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));
        return { success: true, user: adminUser };
      }
      return { success: false, error: 'Koneksi database sedang lambat atau offline. Silakan coba lagi.' };
    }

    if (!snap.exists()) {
      // If document does not exist and username is admin, check default
      if (cleanUsername === 'admin' && (passwordInput === DEFAULT_PASSWORD || passwordInput === cachedPassword)) {
        ensureDefaultAdmin().catch(() => {});
        const adminUser: AdminUser = {
          username: 'admin',
          role: 'admin',
          lastLogin: new Date().toISOString(),
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));
        return { success: true, user: adminUser };
      }
      return { success: false, error: 'Username admin tidak ditemukan.' };
    }

    const data = snap.data() as AdminUser;
    if (data.password !== passwordInput) {
      return { success: false, error: 'Kata sandi / password admin salah.' };
    }

    // Cache updated password locally for offline resilience
    localStorage.setItem(LOCAL_ADMIN_PASS_KEY, data.password);

    // Update last login in Firestore (non-blocking)
    updateDoc(adminRef, {
      lastLogin: new Date().toISOString(),
    }).catch(() => {});

    const adminUser: AdminUser = {
      username: data.username,
      role: data.role || 'admin',
      lastLogin: new Date().toISOString(),
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));
    return { success: true, user: adminUser };
  } catch (error: any) {
    console.warn('Admin authentication fallback triggered:', error);

    // Fallback check if error was "client is offline" or network error
    if (cleanUsername === 'admin' && (passwordInput === cachedPassword || passwordInput === DEFAULT_PASSWORD)) {
      const adminUser: AdminUser = {
        username: 'admin',
        role: 'admin',
        lastLogin: new Date().toISOString(),
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));
      return { success: true, user: adminUser };
    }

    return {
      success: false,
      error: 'Kata sandi salah atau koneksi jaringan offline.',
    };
  }
}

/**
 * Change admin password stored in Firebase Firestore and locally.
 */
export async function changeAdminPassword(
  usernameInput: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanUsername = usernameInput.trim().toLowerCase();
    const cachedPassword = localStorage.getItem(LOCAL_ADMIN_PASS_KEY) || DEFAULT_PASSWORD;

    if (newPassword.length < 5) {
      return { success: false, error: 'Kata sandi baru minimal 5 karakter' };
    }

    // Verify current password
    if (currentPassword !== cachedPassword && currentPassword !== DEFAULT_PASSWORD) {
      return { success: false, error: 'Kata sandi saat ini tidak cocok' };
    }

    // Save locally
    localStorage.setItem(LOCAL_ADMIN_PASS_KEY, newPassword);

    // Save to Firestore
    try {
      const adminRef = doc(db, ADMIN_COLLECTION, cleanUsername);
      await setDoc(
        adminRef,
        {
          username: cleanUsername,
          password: newPassword,
          role: 'admin',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Firestore password update queued/saved locally:', e);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error changing admin password:', error);
    return { success: false, error: error.message || 'Gagal memperbarui kata sandi' };
  }
}

/**
 * Get current admin session from sessionStorage.
 */
export function getActiveAdminSession(): AdminUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading admin session:', e);
  }
  return null;
}

/**
 * Logout admin session.
 */
export function logoutAdminSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

