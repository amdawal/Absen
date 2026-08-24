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
 * Does NOT overwrite existing password if document already exists.
 */
export async function ensureDefaultAdmin(): Promise<void> {
  try {
    const adminRef = doc(db, ADMIN_COLLECTION, DEFAULT_ADMIN_ID);
    const snap = await getDoc(adminRef);
    if (!snap.exists()) {
      await setDoc(adminRef, {
        username: DEFAULT_ADMIN_ID,
        password: DEFAULT_PASSWORD,
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log('Default admin account initialized in Firebase Firestore');
    }
  } catch (error) {
    // Network or offline error during startup
    console.warn('Note on Firestore admin sync:', error);
  }
}

/**
 * Authenticate admin with username & password against Firebase Firestore.
 * Always validates against the live database record as primary source of truth.
 */
export async function authenticateAdmin(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; error?: string; user?: AdminUser }> {
  const cleanUsername = usernameInput.trim().toLowerCase();
  const cleanPassword = passwordInput.trim();

  if (!cleanUsername || !cleanPassword) {
    return { success: false, error: 'Username dan kata sandi wajib diisi.' };
  }

  // 1. Query Firebase Firestore for the live credentials
  try {
    const adminRef = doc(db, ADMIN_COLLECTION, cleanUsername);
    const snap = await getDoc(adminRef);

    if (snap && snap.exists()) {
      const data = snap.data() as AdminUser;
      const dbPassword = data.password || '';

      // Verify exact password match from Firestore
      if (dbPassword !== cleanPassword) {
        return { success: false, error: 'Kata sandi / password admin salah.' };
      }

      // Successful authentication with Firestore
      // Update local storage cache to the verified password
      localStorage.setItem(LOCAL_ADMIN_PASS_KEY, dbPassword);

      // Record last login timestamp (non-blocking)
      updateDoc(adminRef, {
        lastLogin: new Date().toISOString(),
      }).catch(() => {});

      const adminUser: AdminUser = {
        username: data.username || cleanUsername,
        role: data.role || 'admin',
        lastLogin: new Date().toISOString(),
      };

      sessionStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));
      return { success: true, user: adminUser };
    }

    // If document does NOT exist in Firestore
    if (cleanUsername === DEFAULT_ADMIN_ID) {
      // Check if entering default password for initial bootstrap
      if (cleanPassword === DEFAULT_PASSWORD) {
        // Create the admin doc in Firestore
        ensureDefaultAdmin().catch(() => {});
        localStorage.setItem(LOCAL_ADMIN_PASS_KEY, DEFAULT_PASSWORD);

        const adminUser: AdminUser = {
          username: DEFAULT_ADMIN_ID,
          role: 'admin',
          lastLogin: new Date().toISOString(),
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));
        return { success: true, user: adminUser };
      } else {
        return { success: false, error: 'Kata sandi / password admin salah.' };
      }
    }

    return { success: false, error: 'Username admin tidak ditemukan.' };
  } catch (error: any) {
    console.warn('Firestore admin fetch failed, checking offline fallback:', error);

    // Fallback for offline mode ONLY if Firestore cannot be reached
    const cachedPassword = localStorage.getItem(LOCAL_ADMIN_PASS_KEY);

    if (cleanUsername === DEFAULT_ADMIN_ID) {
      const effectivePass = cachedPassword || DEFAULT_PASSWORD;
      if (cleanPassword === effectivePass) {
        const adminUser: AdminUser = {
          username: DEFAULT_ADMIN_ID,
          role: 'admin',
          lastLogin: new Date().toISOString(),
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(adminUser));
        return { success: true, user: adminUser };
      }
    }

    return {
      success: false,
      error: 'Kata sandi salah atau koneksi jaringan offline.',
    };
  }
}

/**
 * Change admin password stored in Firebase Firestore and local cache.
 * Strictly verifies the current password against Firestore before updating.
 */
export async function changeAdminPassword(
  usernameInput: string,
  currentPasswordInput: string,
  newPasswordInput: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanUsername = usernameInput.trim().toLowerCase();
    const currentPassword = currentPasswordInput.trim();
    const newPassword = newPasswordInput.trim();

    if (!cleanUsername) {
      return { success: false, error: 'Username admin tidak valid' };
    }

    if (newPassword.length < 5) {
      return { success: false, error: 'Kata sandi baru minimal 5 karakter' };
    }

    if (currentPassword === newPassword) {
      return { success: false, error: 'Kata sandi baru tidak boleh sama dengan kata sandi lama' };
    }

    // 1. Fetch current credential from Firebase Firestore
    const adminRef = doc(db, ADMIN_COLLECTION, cleanUsername);
    const snap = await getDoc(adminRef);

    if (snap.exists()) {
      const data = snap.data() as AdminUser;
      const livePassword = data.password || '';

      if (livePassword !== currentPassword) {
        return { success: false, error: 'Kata sandi saat ini tidak cocok / salah.' };
      }
    } else {
      // Document not yet created in Firestore, check against DEFAULT_PASSWORD
      if (cleanUsername === DEFAULT_ADMIN_ID) {
        if (currentPassword !== DEFAULT_PASSWORD) {
          return { success: false, error: 'Kata sandi saat ini tidak cocok / salah.' };
        }
      } else {
        return { success: false, error: 'Akun admin tidak ditemukan di database.' };
      }
    }

    // 2. Persist new password to Firebase Firestore
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

    // 3. Update local cache immediately
    localStorage.setItem(LOCAL_ADMIN_PASS_KEY, newPassword);

    // 4. Update session storage if current user is logged in
    const activeSession = getActiveAdminSession();
    if (activeSession && activeSession.username === cleanUsername) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(activeSession));
    }

    console.log(`Password for admin "${cleanUsername}" updated successfully in Firestore.`);
    return { success: true };
  } catch (error: any) {
    console.error('Error changing admin password in Firestore:', error);
    return {
      success: false,
      error: error.message || 'Gagal memperbarui kata sandi di Firebase Firestore.',
    };
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
 * Logout admin session and clear session.
 */
export function logoutAdminSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
