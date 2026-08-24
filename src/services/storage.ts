import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  deleteDoc,
  updateDoc,
  runTransaction,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { AttendeeRecord, EventConfig } from '../types';
import { appendAttendeeToSheets, batchAppendAttendees } from './googleSheets';

const EVENTS_COLLECTION = 'events';
const ATTENDEES_COLLECTION = 'attendees';
export const DEFAULT_EVENT_ID = 'event-smrd-01';

// Default Initial Event in Samarinda
export const DEFAULT_EVENT: EventConfig = {
  id: DEFAULT_EVENT_ID,
  name: 'Rapat Koordinasi Evaluasi Kinerja Perangkat Daerah Kota Samarinda',
  description: 'Pertemuan koordinasi dan evaluasi program prioritas pembangunan Pemerintah Kota Samarinda Tahun 2026.',
  date: new Date().toISOString().split('T')[0],
  startTime: '08:30',
  endTime: '12:00',
  locationName: 'Ruang Rapat Mangkupalas, Balaikota Samarinda, Jl. Kusuma Bangsa',
  organizer: 'Sekretariat Daerah Kota Samarinda',
  picName: 'H. Hero Mardanus Satyawan, S.T., M.T.',
  picNip: '19700315 199603 1 004',
  sheetName: 'Rekap Presensi',
};

// Default Initial Sample Attendees
export const SAMPLE_ATTENDEES: AttendeeRecord[] = [
  {
    id: 'att-sample-01',
    eventId: DEFAULT_EVENT_ID,
    nip: '19780412 200312 1 006',
    nama: 'Dr. H. Arief Setyawan, S.Kom., M.Cs.',
    unitKerja: 'Dinas Komunikasi dan Informatika (Diskominfo)',
    jabatan: 'Kepala Dinas',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    timeFormatted: '08:15:20 WITA',
    dateFormatted: '24 Agustus 2026',
    signatureDataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60"><path d="M10 40 Q 30 10, 50 35 T 90 20 T 130 45" stroke="%231e3a8a" stroke-width="2.5" fill="none"/></svg>',
    isSyncedToSheets: true,
  },
  {
    id: 'att-sample-02',
    eventId: DEFAULT_EVENT_ID,
    nip: '19820920 200604 2 018',
    nama: 'Hj. Ratna Indrayani, S.STP., M.Si.',
    unitKerja: 'Badan Kepegawaian dan Pengembangan Sumber Daya Manusia (BKPSDM)',
    jabatan: 'Sekretaris Badan',
    timestamp: new Date(Date.now() - 2400000).toISOString(),
    timeFormatted: '08:24:45 WITA',
    dateFormatted: '24 Agustus 2026',
    signatureDataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60"><path d="M15 30 Q 40 5, 70 45 T 120 15 T 145 35" stroke="%231e3a8a" stroke-width="2.5" fill="none"/></svg>',
    isSyncedToSheets: true,
  },
  {
    id: 'att-sample-03',
    eventId: DEFAULT_EVENT_ID,
    nip: '19850118 200902 1 002',
    nama: 'Muhammad Fadli, S.Sos., M.AP.',
    unitKerja: 'Kecamatan Samarinda Kota',
    jabatan: 'Camat Samarinda Kota',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    timeFormatted: '08:32:10 WITA',
    dateFormatted: '24 Agustus 2026',
    signatureDataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60"><path d="M20 45 Q 50 15, 80 40 T 110 25 T 140 40" stroke="%231e3a8a" stroke-width="2.5" fill="none"/></svg>',
    isSyncedToSheets: true,
  },
];

/**
 * Compresses and downscales a base64 signature image aggressively (tiny thumbnail ~4-8KB)
 * to store directly in Firestore without external storage requirements.
 */
export async function compressSignatureDataUrl(dataUrl: string): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl;
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Limit dimensions to max 180x90 for tiny size footprint (~4-8KB)
        const scale = Math.min(1, 180 / Math.max(img.width, 1), 90 / Math.max(img.height, 1));
        canvas.width = Math.max(60, Math.floor(img.width * scale));
        canvas.height = Math.max(30, Math.floor(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.5));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

/**
 * Get and increment atomic indexNum from Firestore counter without reading all attendee docs.
 */
export async function getNextAttendeeIndex(eventId: string): Promise<number> {
  const counterRef = doc(db, 'counters', eventId);
  try {
    const nextIndex = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      const current = snap.exists() ? Number(snap.data()?.count || 0) : 0;
      const updated = current + 1;
      transaction.set(
        counterRef,
        { count: updated, lastUpdated: new Date().toISOString() },
        { merge: true }
      );
      return updated;
    });
    return nextIndex;
  } catch (err) {
    console.warn('Atomic counter transaction fallback:', err);
    return 1;
  }
}

/**
 * Subscribe in real-time to the active event config from Firebase Firestore.
 */
export function subscribeToActiveEvent(
  eventId: string = DEFAULT_EVENT_ID,
  onUpdate: (event: EventConfig) => void
) {
  const eventRef = doc(db, EVENTS_COLLECTION, eventId);

  return onSnapshot(
    eventRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        onUpdate({ id: snapshot.id, ...snapshot.data() } as EventConfig);
      } else {
        // Seed default event config in Firestore
        try {
          await setDoc(eventRef, DEFAULT_EVENT);
          onUpdate(DEFAULT_EVENT);
        } catch (err) {
          console.warn('Error creating default event in Firestore:', err);
          onUpdate(DEFAULT_EVENT);
        }
      }
    },
    (error) => {
      console.error('Firestore event subscription error:', error);
      onUpdate(DEFAULT_EVENT);
    }
  );
}

/**
 * Save updated event config to Firebase Firestore.
 */
export async function updateEventConfig(event: EventConfig): Promise<void> {
  const eventRef = doc(db, EVENTS_COLLECTION, event.id || DEFAULT_EVENT_ID);
  await setDoc(eventRef, event, { merge: true });
}

/**
 * Fetch latest event configuration directly from Firestore.
 */
export async function getLatestEventConfig(
  eventId: string = DEFAULT_EVENT_ID
): Promise<EventConfig> {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    const snapshot = await getDoc(eventRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as EventConfig;
    }
  } catch (err) {
    console.warn('Error fetching latest event config:', err);
  }
  return DEFAULT_EVENT;
}

/**
 * Fetch ALL attendee records directly from Firestore in chronological order (timestamp asc)
 * without any pagination limit, ensuring complete and up-to-date reports.
 */
export async function getAllAttendeesForReport(
  eventId: string = DEFAULT_EVENT_ID
): Promise<AttendeeRecord[]> {
  try {
    const attendeesRef = collection(db, ATTENDEES_COLLECTION);
    const q = query(attendeesRef, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [];
    }

    const records: AttendeeRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as AttendeeRecord;
      if (!data.eventId || data.eventId === eventId) {
        records.push({ id: docSnap.id, ...data });
      }
    });
    return records;
  } catch (err) {
    console.error('Error fetching all attendees for report:', err);
    return [];
  }
}

/**
 * Subscribe in real-time to the attendees list from Firebase Firestore with limit(50).
 */
export function subscribeToAttendees(
  eventId: string = DEFAULT_EVENT_ID,
  onUpdate: (attendees: AttendeeRecord[]) => void,
  limitCount: number = 50
) {
  const attendeesRef = collection(db, ATTENDEES_COLLECTION);
  const q = query(
    attendeesRef,
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(
    q,
    async (snapshot) => {
      if (!snapshot.empty) {
        const records: AttendeeRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as AttendeeRecord;
          if (!data.eventId || data.eventId === eventId) {
            records.push({ id: docSnap.id, ...data });
          }
        });
        onUpdate(records);
      } else {
        // Seed sample attendees if collection is completely empty
        try {
          for (const sample of SAMPLE_ATTENDEES) {
            await setDoc(doc(db, ATTENDEES_COLLECTION, sample.id), sample);
          }
          onUpdate(SAMPLE_ATTENDEES);
        } catch (err) {
          console.warn('Error seeding sample attendees in Firestore:', err);
          onUpdate([]);
        }
      }
    },
    (error) => {
      console.error('Firestore attendees subscription error:', error);
      onUpdate([]);
    }
  );
}

/**
 * Add a new presence record directly to Firestore with compressed signature data and atomic index counter.
 * Fast non-blocking save that returns immediately.
 */
export async function addAttendeeRecord(
  record: AttendeeRecord,
  event: EventConfig
): Promise<AttendeeRecord> {
  const updatedRecord = { ...record };

  // Compress signature aggressively (~4-8KB) directly into Firestore document
  if (updatedRecord.signatureDataUrl) {
    updatedRecord.signatureDataUrl = await compressSignatureDataUrl(updatedRecord.signatureDataUrl);
  }

  // Concurrently get next atomic index and save document to Firestore
  const indexPromise = getNextAttendeeIndex(event.id);
  const attendeeRef = doc(db, ATTENDEES_COLLECTION, record.id);
  const savePromise = setDoc(attendeeRef, updatedRecord);

  // Background Google Sheets sync (non-blocking)
  if (event.spreadsheetId && navigator.onLine) {
    indexPromise
      .then((indexNum) => {
        appendAttendeeToSheets(event.spreadsheetId!, updatedRecord, indexNum)
          .then(async (success) => {
            if (success) {
              try {
                await updateDoc(attendeeRef, {
                  isSyncedToSheets: true,
                  syncedAt: new Date().toISOString(),
                  syncError: null,
                });
              } catch (e) {
                console.warn('Updated sync status in Firestore:', e);
              }
            }
          })
          .catch((err) => {
            console.warn('Background Sheets sync error:', err);
          });
      })
      .catch((err) => {
        console.warn('Index computation error for Sheets:', err);
      });
  }

  // Wait for firestore save with timeout guarantee
  await Promise.race([
    savePromise,
    new Promise((resolve) => setTimeout(resolve, 800)),
  ]);

  return updatedRecord;
}

/**
 * Delete attendee record from Firebase Firestore.
 */
export async function deleteAttendeeRecord(id: string): Promise<void> {
  const attendeeRef = doc(db, ATTENDEES_COLLECTION, id);
  await deleteDoc(attendeeRef);
}

/**
 * Sync all unsynced records from Firestore to Google Sheets.
 */
export async function syncOfflineAttendees(
  event: EventConfig,
  currentAttendees: AttendeeRecord[]
): Promise<{ syncedCount: number; error?: string }> {
  if (!event.spreadsheetId) {
    return { syncedCount: 0, error: 'Spreadsheet ID belum ditautkan pada tab Pengaturan' };
  }

  const unsynced = currentAttendees.filter(
    (a) => a.eventId === event.id && !a.isSyncedToSheets
  );

  if (unsynced.length === 0) {
    return { syncedCount: 0 };
  }

  const syncedList = currentAttendees.filter((a) => a.eventId === event.id && a.isSyncedToSheets);
  const startIndex = syncedList.length + 1;

  const result = await batchAppendAttendees(event.spreadsheetId, unsynced, startIndex);

  if (result.success && result.count > 0) {
    // Update synced status in Firebase Firestore for all synced items
    for (const item of unsynced) {
      try {
        const attendeeRef = doc(db, ATTENDEES_COLLECTION, item.id);
        await updateDoc(attendeeRef, {
          isSyncedToSheets: true,
          syncedAt: new Date().toISOString(),
          syncError: null,
        });
      } catch (err) {
        console.warn(`Failed to update sync flag for ${item.id} in Firestore:`, err);
      }
    }

    return { syncedCount: result.count };
  }

  return {
    syncedCount: 0,
    error: 'Gagal mengirim data ke Google Sheets. Pastikan akun Google terhubung dan Spreadsheet valid.',
  };
}
