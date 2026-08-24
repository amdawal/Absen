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
    console.error('Error ensuring default admin in Firestore:', error);
  }
}

/**
 * Authenticate admin with username & password from Firebase Firestore.
 */
export async function authenticateAdmin(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; error?: string; user?: AdminUser }> {
  try {
    const cleanUsername = usernameInput.trim().toLowerCase();
    const adminRef = doc(db, ADMIN_COLLECTION, cleanUsername);
    let snap = await getDoc(adminRef);

    // If default 'admin' doesn't exist yet, seed it first and re-fetch
    if (!snap.exists() && cleanUsername === 'admin') {
      await ensureDefaultAdmin();
      snap = await getDoc(adminRef);
    }

    if (!snap.exists()) {
      return { success: false, error: 'Username admin tidak ditemukan di database Firebase' };
    }

    const data = snap.data() as AdminUser;
    if (data.password !== passwordInput) {
      return { success: false, error: 'Kata sandi / password admin salah' };
    }

    // Update last login
    await updateDoc(adminRef, {
      lastLogin: new Date().toISOString(),
    });

    const adminUser: AdminUser = {
      username: data.username,
      role: data.role || 'admin',
      lastLogin: new Date().toISOString(),
    };

    // Save session in sessionStorage (expires when browser tab closed, no persistent localStorage)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));

    return { success: true, user: adminUser };
  } catch (error: any) {
    console.error('Admin authentication error:', error);
    return {
      success: false,
      error: error.message || 'Terjadi kesalahan saat memeriksa database Firebase',
    };
  }
}

/**
 * Change admin password stored in Firebase Firestore.
 */
export async function changeAdminPassword(
  usernameInput: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanUsername = usernameInput.trim().toLowerCase();
    const adminRef = doc(db, ADMIN_COLLECTION, cleanUsername);
    const snap = await getDoc(adminRef);

    if (!snap.exists()) {
      return { success: false, error: 'Akun admin tidak ditemukan di database Firebase' };
    }

    const data = snap.data() as AdminUser;
    if (data.password !== currentPassword) {
      return { success: false, error: 'Kata sandi saat ini tidak cocok' };
    }

    if (newPassword.length < 5) {
      return { success: false, error: 'Kata sandi baru minimal 5 karakter' };
    }

    await updateDoc(adminRef, {
      password: newPassword,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error changing admin password in Firestore:', error);
    return { success: false, error: error.message || 'Gagal memperbarui kata sandi di Firebase' };
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
